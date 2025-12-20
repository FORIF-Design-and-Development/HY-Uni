import { useEffect, useState } from "react";
import TimetableHeader from "../../components/campus/TimetableHeader";
import TimetableGrid from "../../components/campus/TimetableGrid";
import CourseSearchPanel from "../../components/campus/CourseSearchPanel";
import { useTimetableStore } from "../../store/timetable.store";
import { useAuthStore } from "../../store/auth.store";

export default function TimetablePage() {
  const { user } = useAuthStore();
  const { loadSets } = useTimetableStore();

  // ✅ [추가] 리사이즈까지 따라가는 반응형 플래그
  const [isNarrow, setIsNarrow] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 1024;
  });

  useEffect(() => {
    // ✅ [추가] 처음 마운트 시에도 한 번 동기화 (모바일/데스크탑 초기 판정)
    const sync = () => setIsNarrow(window.innerWidth < 1024);
    sync();

    // ✅ [추가] 창 크기 변경 시 반응형 갱신
    window.addEventListener("resize", sync);

    return () => window.removeEventListener("resize", sync);
  }, []);

  // 로그인 안된 경우 UI
  if (!user) {
    return (
      <div
        style={{
          padding: 20, // ✅ [수정] CafeteriaPage처럼 단일 padding 값 사용
          maxWidth: 1200, // ✅ [추가] 공통 maxWidth 적용
          margin: "0 auto", // ✅ [추가] 중앙 정렬
          fontFamily: "Pretendard, system-ui",
          backgroundColor: "#f5f5f5",
          minHeight: "100vh",
        }}
      >
        <h2 style={{ fontSize: "22px", marginBottom: "10px" }}>
          로그인이 필요합니다.
        </h2>

        <p style={{ fontSize: "16px", lineHeight: "1.5" }}>
          로그인을 먼저 진행해주세요.
        </p>

        <button
          onClick={() => (window.location.href = "/login")}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            backgroundColor: "#1a73e8",
            color: "white",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
          }}
        >
          로그인하러 가기
        </button>
      </div>
    );
  }

  // 시간표 정상 출력
  return (
    <div
      style={{
        padding: 20, // ✅ [수정] CafeteriaPage 스타일과 통일
        maxWidth: 1200, // ✅ [추가] 콘텐츠 폭 제한
        margin: "0 auto", // ✅ [추가] 중앙 정렬
        fontFamily: "Pretendard, system-ui",
        backgroundColor: "#f5f5f5",
        minHeight: "100vh",
      }}
    >
      <TimetableHeader />

      {/* ✅ [수정] 이제 무조건 "상(검색) - 하(시간표)" 구조로 고정 */}
      <div
        style={{
          display: "flex",
          gap: 24,
          alignItems: "stretch",
          flexDirection: "column", // ✅ [추가] 무조건 세로 배치
        }}
      >
        {/* ✅ [수정] 검색 패널은 위에 한 번만 렌더링 (중복 제거) */}
        <div
          style={{
            width: "100%",
          }}
        >
          <CourseSearchPanel />
        </div>

        {/* ✅ [수정] 시간표 영역: 화면이 작으면 가로 스크롤로 보여주기 */}
        <div
          style={{
            width: "100%",
            overflowX: "auto",
            overflowY: "hidden",
            backgroundColor: "#f5f5f5",
          }}
        >
          <TimetableGrid />
        </div>
      </div>
    </div>
  );
}
