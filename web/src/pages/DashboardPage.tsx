import { useEffect } from "react";
import { Link } from "react-router-dom";
import { HylionWidget } from "../components/campus/HylionWidget";
import { LibrarySeatsWidget } from "../components/campus/LibrarySeatsWidget";
import NoticeCard from "../components/campus/NoticeCard";
import { useNoticeStore } from "../store/useNoticeStore";

export default function DashboardPage() {
  const { notices, fetchNotices } = useNoticeStore();

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const recentNotices = notices.slice(0, 3);

  // 브랜드 컬러 적용 (Primary: #016ABF, Secondary: #FE7716)
  const quickLinks = [
    {
      name: "학사 일정",
      icon: "📅",
      // 메인 컬러 (Blue)
      bg: "bg-[#016ABF]/5",
      text: "text-[#016ABF]",
      link: "/campus/academic_calendar",
    },
    {
      name: "교과목/시간표",
      icon: "📚",
      // 메인 컬러 (Blue)
      bg: "bg-[#016ABF]/5",
      text: "text-[#016ABF]",
      link: "/library",
    },
    {
      name: "학식 메뉴",
      icon: "🍽️",
      // 포인트 컬러 (Orange) - 음식/활력
      bg: "bg-[#FE7716]/10",
      text: "text-[#FE7716]",
      link: "/campus/cafeteria",
    },
    {
      name: "캠퍼스 맵",
      icon: "🗺️",
      // 메인 컬러 (Blue)
      bg: "bg-[#016ABF]/5",
      text: "text-[#016ABF]",
      link: "/campus/map",
    },
  ];

  return (
    <div className="w-full min-h-screen bg-white pb-24">
      {/* 1. 헤더 (브랜드 느낌 강조) */}
      <header className="px-5 pt-6 pb-4 bg-white sticky top-0 z-20 flex justify-between items-center bg-opacity-90 backdrop-blur-md">
        <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
          HY <span className="text-[#016ABF]">UNI</span>
        </h1>
        <button className="relative p-2 -mr-2 text-gray-400 hover:text-[#016ABF] transition-colors">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {/* 알림 점 (Secondary Color) */}
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FE7716] border border-white"></span>
        </button>
      </header>

      <div className="px-5 space-y-8">
        {/* 2. 하이리온 위젯 (배경색 조정 필요시 컴포넌트 내부 수정 권장) */}
        <section className="pt-2">
          <HylionWidget />
        </section>

        {/* 3. 퀵 바로가기 (브랜드 컬러 적용) */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-gray-800">바로가기</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {quickLinks.map((item) => (
              <Link
                key={item.name}
                to={item.link}
                className={`
                  group flex flex-col items-center justify-center 
                  py-5 px-3 rounded-2xl 
                  ${item.bg} 
                  active:scale-[0.98] transition-all duration-200
                `}
              >
                <span className={`text-3xl mb-2 ${item.text} drop-shadow-sm`}>
                  {item.icon}
                </span>
                <span className="text-[13px] font-bold text-gray-700 whitespace-nowrap">
                  {item.name}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* 4. 도서관 현황 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-gray-800">도서관 현황</h2>
            <Link
              to="/library"
              className="text-xs text-[#016ABF] font-semibold hover:underline"
            >
              상세보기
            </Link>
          </div>
          <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden">
            <LibrarySeatsWidget />
          </div>
        </section>

        {/* 5. 공지사항 리스트 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-gray-800 flex items-center gap-1.5">
              📢 공지사항
              {/* Secondary Color로 포인트 (New 뱃지 느낌) */}
              <span className="w-1.5 h-1.5 rounded-full bg-[#FE7716] animate-pulse"></span>
            </h2>
            <Link
              to="/campus/notices"
              className="text-xs font-bold text-[#016ABF] bg-[#016ABF]/10 px-3 py-1.5 rounded-full active:bg-[#016ABF]/20 transition-colors"
            >
              더보기
            </Link>
          </div>

          <div className="space-y-3">
            {recentNotices.length > 0 ? (
              recentNotices.map((notice) => (
                <div
                  key={notice.noticeId}
                  className="active:scale-[0.99] transition-transform"
                >
                  <NoticeCard notice={notice} />
                </div>
              ))
            ) : (
              <div className="py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-xs text-gray-400">
                  새로운 공지사항이 없습니다.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
