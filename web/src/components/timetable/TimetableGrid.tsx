import { useTimetableStore } from "../../store/timetable.store";

const periodToTimeRange = (start: number, end: number) => {
  const base = 9;
  const fmt = (h: number) => `${String(h).padStart(2, "0")}:00`;

  const startTime = base + (start - 1);
  const endTime = base + (end - 1);

  return `${fmt(startTime)} ~ ${fmt(endTime)}`;
};

export default function TimetableGrid() {
  const { selectedCourses, removeCourse, removeIncomplete } =
    useTimetableStore();

  const days = ["월", "화", "수", "목", "금", "토"];
  const times = Array.from({ length: 15 }, (_, i) => i + 1);

  const validCourses = selectedCourses.filter(
    (c) => c.start_time != null && c.end_time != null
  );

  const incomplete = selectedCourses.filter(
    (c) => c.start_time == null || c.end_time == null
  );

  const getColor = (id: number) => {
    const palette = ["#0E4A84", "#898C8E"];
    return palette[id % 2];
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
                const startCourse = validCourses.find(
                  (c) =>
                    c.day === day && Number(c.start_time) === Number(t)
                );

                const covered = validCourses.some(
                  (c) =>
                    c.day === day &&
                    Number(c.start_time) < t &&
                    Number(c.end_time) >= t
                );

                if (covered) return null;

                if (!startCourse) {
                  return (
                    <td
                      key={`empty-${day}-${t}`}
                      style={{
                        border: "1px solid #ECEFF1",
                        backgroundColor: "#ffffff",
                        height: 36,
                      }}
                    />
                  );
                }

                const s = Number(startCourse.start_time);
                const e = Number(startCourse.end_time);
                const span = e - s + 1;

                return (
                  <td
                    key={`${day}-${startCourse.course_id}-${s}-${t}`}
                    rowSpan={span}
                    style={{
                      border: "1px solid #ECEFF1",
                      backgroundColor: getColor(
                        validCourses.indexOf(startCourse)
                      ),
                      color: "#ffffff",
                      position: "relative",
                      padding: 6,
                      fontSize: 11,
                    }}
                  >
                    <button
                      onClick={() => {
                        if (!window.confirm("해당 강의를 삭제하시겠습니까?"))
                          return;
                        removeCourse(
                          startCourse.course_id,
                          startCourse.day,
                          startCourse.start_time,
                          startCourse.end_time
                        );
                      }}
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
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      x
                    </button>

                    <div style={{ fontWeight: 700, marginBottom: 2 }}>
                      {startCourse.course_name}
                    </div>
                    <div style={{ marginBottom: 2 }}>
                      {startCourse.professor || "-"}
                    </div>

                    <div style={{ fontSize: 10 }}>
                      {startCourse.day} {s}~{e}교시
                      <br />
                      {periodToTimeRange(s, e)}
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
                      <div>{startCourse.location}</div>
                      <div>
                        {startCourse.major_division || "이수구분 없음"} ·{" "}
                        {startCourse.credit ?? 0}학점
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}

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
                {incomplete.length === 0 && (
                  <span style={{ color: "#898C8E" }}>없음</span>
                )}
                {incomplete.map((c, idx) => (
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
                  >
                    {c.course_name} ({c.professor || "-"})
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
