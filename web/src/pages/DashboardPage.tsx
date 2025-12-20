import { useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { HylionWidget } from "../components/campus/HylionWidget";
import { LibrarySeatsWidget } from "../components/campus/LibrarySeatsWidget";
import NoticeCard from "../components/campus/NoticeCard";
import { FloatingChatbot } from "../components/common/FloatingChatbot";
import { useNoticeStore } from "../store/useNoticeStore";
import { useTimetableStore } from "../store/timetable.store";

export default function DashboardPage() {
  const { notices, fetchNotices } = useNoticeStore();
  const { sets, selectedSet, loadSets, loadTimetable, selectedCourses } = useTimetableStore();

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  // 세트가 없으면 기본세트 생성 또는 세트 있으면 자동선택
  useEffect(() => {
    loadSets();
  }, [loadSets]);

  // 선택된 시간표 세트가 있으면 해당 세트의 시간표 데이터를 불러온다
  useEffect(() => {
    if (selectedSet) {
      loadTimetable(selectedSet);
    }
  }, [selectedSet, loadTimetable]);

  const recentNotices = notices.slice(0, 3);
  const getSetId = (s: any) =>
    s?.timetable_list_id ?? s?.timetableListId ?? s?.id ?? s?.set_id ?? null;

  const selectedSetName =
    sets.find((s: any) => String(getSetId(s)) === String(selectedSet))?.name ??
    sets.find((s: any) => String(getSetId(s)) === String(selectedSet))?.setName ??
    sets.find((s: any) => String(getSetId(s)) === String(selectedCourses?.[0]?.timetable_list_id))?.name ??
    sets.find((s: any) => String(getSetId(s)) === String(selectedCourses?.[0]?.timetable_list_id))?.setName ??
    null;


  // 오늘 요일(월~일) 계산
  const getTodayKoreanDay = () => {
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return days[new Date().getDay()];
  };

  // 수업 객체에서 요일 문자열을 최대한 안전하게 뽑는다 (프로젝트마다 필드명이 다를 수 있음)
  const extractDay = (c: any): string => {
    return (
      c?.day ??
      c?.weekday ??
      c?.day_of_week ??
      c?.course_day ??
      c?.class_day ??
      ""
    );
  };

  const formatTime = (t: any) => {
    if (typeof t === "string") {
      if (t.includes(":")) return t.slice(0, 5);
      return t;
    }
    if (typeof t === "number") {
      return String(t);
    }
    return "";
  };

  const today = getTodayKoreanDay();

  const todayCourses = (Array.isArray(selectedCourses) ? selectedCourses : [])
    .filter((c: any) => {
      const d = extractDay(c);
      // "월" 또는 "월,수" 또는 "월/수" 같은 케이스까지 대충 커버
      return typeof d === "string" && d.includes(today);
    })
    .sort((a: any, b: any) => {
      // start_time 필드명도 프로젝트마다 달라질 수 있으니 안전하게
      const aStart = a?.start_time ?? a?.startTime ?? a?.start ?? "";
      const bStart = b?.start_time ?? b?.startTime ?? b?.start ?? "";
      return String(aStart).localeCompare(String(bStart));
    });

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
      link: "/campus/timetable",
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

        <div className="flex items-center gap-2">
          <Link
            to="/community"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#016ABF]/10 text-[#016ABF] hover:bg-[#016ABF]/20 transition-all active:scale-95 group"
            aria-label="커뮤니티"
          >
            <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
            <span className="text-xs font-bold">커뮤니티</span>
          </Link>

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
        </div>
      </header>

      <div className="px-5 space-y-8">
        {/* 2. 하이리온 위젯 (배경색 조정 필요시 컴포넌트 내부 수정 권장) */}
        <section className="pt-2">
          <HylionWidget />
        </section>

        {/* ✅ [추가] 오늘의 수업 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-gray-800">
              📚 오늘의 수업 <span className="text-gray-400 font-semibold">({today})</span>
            </h2>
            <Link
              to="/campus/timetable"
              className="text-xs font-bold text-[#016ABF] bg-[#016ABF]/10 px-3 py-1.5 rounded-full active:bg-[#016ABF]/20 transition-colors"
            >
              시간표 보기
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden">
            {/* ✅ [추가] 선택된 세트 이름 표시 */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                선택된 시간표:{" "}
                <span className="font-semibold text-gray-700">
                  {selectedSetName ?? "없음"}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                {todayCourses.length}개
              </div>
            </div>

            {todayCourses.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {todayCourses.map((c: any, idx: number) => {
                  // ✅ [추가] 필드명 다양성을 고려한 안전 추출
                  const title =
                    c?.course_name ??
                    c?.courseName ??
                    c?.name ??
                    c?.title ??
                    "수업";
                  const location =
                    c?.location ?? c?.room ?? c?.classroom ?? c?.place ?? "";
                  const professor =
                    c?.professor ?? c?.professor_name ?? c?.instructor ?? "";

                  const startRaw = c?.start_time ?? c?.startTime ?? c?.start ?? "";
                  const endRaw = c?.end_time ?? c?.endTime ?? c?.end ?? "";

                  const start = formatTime(startRaw);
                  const end = formatTime(endRaw);

                  return (
                    <div key={c?.course_id ?? c?.courseId ?? `${title}-${idx}`} className="px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 truncate">
                            {title}
                          </div>
                          <div className="mt-1 text-xs text-gray-500 flex flex-wrap gap-x-2 gap-y-1">
                            {(start || end) && (
                              <span className="font-semibold text-gray-700">
                                {start && end ? `${start} ~ ${end}` : start || end}
                              </span>
                            )}
                            {location && <span>📍 {location}</span>}
                            {professor && <span>👤 {professor}</span>}
                          </div>
                        </div>
                        <div className="shrink-0">
                          <span className="text-[11px] font-bold text-[#016ABF] bg-[#016ABF]/10 px-2.5 py-1 rounded-full">
                            {today}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center bg-gray-50">
                <p className="text-xs text-gray-400">
                  오늘은 등록된 수업이 없습니다.
                </p>
              </div>
            )}
          </div>
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
      </div>

      {/* 플로팅 챗봇 */}
      <FloatingChatbot />
    </div>
  );
}
