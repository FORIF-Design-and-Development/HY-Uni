//공지사항 typescript 타입 정의
/*
일단 공지사항이라는 데이터의 구조를 생각해보자. 나는 이 공지사항을 학교의 공지사항 페이지로 부터 가져와야 해. 그러기 위해 크롤링하는 코드를 서버에서 주기적으로 실행할 예정이야. 하지만 일단은 notice 관련  백엔드를 구현하고 싶어. 그러기 위해서는 공지사항의 구조를 먼저 정의해야 겠지. 
*/

/*
Table "notice" {
  "notice_id" BIGINT [pk, increment]
  "title" VARCHAR(255) [not null]        // 공지사항 제목
  "content" TEXT [not null]              // 공지사항 본문 (크롤링한 HTML 또는 텍스트)
  "author" VARCHAR(100)                  // 작성자 (예: "컴퓨터공학과", "학생처")
  "posted_at" TIMESTAMP [not null]     // 원본 공지사항이 게시된 날짜
  "original_url" VARCHAR(512) [unique] // 크롤링 출처 URL (중복 수집 방지용)
  "created_at" TIMESTAMP [not null, default: `CURRENT_TIMESTAMP`] // 우리 DB에 삽입된 시간

  Indexes {
    (posted_at) [name: "idx_posted_at"] // 날짜순 정렬을 위함
  }
}

*/
// src/types/notice.type.ts

//공지사항 데이터의 기본 구조
export interface Notice {
  noticeId: number;
  title: string;
  content: string;
  author: string | null;
  postedAt: Date;
  originalUrl: string;
  createdAt: Date;
}

// 공지사항 생성을 위한 DTO
// noticeId, createdAt 등 DB가 자동 생성하는 값은 제외
export interface CreateNoticeDTO {
  title: string;
  content: string;
  author?: string | null;
  postedAt: Date;
  originalUrl: string;
}

// 페이징 처리를 위한 타입
export interface PaginatedNoticeResult {
  notices: Notice[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export interface ManualCreateNoticeDTO {
  title: string;
  content: string;
  author?: string | null; // author는 선택 사항
}

export interface UpdateNoticeDTO {
  title: string;
  content: string;
  author?: string | null;
}
