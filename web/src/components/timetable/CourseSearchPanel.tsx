import React from "react";
import { useTimetableStore } from "../../store/timetable.store";

const DAY_ORDER: Record<string, number> = {
  월: 1,
  화: 2,
  수: 3,
  목: 4,
  금: 5,
  토: 6,
};

const periodToTimeRange = (start: number | null, end: number | null) => {
  if (!start || !end) return "";
  const base = 9;
  const s = base + (start - 1);
  const e = base + (end - 1);

  const fmt = (h: number) => `${String(h).padStart(2, "0")}:00`;
  return `${fmt(s)} ~ ${fmt(e)}`;
};

export default function CourseSearchPanel() {
  const {
    courses,
    filters,
    setFilters,
    searchCourses,
    addCourse,
  } = useTimetableStore();

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
          value={filters.subject}
          onChange={(e) => setFilters("subject", e.target.value)}
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
          value={filters.professor}
          onChange={(e) => setFilters("professor", e.target.value)}
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

      {/* 필터 3개 */}
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
        🔁 검색 새로고침
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
        {courses.length === 0 ? (
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
          courses
            .slice()
            .sort((a, b) => {
              if (filters.sort === "요일순") {
                const da = DAY_ORDER[a.요일] || 99;
                const db = DAY_ORDER[b.요일] || 99;
                if (da !== db) return da - db;
                return (a.시작교시 || 99) - (b.시작교시 || 99);
              }
              return 0;
            })
            .map((c) => {
              const hasTime =
                c.요일 && c.시작교시 != null && c.종료교시 != null;
              const periodText = hasTime
                ? `${c.요일} ${c.시작교시}~${c.종료교시}교시`
                : "시간 미지정";
              const timeText = hasTime
                ? periodToTimeRange(
                    Number(c.시작교시),
                    Number(c.종료교시)
                  )
                : "";

              return (
                <div
                  key={`${c.id}-${c.요일 || "NO_DAY"}`}
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
                    <span>{c.교과목명}</span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "#898C8E",
                      }}
                    >
                      {c.학점}학점 · {c.이수구분 || "이수구분 없음"}
                    </span>
                  </div>
                  <div
                    style={{
                      marginBottom: 2,
                      fontSize: 11,
                      color: "#898C8E",
                    }}
                  >
                    {c.교강사 || "-"} / {c.학년 || "학년 정보 없음"}
                  </div>
                  <div
                    style={{
                      marginBottom: 4,
                      fontSize: 11,
                      color: "#0E4A84",
                    }}
                  >
                    {periodText}
                    {timeText && ` · ${timeText}`}
                    {c.강의실 && ` · ${c.강의실}`}
                  </div>

                  <button
                    onClick={() => addCourse(c)}
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
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
