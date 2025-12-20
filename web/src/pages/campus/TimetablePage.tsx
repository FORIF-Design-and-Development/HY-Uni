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

      {/* ✅ [수정] 반응형: 넓으면 가로 2컬럼 / 좁으면 세로 스택 */}
      <div
        style={{
          display: "flex",
          gap: 24,
          alignItems: "flex-start",
          // ✅ [추가] 좁은 화면에서 세로 스택으로 변경
          flexDirection: isNarrow ? "column" : "row",
        }}
      >
        {/* ✅ [추가] 좁은 화면에서는 검색 패널을 먼저 보여주는 편이 UX가 좋음 */}
        {isNarrow && (
          <div
            style={{
              width: "100%",
            }}
          >
            <CourseSearchPanel />
          </div>
        )}

        {/* 시간표 영역: overflow로 Grid를 '가둠' */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            maxWidth: "100%",
            overflowX: "auto",
            overflowY: "hidden",
            backgroundColor: "#f5f5f5",
            // ✅ [추가] 세로 스택일 때는 폭 100%로 고정
            width: isNarrow ? "100%" : undefined,
          }}
        >
          <TimetableGrid />
        </div>

        {/* ✅ [수정] 넓은 화면에서만 오른쪽 고정 패널 노출 */}
        {!isNarrow && (
          <div
            style={{
              width: 420,
              flexShrink: 0,
              alignSelf: "flex-start",
            }}
          >
            <CourseSearchPanel />
          </div>
        )}
      </div>
    </div>
  );
}
