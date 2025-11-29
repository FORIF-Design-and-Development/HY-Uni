import { useEffect } from 'react';
import TimetableHeader from "../../components/campus/TimetableHeader";
import TimetableGrid from "../../components/campus/TimetableGrid";
import CourseSearchPanel from "../../components/campus/CourseSearchPanel";
import { useTimetableStore } from "../../store/timetable.store";
import { useAuthStore } from '../../store/auth.store';

export default function TimetablePage() {
  const { user } =  useAuthStore(); // 로그인상태
  const {selectedSet } = useTimetableStore();

  // 로그인 안된 상태로 timetable접속시 UI
  if (!user) {
    return (
      <div 
        style={{
          padding: "20px 30px",
          fontFamily: "Pretendard, system-ui",
          backgroundColor: "#f5f5f5",
          minHeight: "100vh"
        }}
      >   
      <h2 style={{ fontSize: "22px", marginBottom: "10px" }}>
          로그인된 사용자만 시간표 기능을 이용할 수 있습니다.
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

  // 로그인 된 경우 UI (시간표 정상 출력)
  return (
    <div
      style={{
        padding: "20px 30px",
        fontFamily: "Pretendard, system-ui",
        backgroundColor: "#f5f5f5",
        minHeight: "100vh",
      }}
    >
      <TimetableHeader />

      <div style={{ display: "flex", gap: 24 }}>
        <TimetableGrid />
        <CourseSearchPanel />
      </div>
    </div>
  );
}
