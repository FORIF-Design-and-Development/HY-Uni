import { useEffect } from "react";
import { useNoticeStore } from "../../store/useNoticeStore";
import NoticeCard from "../../components/campus/NoticeCard";

export default function NoticePage() {
  // 스토어에서 '조회' 기능과 데이터만 가져옵니다. (작성/삭제 함수 제외)
  const { notices, isLoading, fetchNotices } = useNoticeStore();

  // 컴포넌트가 마운트될 때 데이터 가져오기
  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* 페이지 헤더 */}
        <header className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📢 캠퍼스 공지사항
          </h1>
          <p className="text-gray-500">
            학교의 주요 공지사항을 한눈에 확인하세요.
          </p>
        </header>

        {/* 공지사항 리스트 영역 */}
        <section>
          {isLoading ? (
            // 로딩 중일 때 스켈레톤 UI 또는 텍스트 표시
            <div className="space-y-4 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          ) : notices.length > 0 ? (
            // 데이터가 있을 때
            <div className="grid gap-4">
              {notices.map((notice) => (
                <NoticeCard key={notice.noticeId} notice={notice} />
              ))}
            </div>
          ) : (
            // 데이터가 없을 때
            <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500">등록된 공지사항이 없습니다.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
