import db from "./src/db.js";

// ✅ 시각 → 교시 변환 함수
const timeToPeriod = (hour, minute) => {
  const startTimes = [
    { h: 9, m: 0 },
    { h: 10, m: 0 },
    { h: 11, m: 0 },
    { h: 12, m: 0 },
    { h: 13, m: 0 },
    { h: 14, m: 0 },
    { h: 15, m: 0 },
    { h: 16, m: 0 },
    { h: 17, m: 0 },
    { h: 18, m: 0 },
  ];

  for (let i = 0; i < startTimes.length; i++) {
    const s = startTimes[i];
    if (hour < s.h || (hour === s.h && minute < s.m)) return i;
  }
  return startTimes.length;
};

// ✅ 메인 변환 함수
const migrateTime = async () => {
  try {
    const [rows] = await db.query("SELECT id, 시간 FROM courses");

    for (const c of rows) {
      if (!c.시간) continue;
      const timeStr = c.시간.trim();

      // 🚫 미지정 강좌 필터링
      if (
        timeStr.includes("미지정") ||
        timeStr.includes("시간미지정강좌") ||
        timeStr.toUpperCase().includes("TBA")
      ) {
        await db.query(
          "UPDATE courses SET 요일=NULL, 시작교시=NULL, 종료교시=NULL WHERE id=?",
          [c.id]
        );
        console.log(`🟡 [ID ${c.id}] 시간미지정 → 제외`);
        continue;
      }

      const segments = timeStr.split(",");
      for (const seg of segments) {
        const trimmed = seg.trim();
        if (!trimmed) continue;

        const day = trimmed[0];

        // 🕘 시각 기반 (예: 월(09:00-12:00))
        const match = trimmed.match(/\((\d{2}):(\d{2})-(\d{2}):(\d{2})\)/);
        if (match) {
          const [_, sh, sm, eh, em] = match.map(Number);
          const start = timeToPeriod(sh, sm);
          const end = timeToPeriod(eh, em);
          await db.query(
            "UPDATE courses SET 요일=?, 시작교시=?, 종료교시=? WHERE id=?",
            [day, start, end, c.id]
          );
          console.log(`✅ [ID ${c.id}] ${day} ${start}~${end}교시`);
          continue;
        }

        // 📘 교시 기반 (월3~5, 월3 등)
        const nums = trimmed.slice(1).split("~").map(Number);
        const start = nums[0];
        const end = nums.length > 1 ? nums[1] : start;

        if (!isNaN(start)) {
          await db.query(
            "UPDATE courses SET 요일=?, 시작교시=?, 종료교시=? WHERE id=?",
            [day, start, end, c.id]
          );
          console.log(`✅ [ID ${c.id}] ${day} ${start}~${end}교시`);
        } else {
          console.log(`⚠️ [ID ${c.id}] 시간 파싱 실패 → "${trimmed}"`);
        }
      }
    }

    console.log("🎉 모든 요일/시간 변환 완료!");
    process.exit(0);
  } catch (err) {
    console.error("❌ 변환 중 오류:", err);
    process.exit(1);
  }
};

migrateTime();
