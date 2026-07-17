const db = require('../config/database');
const axios = require('axios');

let cachedPatterns = [];
let loadRetries = 0;

const fallbackPatterns = [
    { regex: /ไม่อยากเชื่อเลยว่า/, label: "กำลังจะอวดบางอย่าง", roast: "ต้องการคำชมแบบถล่มทลายเพราะเป็นคนขาดความอบอุ่นในวัยเด็ก" },
    { regex: /คนที่เข้าใจจะเข้าใจ/, label: "อยากให้คนถามว่าเกิดอะไรขึ้น", roast: "แค่อยากเรียกร้องความสนใจให้คนคอมเมนต์ถามว่า 'เป็นอะไรหรอคะ' ทั้งที่จริงๆ ไม่มีประเด็นอะไรเลย" },
    { regex: /เหนื่อยจัง.*(บิน|เที่ยว|ประเทศ|ทริป)?/, label: "ฉันรวยและมีเวลาว่างเยอะ", roast: "จริงๆ คือแค่อยากโชว์รวย โชว์ว่ามีเงินไปเที่ยว แต่ต้องบ่นเหนื่อยเพื่อไม่ให้ดูน่าหมั่นไส้จนเกินไป" },
    { regex: /(งานยุ่ง|busy).*(อดหลับอดนอน|ไม่ได้พัก)?/, label: "ฉันสำคัญและเป็นที่ต้องการ", roast: "ความจริง: ฉันบริหารเวลาไม่เป็น และต้องโพสต์ว่างานยุ่งเพื่อให้ตัวเองรู้สึกสำคัญและเป็นที่ต้องการของสังคม" },
    { regex: /บังเอิญ.*(ได้รางวัล|ได้เลื่อนตำแหน่ง|ติด)?/, label: "ฉันเก่งแต่ไม่อยากดูหยิ่ง", roast: "ความเก่งเป็นเรื่องหลอกลวง เพราะจริงๆ แอบซุ่มเงียบฝึกซ้อมมาเป็นเดือน แต่พรีเซนต์ว่าได้มาฟลุ๊คๆ เพื่อความเท่" },
    { regex: /ขอบคุณ.*(มหาลัย|บอกเล่า|บริษัท)?.*(ท็อป|อันดับ 1|ที่ดีที่สุด)?/, label: "ดูสิว่าฉันเข้าที่ไหนได้", roast: "ไม่ได้กตัญญูอะไรหรอก แค่อยากเปิดเผยโปรไฟล์บริษัท/มหาวิทยาลัยชั้นนำเพื่อยกหางตัวเองแบบเนียนๆ" }
];

function loadPatternsFromDb() {
    db.all("SELECT regex_pattern, flags, label, roast FROM bait_patterns", (err, rows) => {
        if (err) {
            console.log(`[BaitDetector] Error loading from DB: ${err.message}. Retry ${loadRetries}/10...`);
            if (loadRetries < 10) {
                loadRetries++;
                setTimeout(loadPatternsFromDb, 200);
            } else {
                console.error("Failed to load bait patterns from SQLite after retries:", err);
            }
            return;
        }
        
        console.log(`[BaitDetector] Successfully loaded ${rows ? rows.length : 0} patterns from SQLite.`);
        cachedPatterns = (rows || []).map(row => {
            try {
                return {
                    regex: new RegExp(row.regex_pattern, row.flags || ''),
                    label: row.label,
                    roast: row.roast
                };
            } catch (regexErr) {
                console.error(`Invalid regex from DB: ${row.regex_pattern}`, regexErr);
                return null;
            }
        }).filter(Boolean);
    });
}

// Initial load on startup
loadPatternsFromDb();

// Local regex-based detector (original logic)
function detectBaitLocal(content) {
    if (!content || typeof content !== 'string') {
        return { score: 0, translations: [], roasts: [] };
    }

    const patternsToUse = cachedPatterns.length > 0 ? cachedPatterns : fallbackPatterns;
    const matchedLabels = [];
    const matchedRoasts = [];

    patternsToUse.forEach(p => {
        if (p.regex.test(content)) {
            matchedLabels.push(p.label);
            matchedRoasts.push(p.roast);
        }
    });

    const matchCount = matchedLabels.length;
    if (matchCount === 0) {
        return { score: 0, translations: [], roasts: [] };
    }

    let score = 0;
    if (matchCount === 1) {
        // match 1 pattern = 40% + length-based dynamic variation (min 0, max 15)
        const variance = Math.min(15, Math.floor(content.length / 10));
        score = 40 + variance;
    } else {
        // match 2+ = 70-90%
        const base = 70;
        const extra = Math.min(20, (matchCount - 2) * 5 + Math.floor(content.length / 15));
        score = base + extra;
    }

    return {
        score: Math.min(99, score),
        translations: matchedLabels,
        roasts: matchedRoasts
    };
}

function extractFirstJson(text) {
    const start = text.indexOf('{');
    if (start === -1) return text;
    
    let braceCount = 0;
    let inString = false;
    let escaped = false;
    
    for (let i = start; i < text.length; i++) {
        const char = text[i];
        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === '"') {
                inString = false;
            }
        } else {
            if (char === '"') {
                inString = true;
                escaped = false;
            } else if (char === '{') {
                braceCount++;
            } else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                    return text.substring(start, i + 1);
                }
            }
        }
    }
    return text;
}

// Hybrid detector with Gemini API Fallback
async function detectBait(content) {
    if (!content || typeof content !== 'string') {
        return { score: 0, translations: [], roasts: [] };
    }

    // 1. Run fast local regex detection first
    const localResult = detectBaitLocal(content);
    if (localResult.score > 0) {
        return localResult;
    }

    // 2. Fallback to Gemini API if available
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return localResult; // Key not set, return 0 score
    }

    let cleanText = '';
    try {
        const promptText = `คุณเป็นผู้เชี่ยวชาญวิเคราะห์การโพสต์ "ล่อซื้อ" (Engagement Bait / อวดสิ่งของ / อวดความสำเร็จแบบถ่อมตัว / เรียกร้องความสนใจ) และวิเคราะห์คำสแลงคนไทย สแลงวัยรุ่น สแลงกะเทย เทรนด์ความงาม (เช่น ปรุงจืด, ปรุงจัด, พสจีน, โต๋วอิน, โซเหนื่อย, ท้อออ)
จงวิเคราะห์ข้อความต่อไปนี้: "${content}"

หากข้อความนี้มีลักษณะล่อซื้อหรือประชดประชัน/เรียกร้องความสนใจ ให้ประเมินคะแนนและคำจิกกัด
จงตอบกลับเป็นรูปแบบ JSON วัตถุเพียงอย่างเดียว (ห้ามมีคำพูดอธิบายอื่น หรือสัญลักษณ์ markdown \`\`\`json นอกโครงสร้าง) ดังนี้:
{
  "score": <คะแนนล่อเป้า/ล่อซื้อ ระหว่าง 0 ถึง 99>,
  "translations": [<คำอธิบายย่อของพฤติกรรม เช่น "อวดลุคแต่งหน้าเกาะกระแส", "เรียกร้องความสนใจเพราะเหงา">],
  "roasts": [<คำจิกกัดประชดประชันเสียดสีเจ็บๆ คันๆ ตลกๆ เป็นภาษาไทย 1 ประโยคสั้น>]
}
หากข้อความทั่วไปธรรมดา ไม่มีลักษณะล่อซื้อเลย ให้ตอบกลับ {"score": 0, "translations": [], "roasts": []}`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
            {
                contents: [
                    {
                        parts: [
                            { text: promptText }
                        ]
                    }
                ],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000 // 10 seconds timeout
            }
        );

        if (response.data && response.data.candidates && response.data.candidates[0].content.parts[0].text) {
            const resultText = response.data.candidates[0].content.parts[0].text.trim();
            cleanText = extractFirstJson(resultText);
            const resultJson = JSON.parse(cleanText);
            return {
                score: typeof resultJson.score === 'number' ? resultJson.score : 0,
                translations: Array.isArray(resultJson.translations) ? resultJson.translations : [],
                roasts: Array.isArray(resultJson.roasts) ? resultJson.roasts : []
            };
        }
        return localResult;
    } catch (err) {
        if (err.response) {
            console.error("[BaitDetector] Gemini API fallback error:", err.message, JSON.stringify(err.response.data));
        } else {
            console.error("[BaitDetector] Gemini API fallback error:", err.message, "CleanText was:", typeof cleanText !== 'undefined' ? JSON.stringify(cleanText) : 'undefined');
        }
        return localResult; // Return the 0 score on error
    }
}

module.exports = { detectBait, reloadPatterns: loadPatternsFromDb };
