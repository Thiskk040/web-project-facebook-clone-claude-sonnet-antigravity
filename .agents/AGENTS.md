# Project Rules

1. **การปรับบันทึกประวัติการทำงาน:** หลังจากเขียนโค้ดหรือทำอะไรเสร็จสิ้น ให้ทำการอัปเดตและบันทึกประวัติการพัฒนาลงในไฟล์ `README.md` ทุกครั้ง
2. **การจัดวางไฟล์ทดสอบ (Test & Debug Scripts):** ไฟล์ test, debug, หรือ verification script ทั้งหมดต้องเก็บไว้ในโฟลเดอร์ `scratch/` หรือ `tests/` เท่านั้น ห้ามวางไว้ที่ root directory ของโปรเจกต์
3. **การป้องกันไฟล์ Output และ Artifacts:** ห้าม commit ไฟล์ output ที่เกิดจากการรันสคริปต์ (เช่น `.txt`, `.log`, `.zip`, temporary dump files) ขึ้น git ให้ระบุไว้ใน `.gitignore` เสมอ
4. **ขนาดไฟล์และความรับผิดชอบ (Modularity & Maintainability):** ไฟล์ route หรือ handler เดี่ยวไม่ควรมีขนาดเกิน ~200 บรรทัด หากเกินให้แตกไฟล์ตามขอบเขตความรับผิดชอบ (Separation of Concerns)
