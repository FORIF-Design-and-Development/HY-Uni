import { useTimetableStore } from "../../store/timetable.store";

const days = ["월", "화", "수", "목", "금", "토"];

// period(숫자)도, "HH:MM:SS"(문자열)도 슬롯으로 변환
function timeToSlot(periodOrTime: number | string | null) {
  if (periodOrTime == null) return null;

  // 숫자면 교시 기반 슬롯 (예: 1교시=0, 1.5교시=1, ...)
  if (typeof periodOrTime === "number") {
    if (isNaN(periodOrTime)) return null;
    return Math.round((periodOrTime - 1) * 2);
  }

  // 문자열 "13:00:00" 또는 "13:00" 처리
  if (typeof periodOrTime === "string") {
    if (periodOrTime === "-" || periodOrTime.trim() === "") return null;
    if (!periodOrTime.includes(":")) return null;

    const [hStr, mStr] = periodOrTime.split(":");
    const h = Number(hStr);
    const m = Number(mStr);

    if (isNaN(h) || isNaN(m)) return null;

    // 09:00을 0 슬롯으로 맞춤 (30분 단위)
    return (h - 9) * 2 + (m >= 30 ? 1 : 0);
  }

  return null;
}

/** slot → HH:MM 변환 */
function slotToTime(slot: number) {
  const totalMin = 9 * 60 + slot * 30;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function TimetableGrid() {
  // ✅ [수정] store 설계에 맞게 incompleteCourses를 직접 사용
  const { selectedCourses, incompleteCourses, removeCourse, removeIncomplete } =
    useTimetableStore();

  /** 🔥 여기 조건이 틀리면 시간 지정 강의도 미지정으로 들어감 */
  // Number(...)로 판별하지 말고 timeToSlot 결과로 판별해야 "13:00:00"도 통과함
  const validCourses = selectedCourses.filter((c) => {
    const s = timeToSlot(c.start_time);
    const e = timeToSlot(c.end_time);

    return (
      c.day &&
      c.day !== "-" &&          // 요일 '-'(미지정)은 그리드에 안 올림
      s != null &&
      e != null &&
      e > s                      // 최소한의 유효성(끝 > 시작)
    );
  });

  // ✅ [수정] 미지정은 store(incompleteCourses)가 source of truth
  // - 로딩 단계에서 이미 분리된 결과를 그대로 사용해야 idx 삭제도 정확함
  const incomplete = incompleteCourses;

  return (
    <div
      style={{
        // flex: 1.6,
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
              시간
            </th>
            {days.map((d) => (
              <th key={d} style={{ padding: 6, border: "1px solid #ECEFF1" }}>
                {d}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {Array.from({ length: 30 }, (_, slot) => (
            <tr key={slot}>
              {/* 교시 표시 */}
              {slot % 2 === 0 && (
                <td
                  rowSpan={2}
                  style={{
                    border: "1px solid #ECEFF1",
                    backgroundColor: "#F7F9FA",
                    color: "#0E4A84",
                    textAlign: "center",
                    padding: 4,
                    width: 82,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{slot / 2 + 1}교시</div>
                  <div style={{ fontSize: 10, color: "#898C8E" }}>
                    {slotToTime(slot)} ~ {slotToTime(slot + 2)}
                  </div>
                </td>
              )}

              {days.map((day) => {
                const course = validCourses.find((c) => {
                  const s = timeToSlot(c.start_time);
                  return c.day === day && s === slot;
                });

                const covered = validCourses.some((c) => {
                  const s = timeToSlot(c.start_time);
                  const e = timeToSlot(c.end_time);
                  if (s == null || e == null) return false;
                  return c.day === day && s < slot && e > slot;
                });

                if (covered) return null;

                if (!course) {
                  return (
                    <td
                      key={`${day}-${slot}`}
                      style={{
                        border: "1px solid #ECEFF1",
                        height: 18,
                        backgroundColor: "#ffffff",
                      }}
                    />
                  );
                }

                // 강의 칸 span 계산
                const s = timeToSlot(course.start_time)!;
                const e = timeToSlot(course.end_time)!;
                const span = e - s;

                return (
                  <td
                    key={`${day}-${slot}-${course.course_id}`}
                    rowSpan={span}
                    style={{
                      border: "1px solid #ECEFF1",
                      backgroundColor: "#0E4A84",
                      color: "#ffffff",
                      position: "relative",
                      padding: 6,
                      fontSize: 11,
                      height: 18 * span,
                    }}
                  >
                    <button
                      onClick={() => {
                        if (!window.confirm("해당 강의를 삭제하시겠습니까?"))
                          return;
                        removeCourse(
                          course.course_id,
                          course.day,
                          course.start_time,
                          course.end_time
                        );
                      }}
                      style={{
                        position: "absolute", // ✅ [수정]
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
                      x
                    </button>

                    <div style={{ fontWeight: 700 }}>{course.course_name}</div>
                    <div>{course.professor || "-"}</div>
                    <div style={{ fontSize: 10 }}>
                      {course.day} {slotToTime(s)} ~ {slotToTime(e)}
                    </div>
                    <div style={{ fontSize: 10, marginTop: 4 }}>
                      {course.location}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}

          {/* 미지정 강의 */}
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
              <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
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
