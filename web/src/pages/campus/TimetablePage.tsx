import { useEffect } from 'react';
import TimetableHeader from "../../components/campus/TimetableHeader";
import TimetableGrid from "../../components/campus/TimetableGrid";
import CourseSearchPanel from "../../components/campus/CourseSearchPanel";
import { useTimetableStore } from "../../store/timetable.store";

export default function TimetablePage() {
  const { loadSets, searchCourses, selectedSet, loadTimetable } =
    useTimetableStore();

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
