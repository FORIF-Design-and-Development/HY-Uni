// import { useEffect } from "react";
// import { Link } from "react-router-dom";
// import { useNoticeStore } from "../store/useNoticeStore";
// // NoticeCard를 재사용합니다 (경로 확인 필요)
// import { LibrarySeatsWidget } from '../components/campus/LibrarySeatsWidget';
// import NoticeCard from "../components/campus/NoticeCard";

// export default function DashboardPage() {
//   const { notices, fetchNotices } = useNoticeStore();

//   // 대시보드 진입 시 최신 공지사항 3개만 가져오기 위해 fetch 호출
//   useEffect(() => {
//     fetchNotices();
//   }, [fetchNotices]);

//   // 최신순 3개만 자르기
//   const recentNotices = notices.slice(0, 3);

//   return (
//     <div className="max-w-6xl mx-auto px-4 py-10">
//       {/* 1. 환영 섹션 (Hero Section) */}
//       <section className="bg-indigo-600 rounded-2xl p-8 text-white mb-10 shadow-lg">
//         <h1 className="text-3xl font-bold mb-2">반갑습니다, 학우님! 👋</h1>
//         <p className="opacity-90 mb-6">오늘도 즐거운 캠퍼스 생활 되세요.</p>
//         <div className="flex gap-3">
//           <Link
//             to="/campus/notices"
//             className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-bold hover:bg-indigo-50 transition"
//           >
//             공지사항 전체보기
//           </Link>
//         </div>
//       </section>

//       {/* 2. 퀵 메뉴 (바로가기) */}
//       <section className="mb-10">
//         <h2 className="text-xl font-bold text-gray-800 mb-4">🔥 바로가기</h2>
//         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//           {[
//             {
//               name: "학사 일정",
//               icon: "📅",
//               bg: "bg-orange-100 text-orange-600",
//             },
//             {
//               name: "도서관 좌석",
//               icon: "📚",
//               bg: "bg-blue-100 text-blue-600",
//             },
//             {
//               name: "학식 메뉴",
//               icon: "🍽️",
//               bg: "bg-green-100 text-green-600",
//             },
//             {
//               name: "셔틀 버스",
//               icon: "🚌",
//               bg: "bg-purple-100 text-purple-600",
//             },
//           ].map((item) => (
//             <div
//               key={item.name}
//               className={`${item.bg} p-6 rounded-xl flex flex-col items-center justify-center gap-2 hover:opacity-90 cursor-pointer transition shadow-sm`}
//             >
//               <span className="text-3xl">{item.icon}</span>
//               <span className="font-bold">{item.name}</span>
//             </div>
//           ))}
//         </div>
//       </section>

//       {/* 3. 최신 공지사항 미리보기 */}
//       <section>
//         <div className="flex justify-between items-end mb-4">
//           <h2 className="text-xl font-bold text-gray-800">📢 최신 공지사항</h2>
//           <Link
//             to="/campus/notice"
//             className="text-sm text-gray-500 hover:text-indigo-600"
//           >
//             더보기 &rarr;
//           </Link>
//         </div>

//         <div className="grid gap-4 md:grid-cols-1">
//           {recentNotices.length > 0 ? (
//             recentNotices.map((notice) => (
//               <NoticeCard key={notice.noticeId} notice={notice} />
//             ))
//           ) : (
//             <div className="text-center py-10 bg-white rounded-xl border">
//               <p className="text-gray-400">등록된 공지사항이 없습니다.</p>
//             </div>
//           )}
//         </div>
//         <div className="grid grid-cols-[repeat(auto-fit,minmax(350px,1fr))] gap-5">
//           <LibrarySeatsWidget />
//         </div>
//       </section>
//     </div>
//   );
// }

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { HylionWidget } from "../components/campus/HylionWidget";
import { LibrarySeatsWidget } from "../components/campus/LibrarySeatsWidget";
import NoticeCard from "../components/campus/NoticeCard";
import { useNoticeStore } from "../store/useNoticeStore";
import { useTimetableStore } from "../store/timetable.store";


export default function DashboardPage() {
  const { notices, fetchNotices } = useNoticeStore();
  const { sets, selectedSet, loadSets } = useTimetableStore();

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  // 세트가 없으면 기본세트 생성 또는 세트 있으면 자동선택
   useEffect(() => {
    loadSets();
  }, [loadSets]);

  const recentNotices = notices.slice(0, 3);
    // 선택된 시간표(세트) 이름 찾기
  const selectedSetName =
    sets.find((s: any) => s.timetable_list_id === selectedSet)?.name ?? null; // ✅ [추가]

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* 1. 하이리온 위젯 */}
      <HylionWidget />

      {/* 2. 퀵 메뉴 */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-800 mb-4">🔥 바로가기</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              name: "학사 일정",
              icon: "📅",
              bg: "bg-orange-100 text-orange-600",
              link: "/calendar",
            },
            {
              name: "도서관 좌석",
              icon: "📚",
              bg: "bg-blue-100 text-blue-600",
              link: "/library",
            },
            {
              name: "학식 메뉴",
              icon: "🍽️",
              bg: "bg-green-100 text-green-600",
              link: "/campus/cafeteria",
            },
            {
              name: "한양대 Map",
              icon: "🗺️",
              bg: "bg-purple-100 text-purple-600",
              link: "/campus/map",
            },
          ].map((item) => (
            <Link
              key={item.name}
              to={item.link}
              className={`${item.bg} p-6 rounded-xl flex flex-col items-center justify-center gap-2 hover:opacity-90 cursor-pointer transition shadow-sm`}
            >
              <span className="text-3xl">{item.icon}</span>
              <span className="font-bold">{item.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/*  3. 시간표 요약  */}
      <section className="mb-10">
        <div className="bg-white rounded-2xl border shadow-sm p-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">🗓️ 시간표</h2>

            {/*  선택된 시간표 이름 표시 */}
            {selectedSet ? (
              <p className="text-sm text-gray-600 mt-1">
                선택된 시간표:{" "}
                <span className="font-semibold text-gray-800">
                  {selectedSetName ?? "이름 없음"}
                </span>
              </p>
            ) : (
              <p className="text-sm text-gray-600 mt-1">
                선택된 시간표가 없습니다.
              </p>
            )}
          </div>

          {/* 시간표 페이지로 이동 버튼 */}
          <Link
            to="/campus/timetable"
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition"
          >
            시간표 보러가기
          </Link>
        </div>
      </section>

      {/* 4. 최신 공지사항 */}
      <section>
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-xl font-bold text-gray-800">📢 최신 공지사항</h2>
          <Link
            to="/campus/notices"
            className="text-sm text-gray-500 hover:text-indigo-600"
          >
            더보기 &rarr;
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-1">
          {recentNotices.length > 0 ? (
            recentNotices.map((notice) => (
              <NoticeCard key={notice.noticeId} notice={notice} />
            ))
          ) : (
            <div className="text-center py-10 bg-white rounded-xl border">
              <p className="text-gray-400">등록된 공지사항이 없습니다.</p>
            </div>
          )}
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(350px,1fr))] gap-5">
          <LibrarySeatsWidget />
        </div>
      </section>
    </div>
  );
}
