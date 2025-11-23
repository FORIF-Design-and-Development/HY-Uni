import React from "react";
import { useTimetableStore } from "../../store/timetable.store";

const periodToTimeRange = (start: number, end: number) => {
  const base = 9;
  const s = base + (start - 1);
  const e = base + (end - 1);
  const toStr = (h: number) => `${String(h).padStart(2, "0")}:00`;
  return `${toStr(s)} ~ ${toStr(e)}`;
};

export default function TimetableGrid() {
  const {
    selectedCourses,
    incompleteCourses,
    removeCourse,
    removeIncomplete,
  } = useTimetableStore();

  const days = ["월", "화", "수", "목", "금", "토"];
  const times = Array.from({ length: 15 }, (_, i) => i + 1);

  const getColor = (id: number) => {
    const palette = ["#0E4A84", "#898C8E"];
    return palette[id % 2]; // 간단한 색상 배정
  };

  return (
    <div
      style={{
        flex: 1.6,
        backgroundColor: "#ffffff",
        borderRadius: 12,
        padding: 16,
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
          fontSize: 12,
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#0E4A84", color: "#ffffff" }}>
            <th style={{ padding: 6, border: "1px solid #ECEFF1", width: 82 }}>
              교시
            </th>
            {days.map((d) => (
              <th key={d} style={{ padding: 6, border: "1px solid #ECEFF1" }}>
                {d}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {times.map((t) => (
            <tr key={t}>
              <td
                style={{
                  border: "1px solid #ECEFF1",
                  backgroundColor: "#F7F9FA",
                  color: "#0E4A84",
                  textAlign: "center",
                  padding: 4,
                }}
              >
                <div style={{ fontWeight: 600 }}>{t}교시</div>
                <div style={{ fontSize: 10, color: "#898C8E" }}>
                  {periodToTimeRange(t, t)}
                </div>
              </td>

              {days.map((day) => {
                const startCourse = selectedCourses.find(
                  (c) =>
                    c.요일 === day && Number(c.시작교시) === Number(t)
                );

                const covered = selectedCourses.some(
                  (c) =>
                    c.요일 === day &&
                    Number(c.시작교시) < t &&
                    Number(c.종료교시) >= t
                );

                if (covered) return null;

                if (!startCourse) {
                  return (
                    <td
                      key={day}
                      style={{
                        border: "1px solid #ECEFF1",
                        backgroundColor: "#ffffff",
                        height: 36,
                      }}
                    />
                  );
                }

                const span =
                  Number(startCourse.종료교시) -
                  Number(startCourse.시작교시) +
                  1;

                return (
                  <td
                    key={day}
                    rowSpan={span}
                    style={{
                      border: "1px solid #ECEFF1",
                      backgroundColor: getColor(startCourse.id),
                      color: "#ffffff",
                      position: "relative",
                      padding: 6,
                      fontSize: 11,
                    }}
                  >
                    <button
                      onClick={() =>
                        removeCourse(startCourse.id, startCourse.요일)
                      }
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        border: "none",
                        backgroundColor: "rgba(0,0,0,0.35)",
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      ×
                    </button>

                    <div style={{ fontWeight: 700, marginBottom: 2 }}>
                      {startCourse.교과목명}
                    </div>
                    <div style={{ marginBottom: 2 }}>
                      {startCourse.교강사 || "-"}
                    </div>

                    <div style={{ fontSize: 10 }}>
                      {startCourse.요일} {startCourse.시작교시}~
                      {startCourse.종료교시}교시
                      <br />
                      {periodToTimeRange(
                        Number(startCourse.시작교시),
                        Number(startCourse.종료교시)
                      )}
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        padding: "3px 6px",
                        borderRadius: 6,
                        backgroundColor: "rgba(255,255,255,0.25)",
                        fontSize: 10,
                      }}
                    >
                      <div>{startCourse.강의실}</div>
                      <div>
                        {startCourse.이수구분 || "이수구분 없음"} ·{" "}
                        {startCourse.학점 ?? 0}학점
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}

          {/* ===== 미지정 강의 ===== */}
          <tr>
            <td
              colSpan={days.length + 1}
              style={{
                border: "1px solid #ECEFF1",
                padding: 8,
                backgroundColor: "#F7F9FA",
                fontSize: 12,
              }}
            >
              <b style={{ color: "#0E4A84" }}>시간·요일 미지정 강의</b>

              <div
                style={{
                  marginTop: 6,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                {incompleteCourses.length === 0 && (
                  <span style={{ color: "#898C8E" }}>없음</span>
                )}

                {incompleteCourses.map((c, idx) => (
                  <span
                    key={idx}
                    onClick={() => removeIncomplete(idx)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 999,
                      border: "1px solid #898C8E",
                      cursor: "pointer",
                      backgroundColor: "#ffffff",
                      color: "#0E4A84",
                      fontSize: 11,
                    }}
                    title="클릭하면 제거됩니다."
                  >
                    {c.교과목명} ({c.교강사 || "-"})
                  </span>
                ))}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
