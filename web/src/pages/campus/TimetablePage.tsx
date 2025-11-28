import React, { useEffect } from "react";
import TimetableHeader from "../../components/timetable/TimetableHeader";
import TimetableGrid from "../../components/timetable/TimetableGrid";
import CourseSearchPanel from "../../components/timetable/CourseSearchPanel";
import { useTimetableStore } from "../../store/timetable.store";

export default function TimetablePage() {
  const { loadSets, searchCourses, selectedSet, loadTimetable } =
    useTimetableStore();

  useEffect(() => {
    loadSets();
    searchCourses();
  }, []);

  useEffect(() => {
    if (selectedSet) loadTimetable(selectedSet);
  }, [selectedSet]);

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
