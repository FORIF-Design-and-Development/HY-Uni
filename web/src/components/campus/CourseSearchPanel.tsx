import { useState, useMemo } from "react";
import { useTimetableStore } from "../../store/timetable.store";
import { useNavigate } from "react-router-dom";

export default function CourseSearchPanel() {
  const navigate = useNavigate();

  const goToReviews = (courseId: number) => {
    navigate(`/reviews/${courseId}`);
  };


const DAY_ORDER: Record<string, number> = {
  월: 1,
  화: 2,
  수: 3,
  목: 4,
  금: 5,
  토: 6,
};

const periodToTimeRange = (start: string | number | null, end: string | number | null) => {
  if (!start || !end) return "";

  // DB 문자열 "13:30:00" 처리
  const [sh, sm] =
    typeof start === "string"
      ? start.split(":").map(Number)
      : [Number(start), 0];

  const [eh, em] =
    typeof end === "string"
      ? end.split(":").map(Number)
      : [Number(end), 0];

  return `${String(sh).padStart(2,"0")}:${String(sm).padStart(2,"0")} ~ ${String(
    eh
  ).padStart(2,"0")}:${String(em).padStart(2,"0")}`;
};


function timeToPeriod(time: string | number | null) {
  if (time == null) return null;

  // ✅ 숫자면 그대로 교시로 처리 (병합된 데이터)
  if (typeof time === "number") return time;

  // ✅ 문자열 "13:00:00" 처리
  if (typeof time === "string") {
    if (!time.includes(":")) return null; // 안전장치

    const [h, m] = time.split(":").map(Number);

    // 기준 09:00 = 1교시
    const base = 9;
    let period = h - base + 1;

    // 30분 → 반 교시
    if (m >= 30) period += 0.5;

    return period;
  }

  return null;
}
  const {
    courses,
    filters,
    setFilters,
    searchCourses,
    addCourse
  } = useTimetableStore();

  // ✅ 입력 중 리렌더 방지용 로컬 상태
  const [searchSubject, setSearchSubject] = useState(filters.subject);
  const [searchProfessor, setSearchProfessor] = useState(filters.professor);

  // ✅ debounce 적용
  useMemo(() => {
    const t = setTimeout(() => {
      setFilters("subject", searchSubject);
      setFilters("professor", searchProfessor);
    }, 200);

    return () => clearTimeout(t);
  }, [searchSubject, searchProfessor]);

  // ✅ 필터 + 정렬 + 검색 결과 계산 (메모이제이션)
  const filteredCourses = useMemo(() => {
    let list = [...courses];

    if (filters.subject)
      list = list.filter(c => c.course_name?.includes(filters.subject));

    if (filters.professor)
      list = list.filter(c => c.professor?.includes(filters.professor));

    if (filters.year)
      list = list.filter(c => c.required_grade == filters.year);

    if (filters.type)
      list = list.filter(c => c.major_division === filters.type);

    if (filters.day)
      list = list.filter(c => c.day === filters.day);

    if (filters.sort === "요일순") {
      list.sort((a, b) => {
        const da = DAY_ORDER[a.day] || 99;
        const db = DAY_ORDER[b.day] || 99;
        if (da !== db) return da - db;
        return (a.start_time || 99) - (b.start_time || 99);
      });
    }

    return list;
  }, [courses, filters]);

  return (
    <div
      style={{
        flex: 0.9,
        backgroundColor: "#ffffff",
        borderRadius: 12,
        padding: 16,
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        maxHeight: "calc(100vh - 120px)",
      }}
    >
      <h3
        style={{
          margin: 0,
          marginBottom: 10,
          fontSize: 16,
          color: "#0E4A84",
        }}
      >
        🔍 강의 검색
      </h3>

      {/* 검색 필드 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <input
          placeholder="교과목명"
          value={searchSubject}
          onChange={(e) => setSearchSubject(e.target.value)}
          style={{
            flex: 1,
            padding: "6px 8px",
            borderRadius: 8,
            border: "1px solid #898C8E",
            fontSize: 12,
            color: "#0E4A84",
          }}
        />
        <input
          placeholder="교수명"
          value={searchProfessor}
          onChange={(e)=>setSearchProfessor(e.target.value)}
          style={{
            flex: 1,
            padding: "6px 8px",
            borderRadius: 8,
            border: "1px solid #898C8E",
            fontSize: 12,
            color: "#0E4A84",
          }}
        />
      </div>

      {/* 필터 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <select
          value={filters.year}
          onChange={(e) => setFilters("year", e.target.value)}
          style={{
            flex: 1,
            padding: 6,
            borderRadius: 8,
            border: "1px solid #898C8E",
            fontSize: 12,
            color: "#0E4A84",
          }}
        >
          <option value="">전체 학년</option>
          <option value="1">1학년</option>
          <option value="2">2학년</option>
          <option value="3">3학년</option>
          <option value="4">4학년</option>
        </select>

        <select
          value={filters.type}
          onChange={(e) => setFilters("type", e.target.value)}
          style={{
            flex: 1,
            padding: 6,
            borderRadius: 8,
            border: "1px solid #898C8E",
            fontSize: 12,
            color: "#0E4A84",
          }}
        >
          <option value="">전체 이수구분</option>
          <option value="전공핵심">전공핵심</option>
          <option value="전공심화">전공심화</option>
          <option value="전공필수">전공필수</option>
          <option value="전공선택">전공선택</option>
          <option value="교양">교양</option>
        </select>

        <select
          value={filters.day}
          onChange={(e) => setFilters("day", e.target.value)}
          style={{
            flex: 1,
            padding: 6,
            borderRadius: 8,
            border: "1px solid #898C8E",
            fontSize: 12,
            color: "#0E4A84",
          }}
        >
          <option value="">전체 요일</option>
          <option value="월">월</option>
          <option value="화">화</option>
          <option value="수">수</option>
          <option value="목">목</option>
          <option value="금">금</option>
          <option value="토">토</option>
        </select>
      </div>

      {/* 정렬 */}
      <select
        value={filters.sort}
        onChange={(e) => setFilters("sort", e.target.value)}
        style={{
          marginBottom: 8,
          padding: 6,
          borderRadius: 8,
          border: "1px solid #898C8E",
          fontSize: 12,
          color: "#0E4A84",
        }}
      >
        <option value="이름순">이름순</option>
        <option value="학점순">학점순</option>
        <option value="요일순">요일순</option>
      </select>

      {/* 강제 새로고침 */}
      <button
        onClick={searchCourses}
        style={{
          marginBottom: 8,
          padding: "6px 10px",
          borderRadius: 8,
          border: "none",
          backgroundColor: "#0E4A84",
          color: "#ffffff",
          fontSize: 12,
          cursor: "pointer",
          alignSelf: "flex-end",
        }}
      >
        검색
      </button>

      {/* 결과 리스트 */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          paddingRight: 4,
          borderTop: "1px solid #ECEFF1",
          marginTop: 4,
        }}
      >
        {filteredCourses.length === 0 ? (
          <div
            style={{
              paddingTop: 20,
              textAlign: "center",
              color: "#898C8E",
              fontSize: 13,
            }}
          >
            검색 결과가 없습니다.
          </div>
        ) : (
          filteredCourses.map((c) => {
            const hasTime =
              c.day &&
              c.start_time &&
              c.start_time !== "00:00:00" &&
              c.start_time !== "-" &&
              c.end_time &&
              c.end_time !== "00:00:00" &&
              c.end_time !== "-";


            const periodText = hasTime
              ? `${c.day} ${c.start_time}~${c.end_time}`
              : "시간 미지정";

            const timeText = hasTime
              ? periodToTimeRange(
                  Number(c.start_time),
                  Number(c.end_time)
                )
              : "";

            return (
              <div
                key={`${c.course_id}-${c.day}-${c.start_time}-${c.end_time}`}
                style={{
                  border: "1px solid #ECEFF1",
                  borderRadius: 10,
                  padding: 8,
                  marginBottom: 6,
                  fontSize: 12,
                  color: "#0E4A84",
                  backgroundColor: "#F9FAFB",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: 2,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>{c.course_name}</span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "#898C8E",
                    }}
                  >
                    {c.credit}학점 · {c.major_division || "이수구분 없음"}
                  </span>
                </div>

                <div
                  style={{
                    marginBottom: 2,
                    fontSize: 11,
                    color: "#898C8E",
                  }}
                >
                  {c.professor || "-"} / {c.required_grade ? `${c.required_grade}학년` : "-"}
                </div>

                <div
                  style={{
                    marginBottom: 4,
                    fontSize: 11,
                    color: "#0E4A84",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  {/* 시간 */}
                  {hasTime ? (
                  <span>
                    {(() => {
                      const startP = timeToPeriod(c.start_time);
                      const endP = timeToPeriod(c.end_time);

                      if (startP == null || endP == null) return "시간 미지정";

                      return `${c.day} ${startP}~${endP - 1}교시 (${periodToTimeRange(c.start_time, c.end_time)})`;
                    })()}
                  </span>
                ) : (
                  <span>시간 미지정</span>
                )}


                  {/* 장소 */}
                  {c.location && (
                    <span>{c.location}</span>
                  )}

                  {/* 학과 정보 */}
                  {(c.major_department || c.offering_department) && (
                    <span>
                      {c.major_department || "-"} · {c.offering_department || "-"}
                    </span>
                  )}
                </div>


                <button
                  onClick={() => {
                    const existing = useTimetableStore.getState().selectedCourses;

                    const same = [
                      ...existing,
                      c
                    ].filter(
                      x =>
                        x.course_code === c.course_code &&
                        x.day === c.day &&
                        x.professor === c.professor &&
                        x.location === c.location &&
                        x.start_time != null &&
                        x.end_time != null
                    );

                   const minStart = Math.min(...same.map(x =>
                      typeof x.start_time === "string"
                        ? timeToPeriod(x.start_time)
                        : x.start_time
                    ));

                    const maxEnd = Math.max(...same.map(x =>
                      typeof x.end_time === "string"
                        ? timeToPeriod(x.end_time)
                        : x.end_time
                    ));

                    addCourse({
                      ...c,
                      start_time: minStart,
                      end_time: maxEnd
                    });
                  }}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 999,
                    border: "none",
                    backgroundColor: "#0E4A84",
                    color: "#ffffff",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  ➕ 시간표에 추가
                </button>
               <button
                onClick={() => goToReviews(c.course_id)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: "none",
                  backgroundColor: "#0E4A84",
                  color: "#ffffff",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                ⭐ 강의평
              </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
