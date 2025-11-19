import { Notice } from "../../api/campusApi";

interface Props {
  notice: Notice;
}

export default function NoticeCard({ notice }: Props) {
  // 날짜 포맷팅 (YYYY. MM. DD 형태)
  const dateStr = new Date(notice.postedAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex flex-col gap-2">
        {/* 상단: 카테고리(작성자) & 날짜 */}
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-medium">
            {notice.author || "학교 공지"}
          </span>
          <span>{dateStr}</span>
        </div>

        {/* 제목 (원본 링크가 있으면 링크로, 없으면 텍스트만) */}
        <h3 className="text-lg font-bold text-gray-900 leading-snug mt-1">
          {notice.originalUrl ? (
            <a
              href={notice.originalUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:text-indigo-600 hover:underline flex items-center gap-1"
            >
              {notice.title}
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          ) : (
            notice.title
          )}
        </h3>

        {/* 내용 미리보기 */}
        <p className="text-gray-600 text-sm line-clamp-2 mt-1">
          {notice.content}
        </p>
      </div>
    </div>
  );
}
