import puppeteer from "puppeteer";
import fs from "fs";
import xlsx from "xlsx";

const TARGET_URL =
  "https://portal.hanyang.ac.kr/sugang/SgscAct/findSuupSearchSugangSiganpyo.do";

function extractPageData(json: any):any[] {
  const key = Object.keys(json)[0];
  if (!key || !json[key] || !json[key][0] || !json[key][0].list) return [];
  return json[key][0].list;
}

function getTimeDay(x:string):string {
  return x.match(/^[가-힣]/)?.[0] || "";
}

function parseTime(x:string):{start:string; end:string} {
  const m = x.match(/\((\d{2}):\d{2}-(\d{2}):\d{2}\)/);
  return !m
    ? { start: "", end: "" }
    : { start: m[1], end: m[2] };
}

function parseMajorLevel(level: string | null): string | null {
  if (!level) return null;
  const m = level.match(/(\d{3})/);
  return m ? m[1] : null;
}

async function main() {
  console.log("🚀 HYU 수강편람 전체 자동 크롤링 시작");

  const browser = await puppeteer.launch({
    headless: false,
    channel: "chrome",
    args: ["--start-maximized"],
  });

  const page = await browser.newPage();

  // 🔥 로그인 필요 없으므로 바로 이동
  await page.goto("https://portal.hanyang.ac.kr/sugang/sulg.do", {
    waitUntil: "networkidle2",
  });

  console.log("👉 조회조건 선택 → 조회 버튼 클릭해서 1페이지 띄워주세요");
  console.log("⏳ 첫 페이지 JSON 로딩 대기 중…");

  // 첫 POST 응답 감지
  await page.waitForResponse((res) =>
    res.url().includes(TARGET_URL) && res.request().method() === "POST"
  );

  console.log("📄 페이지 1 감지!");

  let collected: any[] = [];
  let pageIndex = 0;
  const limit = 20;

  while (true) {
    console.log(`📄 페이지 ${pageIndex + 1} 요청 (skipRows=${pageIndex * limit})`);

    const payload = {
      skipRows: String(pageIndex * limit),
      maxRows: String(limit),
      notAppendQrys: "true",
      strLocaleGb: "ko",
      strIsSugangSys: "true",
      strDetailGb: "0",
      strDaehak: "",
      strGwamok: "",
      strHakgwa: "",
      strHaksuNo: "",
      strIlbanCommonGb: "",
      strIsuGbCd: "",
      strIsuGrade: "",
      strJojik: "H0002256",
      strSuupOprGb: "0",
      strSuupTerm: "20",
      strSuupYear: "2025",
      strTsGangjwa: "",
      strTsGangjwa3: "0",
      strTsGangjwaAll: "0",
      strYeongyeok: "",
    };

    const res = await page.evaluate(
      async (url, body) => {
        const r = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json+sua; charset=UTF-8",
          },
          body: JSON.stringify(body),
        });
        return await r.json();
      },
      TARGET_URL,
      payload
    );

    const list = extractPageData(res);

    if (!list || list.length === 0) {
      console.log("⛔ 데이터 없음 → 크롤링 종료");
      break;
    }

    collected = collected.concat(list);
    console.log(`📦 누적 ${collected.length}개`);

    if (list.length < limit) break;

    pageIndex++;
    await new Promise((r) => setTimeout(r, 400));
  }

  fs.writeFileSync("sugang_all.json", JSON.stringify(collected, null, 2));
  console.log("💾 JSON 저장 완료 → sugang_all.json");

  const excelRows: any[] = [];

  for (const t of collected) {
    const times = t.suupTimes ? t.suupTimes.split(",") : [null];
    const rooms = t.suupRoomNms ? t.suupRoomNms.split(",") : [];

    times.forEach((timeStr:string | null, i: number) => {
      if (!timeStr) {
        excelRows.push({
          course_code: t.haksuNo,
          course_name: t.gwamokNm,
          course_name_eng: t.gwamokEnm,

          professor_name: t.gyogangsaNms,
          major_division: t.isuGbNm,
          classification: t.yungyukNm,
          grade: t.banGrade,
          major_level: parseMajorLevel(t.isuUnitNm),

          major_department: t.slgSosokNm,
          offering_department: t.gnjSosokNm,

          day: "",
          start_time: null,
          end_time: null,
          location: "",

          credit: t.hakjeom,
        });
        return;
      }

      const day = getTimeDay(timeStr);
      const period = parseTime(timeStr);

      excelRows.push({
        course_code: t.haksuNo,
        course_name: t.gwamokNm,
        course_name_eng: t.gwamokEnm,

        professor_name: t.gyogangsaNms,
        major_division: t.isuGbNm,
        classification: t.yungyukNm,
        grade: t.banGrade,
        major_level: parseMajorLevel(t.isuUnitNm),

        major_department: t.slgSosokNm,
        offering_department: t.gnjSosokNm,

        day: day || "",
        start_time: period.start || null,
        end_time: period.end || null,
        location: rooms[i] || "",

        credit: t.hakjeom,
      });
    });
  }

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(excelRows);
  xlsx.utils.book_append_sheet(wb, ws, "Courses");

  xlsx.writeFile(wb, "courses_2025-2.xlsx");
  console.log("🎉 Excel 저장 완료 → courses_2025-2.xlsx");
}

main();
