import puppeteer from "puppeteer";
import {
  NoticeModel,
  CreateNoticeDTO,
} from "../../../models/campus/notice.model"; // 👈 경로 확인 필요

// 1. 전체 공지 리스트 URL
const TARGET_URL =
  "https://www.hanyang.ac.kr/web/www/notice_all?p_p_id=viewNotice_WAR_noticeportlet&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&p_p_col_id=column-1&p_p_col_count=1&_viewNotice_WAR_noticeportlet_sCategoryId=0&_viewNotice_WAR_noticeportlet_sCurPage=1&_viewNotice_WAR_noticeportlet_sUserId=0&_viewNotice_WAR_noticeportlet_action=view";

// 2. 상세 URL 베이스
const DETAIL_BASE_URL =
  "https://www.hanyang.ac.kr/web/www/notice_all?p_p_id=viewNotice_WAR_noticeportlet&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&p_p_col_id=column-1&p_p_col_count=1&_viewNotice_WAR_noticeportlet_sCategoryId=0&_viewNotice_WAR_noticeportlet_sCurPage=1&_viewNotice_WAR_noticeportlet_sUserId=0&_viewNotice_WAR_noticeportlet_action=view_message&_viewNotice_WAR_noticeportlet_messageId=";

// 크롤러 내부에서 사용할 임시 타입 (브라우저에서 가져온 원본 데이터)
interface ScrapedRawNotice {
  title: string;
  link: string;
  date: string;
}

export const crawlAndSaveNotices = async () => {
  console.log("🚀 [공지사항 크롤러] 시작합니다...");

  // 브라우저 실행
  const browser = await puppeteer.launch({
    headless: false, // 테스트용 (배포 시 "new" 또는 true로 변경)
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--window-size=1280,960",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 960 });

    // 최초 접속
    await page.goto(TARGET_URL, { waitUntil: "networkidle2" });

    let totalSaved = 0;

    // 3. 페이지 순회 (4번 버튼부터 8번 버튼까지)
    for (let i = 4; i < 9; i++) {
      console.log(`\n📄 [페이지 스캔] Pagination 인덱스: ${i}`);

      // (1) 로딩 대기 (3초)
      await new Promise((r) => setTimeout(r, 3000));

      // (2) 데이터 추출 (브라우저 내부 실행)
      const noticesInPage = await page.evaluate((detailBaseUrl) => {
        const results: ScrapedRawNotice[] = [];
        const rows = document.querySelectorAll(
          "#notice01 > div > table > tbody > tr"
        );

        rows.forEach((tr) => {
          const titleElem = tr.querySelector("td > div > div > p");
          const linkElem = tr.querySelector("td > div > div > p > a");
          const dateElem = tr.querySelector("td > div > div > div.notice-date");

          if (titleElem && linkElem && dateElem) {
            const title = (titleElem as HTMLElement).innerText.trim();
            const dateStr = (dateElem as HTMLElement).innerText.trim();

            // 링크 변환 로직
            const href = linkElem.getAttribute("href");
            let fullUrl = "";
            if (href) {
              // javascript: 함수 호출에서 ID 추출
              const match = href.match(/\('?(\d+)'?\)/);
              if (match && match[1]) {
                fullUrl = detailBaseUrl + match[1];
              }
            }

            if (title && fullUrl) {
              results.push({ title, link: fullUrl, date: dateStr });
            }
          }
        });
        return results;
      }, DETAIL_BASE_URL);

      console.log(
        `   👉 발견된 공지: ${noticesInPage.length}개. DB 작업을 시작합니다.`
      );

      // (3) DB 저장 로직 (CreateNoticeDTO 변환 및 저장)
      for (const rawNotice of noticesInPage) {
        // A. 중복 확인 (URL 기준)
        const exists = await NoticeModel.findByUrl(rawNotice.link);
        if (exists) {
          // console.log(`   PASS: 이미 존재하는 공지입니다 (${rawNotice.title})`);
          continue;
        }

        // B. 날짜 변환 (String "2024.05.20" -> Date 객체)
        let postedAt = new Date(rawNotice.date.replace(/\./g, "-"));
        if (isNaN(postedAt.getTime())) {
          postedAt = new Date(); // 날짜 파싱 실패 시 현재 시간
        }

        // C. DTO 생성
        // content 필드는 현재 리스트 크롤링이므로 상세 URL로 대체합니다.
        const noticeData: CreateNoticeDTO = {
          title: rawNotice.title,
          content: rawNotice.link, // 💡 상세 본문 대신 링크 저장 (필요시 상세 크롤링 추가 구현)
          author: "한양대학교", // 리스트에 작성자가 없으므로 기본값
          postedAt: postedAt,
          originalUrl: rawNotice.link,
        };

        // D. DB 저장
        await NoticeModel.create(noticeData);
        console.log(`   ✅ 저장 완료: ${rawNotice.title}`);
        totalSaved++;
      }

      // (4) 다음 페이지 버튼 클릭
      // 선택자: .pagination li:nth-child(i) a
      const nextButtonSelector = `#notice01 > div > div.pagination.pagination-hy.text-center > ul > li:nth-child(${i}) > a`;

      try {
        // 버튼이 존재하는지 확인 후 클릭
        await page.waitForSelector(nextButtonSelector, { timeout: 5000 });
        await page.click(nextButtonSelector);
      } catch (e) {
        console.warn(
          "   ⚠️ 다음 페이지 버튼을 찾을 수 없거나 마지막 페이지입니다."
        );
        break; // 반복문 종료
      }
    }

    console.log(
      `\n🎉 크롤링 완료! 총 ${totalSaved}개의 새로운 공지를 저장했습니다.`
    );
  } catch (error) {
    console.error("❌ 크롤링 중 치명적 오류 발생:", error);
  } finally {
    await browser.close();
  }
};
crawlAndSaveNotices();
