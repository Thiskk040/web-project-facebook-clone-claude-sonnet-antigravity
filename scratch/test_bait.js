const { detectBait } = require('./utils/baitDetector');

const testCases = [
    {
        text: "ไม่อยากเชื่อเลยว่า จะได้รับคัดเลือกเป็น 1 ใน 5 ของเอเชีย!",
        expectedMatch: true
    },
    {
        text: "คนที่เข้าใจจะเข้าใจ เท่านั้นแหละครับ ไม่อยากอธิบายเยอะ",
        expectedMatch: true
    },
    {
        text: "เหนื่อยจัง วันนี้บินไปทริปสิงคโปร์ พรุ่งนี้ไปญี่ปุ่นต่อ",
        expectedMatch: true
    },
    {
        text: "ช่วงนี้งานยุ่งมากกก แทบไม่ได้พักผ่อน อดหลับอดนอนมา 3 คืนแล้วเพื่อส่งโปรเจกต์ร้อยล้าน",
        expectedMatch: true
    },
    {
        text: "บังเอิญมากที่ได้เลื่อนตำแหน่งเป็น Senior Director ปีนี้",
        expectedMatch: true
    },
    {
        text: "ขอบคุณบริษัทท็อปอันดับ 1 ของประเทศที่มอบโอกาสครั้งใหญ่ครั้งนี้ให้ผมนะครับ",
        expectedMatch: true
    },
    {
        text: "3 บทเรียนที่เรียนรู้จากความล้มเหลวในการทำสตาร์ทอัพของผม",
        expectedMatch: true
    },
    {
        text: "ไม่ได้จะโชว์แต่พรีออเดอร์ iPhone รุ่นล่าสุดสีนี้สวยจริงๆ",
        expectedMatch: true
    },
    {
        text: "บ่นนิดนึงนะ ดันได้ไปเที่ยวรอบโลกฟรีเพราะจับฉลากได้เฉยเลย",
        expectedMatch: true
    },
    {
        text: "บอกตามตรงว่าทริปนี้เหนื่อยมากและยากมาก แต่ในที่สุดก็ประสบความสำเร็จและพิชิตยอดเขาเอเวอเรสต์ได้สำเร็จ",
        expectedMatch: true
    },
    {
        text: "วันนี้อากาศดีมากเลยครับ ไปวิ่งสวนลุมมา 5 กิโลเมตร",
        expectedMatch: false
    },
    {
        text: "humbled and honored to announce that I have joined Google!",
        expectedMatch: true
    },
    {
        text: "not to brag but my code just passed all the production tests in one go.",
        expectedMatch: true
    },
    {
        text: "ชี้เป้ากระเป๋าหรูใบใหม่ พิกัดลิงก์ที่คอมเมนต์เลยนะ ของมันต้องมีจริงๆ",
        expectedMatch: true
    },
    {
        text: "วงการกล้องฟิล์มเข้าแล้วออกยากมาก เสียทรัพย์ไปหลายหมื่น",
        expectedMatch: true
    },
    {
        text: "ประสบความสำเร็จในวัย 22 ปี มีเงินล้านแรกในชีวิต",
        expectedMatch: true
    },
    {
        text: "ทักมาถามกันเยอะมากจน DM แตก เลยขอมาป้ายยาทีเดียวเลย",
        expectedMatch: true
    }
];

console.log("=== RUNNING ENGAGEMENT BAIT DETECTOR TESTS ===");
console.log("Waiting 1000ms for database pattern loading...");
setTimeout(async () => {
    let passed = 0;
    for (let idx = 0; idx < testCases.length; idx++) {
        const tc = testCases[idx];
        const res = await detectBait(tc.text);
        const matched = res.score > 0;
        const isSuccess = matched === tc.expectedMatch;
        if (isSuccess) {
            passed++;
        }
        console.log(`Test #${idx + 1}: ${isSuccess ? "[PASS]" : "[FAIL]"}`);
        console.log(`  Text: "${tc.text}"`);
        console.log(`  Score: ${res.score}% | Matches: [${(res.translations || []).join(', ')}]`);
    }

    console.log(`\nResults: Passed ${passed}/${testCases.length}`);
    if (passed === testCases.length) {
        console.log("[SUCCESS] ALL TESTS PASSED SUCCESSFULLY!");
    } else {
        process.exit(1);
    }
}, 1000);
