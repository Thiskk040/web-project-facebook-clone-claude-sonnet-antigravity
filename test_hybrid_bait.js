require('dotenv').config();
const { detectBait } = require('./utils/baitDetector');

const testCases = [
    {
        text: "เหนื่อยจัง วันนี้บินไปทริปสิงคโปร์ พรุ่งนี้ไปญี่ปุ่นต่อ",
        description: "Local Regex Match (Should detect via database regex patterns)",
        expectedRegex: true
    },
    {
        text: "โซเหนื่อยโซท้อนะคุณน้า",
        description: "Slang Variation (Should trigger Gemini fallback if API key is present)",
        expectedRegex: false
    },
    {
        text: "แต่งหน้าแบบโต๋วอินแบบ พสจีน",
        description: "Slang Variation (Should trigger Gemini fallback if API key is present)",
        expectedRegex: false
    },
    {
        text: "วันนี้อากาศดีมากเลยครับ ไปวิ่งสวนลุมมา 5 กิโลเมตร",
        description: "Normal Post (Should be 0 score)",
        expectedRegex: false
    }
];

console.log("=== RUNNING HYBRID ENGAGEMENT BAIT DETECTOR TESTS ===");
console.log("Waiting 1000ms for database pattern loading...");

setTimeout(async () => {
    const hasApiKey = !!process.env.GEMINI_API_KEY;
    console.log(`GEMINI_API_KEY configured: ${hasApiKey ? "YES" : "NO"}`);
    if (!hasApiKey) {
        console.log("[WARNING] GEMINI_API_KEY is not set. Fallback tests will return 0 score.");
    }

    for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        console.log(`\nTest #${i + 1}: ${tc.description}`);
        console.log(`  Content: "${tc.text}"`);
        
        const startTime = Date.now();
        const res = await detectBait(tc.text);
        const duration = Date.now() - startTime;

        console.log(`  Duration: ${duration}ms`);
        console.log(`  Score: ${res.score}%`);
        console.log(`  Labels: [${res.translations.join(', ')}]`);
        console.log(`  Roasts: [${res.roasts.join(' | ')}]`);
    }

    console.log("\n=== TESTS COMPLETED ===");
    process.exit(0);
}, 1000);
