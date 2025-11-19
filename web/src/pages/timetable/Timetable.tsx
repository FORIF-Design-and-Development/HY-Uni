// web/src/pages/Timetable.tsx
console.log("🔥 Timetable 렌더링 시작");

import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../api/timetable/timetable.api";


const API_BASE = API_BASE_URL;

// 딜레이
const delay = (ms = 200) => new Promise((res) => setTimeout(res, ms));

// 교시 → 시간 문자열 변환 (1교시=09:00~10:00)
const periodToTimeRange = (start: number | null, end: number | null) => {
  if (!start || !end) return "";
  const baseHour = 9; // 1교시 시작 시각
  const s = baseHour + (start - 1);
  const e = baseHour + (end - 1);

  const toStr = (h: number) => `${String(h).padStart(2, "0")}:00`;
  return `${toStr(s)} ~ ${toStr(e)}`;
};

// 요일 순서
const DAY_ORDER: Record<string, number> = { 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };

// 동일 강의(같은 교과목명 + 요일 + 교수명) 여러 row를 하나로 병합
function mergeByCourseAndDay(rows: any[]): any[] {
  if (!rows || rows.length === 0) return [];

  // 정렬 (병합하려면 필수)
  const sorted = [...rows].sort((a, b) => {
    if (a.교과목명 !== b.교과목명) return a.교과목명.localeCompare(b.교과목명);
    if (a.교강사 !== b.교강사) return a.교강사.localeCompare(b.교강사);
    if (a.요일 !== b.요일)
      return (DAY_ORDER[a.요일] || 99) - (DAY_ORDER[b.요일] || 99);
    return Number(a.시작교시) - Number(b.시작교시);
  });

  const merged: any[] = [];
  let cur: any | null = null;

  sorted.forEach((r) => {
    const sameLecture =
      cur &&
      cur.교과목명 === r.교과목명 &&
      cur.교강사 === r.교강사 &&
      cur.요일 === r.요일;

    if (!sameLecture) {
      cur = { ...r };
      merged.push(cur);
      return;
    }

    // ✔ 규칙 1 — “연속 교시”만 합친다
    //   현재 블록 끝교시 == 새 row 시작교시 인 경우에만 병합
    if (Number(cur.종료교시) === Number(r.시작교시)) {
      cur.종료교시 = r.종료교시;
    } else {
      // 연속 아니면 새로운 블록으로
      cur = { ...r };
      merged.push(cur);
    }
  });

  return merged;
}

function Timetable(): JSX.Element {
  const days = ["월", "화", "수", "목", "금", "토"];
  const times = Array.from({ length: 15 }, (_, i) => i + 1);

  // ====== 상태 ======
  const [sets, setSets] = useState<any[]>([]); // [{ set_id, name }]
  const [selectedSet, setSelectedSet] = useState<number | null>(null);

  const [courses, setCourses] = useState<any[]>([]); // 검색 결과
  const [selectedCourses, setSelectedCourses] = useState<any[]>([]); // 시간표에 올라간 강의
  const [incompleteCourses, setIncompleteCourses] = useState<any[]>([]); // 요일/교시 미지정 강의

  const [filters, setFilters] = useState({
    subject: "",
    professor: "",
    year: "",
    type: "",
    day: "",
    sort: "이름순",
  });

  // 색상: #0E4A84 (메인), #898C8E (서브)
  const [courseColors, setCourseColors] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem("courseColors") || "{}");
    } catch {
      return {};
    }
  });
  const palette = ["#0E4A84", "#898C8E"];

  const getColor = (course: any) => {
    if (!course) return "#ffffff";
    if (courseColors[course.id]) return courseColors[course.id];

    const color = palette[Math.floor(Math.random() * palette.length)];
    const updated = { ...courseColors, [course.id]: color };
    setCourseColors(updated);
    localStorage.setItem("courseColors", JSON.stringify(updated));
    return color;
  };

  // ====== 세트 불러오기 ======
  const loadSets = async () => {
    try {
      const res = await axios.get(`${API_BASE}/timetable-sets`);
      const data = (res.data && res.data.data) || [];
      setSets(data);

      if (!selectedSet && data.length > 0) {
        setSelectedSet(data[0].set_id);
      }
    } catch (err) {
      console.error("세트 불러오기 오류:", err);
    }
  };

  // ====== 세트 생성 ======
  const createSet = async () => {
    const name = window.prompt("새 시간표 이름을 입력하세요 (예: 2025-2)");
    if (!name || !name.trim()) return;

    try {
      await axios.post(`${API_BASE}/timetable-sets`, { name: name.trim() });
      await loadSets();
      window.alert("새 시간표 세트가 생성되었습니다.");
    } catch (err) {
      console.error("세트 생성 오류:", err);
      window.alert("세트 생성에 실패했습니다.");
    }
  };

  // ====== 세트 삭제 ======
  const deleteSet = async () => {
    if (!selectedSet) return;

    const target = sets.find((s) => s.set_id === selectedSet);
    if (!target) return;
    if (target.name === "기본 시간표") {
      window.alert("기본 시간표는 삭제할 수 없습니다.");
      return;
    }

    if (!window.confirm(`'${target.name}' 세트를 삭제할까요?`)) return;

    try {
      await axios.delete(`${API_BASE}/timetable-sets/${selectedSet}`);
      setSelectedCourses([]);
      setIncompleteCourses([]);

      await loadSets();
    } catch (err) {
      console.error("세트 삭제 오류:", err);
      window.alert("세트 삭제에 실패했습니다.");
    }
  };

  // ====== 선택된 세트 시간표 불러오기 ======
  const loadTimetable = async (setId: number | null) => {
    if (!setId) return;

    try {
      const res = await axios.get(`${API_BASE}/timetable`, {
        params: { setId },
      });

      const raw = (res.data && res.data.data) || [];

      const parsed = raw.map((r: any) => ({
        id: r.course_id,
        교과목명: r.교과목명,
        교강사: r.교강사,
        요일: r.day,
        시작교시: r.start_period,
        종료교시: r.end_period,
        강의실: r.강의실,
        학점: r.학점,
        이수구분: r.이수구분,
        학년: r.학년,
      }));

      // 병합
      const merged = mergeByCourseAndDay(parsed);

      const complete: any[] = [];
      const incomplete: any[] = [];

      merged.forEach((c: any) => {
        if (!c.요일 || !c.시작교시 || !c.종료교시) {
          incomplete.push(c);
        } else {
          complete.push(c);
        }
      });

      setSelectedCourses(complete);
      setIncompleteCourses(incomplete);
    } catch (err) {
      console.error("시간표 불러오기 오류:", err);
    }
  };

  // ====== 강의 검색 ======
  const doSearchCourses = async () => {
    try {
      const res = await axios.get(`${API_BASE}/courses`, {
        params: {
          subject: filters.subject,
          professor: filters.professor,
          year: filters.year,
          type: filters.type,
          day: filters.day,
          sort: filters.sort,
        },
      });

      const raw = (res.data && res.data.data) || [];
      const merged = mergeByCourseAndDay(raw);

      const parsed = merged.map((r: any) => {
        const start = r.시작교시 ? Number(r.시작교시) : null;
        const end = r.종료교시 ? Number(r.종료교시) : null;

        return {
          id: r.id,
          교과목명: r.교과목명,
          교강사: r.교강사,
          요일: r.요일,
          시작교시: start,
          종료교시: end,
          강의실: r.강의실 || "미지정",
          학점: r.학점 ? Number(r.학점) : 0,
          이수구분: r.이수구분 || "",
          학년: r.학년 || "",
        };
      });

      setCourses(parsed);
    } catch (err) {
      console.error("강의 검색 오류:", err);
    }
  };

  // ====== 초기 로딩 ======
  useEffect(() => {
    loadSets();
    doSearchCourses();
  }, []);

  // 세트 바뀔 때마다 시간표 불러오기
  useEffect(() => {
    if (selectedSet) {
      loadTimetable(selectedSet);
    }
  }, [selectedSet]);

  // 필터 변경 시 자동 검색 (0.2초 후)
  useEffect(() => {
    const handler = setTimeout(() => {
      doSearchCourses();
    }, 200);

    return () => clearTimeout(handler);
  }, [filters]);

  // ====== 시간표에 강의 추가 ======
  const addCourse = (course: any) => {
    const isIncomplete = !course.요일 || !course.시작교시 || !course.종료교시;

    if (isIncomplete) {
      setIncompleteCourses((prev) => {
        if (prev.find((c) => c.id === course.id)) return prev;
        return [...prev, course];
      });
      return;
    }

    // 수업시간 중복 확인
    const overlap = selectedCourses.find(
      (c) =>
        c.요일 === course.요일 &&
        course.시작교시 <= c.종료교시 &&
        course.종료교시 >= c.시작교시
    );

    if (overlap) {
      window.alert(
        `"${course.교과목명}"은(는) "${overlap.교과목명}"과 시간이 겹칩니다.`
      );
      return;
    }

    setSelectedCourses((prev) => [...prev, course]);
  };

  // ====== 시간표에서 강의 삭제 ======
  const removeCourse = (id: number, day: string) => {
    setSelectedCourses((prev) =>
      prev.filter((c) => !(c.id === id && c.요일 === day))
    );
  };

  // ====== 미지정 강의 삭제 ======
  const removeIncomplete = (index: number) => {
    setIncompleteCourses((prev) => prev.filter((_, i) => i !== index));
  };

  // ====== 시간표 저장 ======
  const saveTimetable = async () => {
    if (!selectedSet) {
      window.alert("먼저 시간표 세트를 선택하세요.");
      return;
    }

    try {
      // 기존 기록 삭제
      await axios.delete(`${API_BASE}/timetable/reset`, {
        params: { setId: selectedSet },
      });

      // 새로 삽입 (완전 지정 + 미지정 모두 저장)
      const all = [...selectedCourses, ...incompleteCourses];

      for (const c of all) {
        await axios.post(`${API_BASE}/timetable`, {
          setId: selectedSet,
          courseId: c.id,
          day: c.요일 || null,
          start: c.시작교시 || null,
          end: c.종료교시 || null,
        });
        await delay(10);
      }

      window.alert("시간표가 저장되었습니다.");
    } catch (err) {
      console.error("시간표 저장 오류:", err);
      window.alert("시간표 저장에 실패했습니다.");
    }
  };

  // ====== 렌더링 ======
  const currentSetName =
    sets.find((s) => s.set_id === selectedSet)?.name || "시간표 미선택";

  return (
    <div
      style={{
        padding: "20px 30px",
        fontFamily: "Pretendard, system-ui, -apple-system, BlinkMacSystemFont",
        backgroundColor: "#f5f5f5",
        minHeight: "100vh",
        color: "#0E4A84",
      }}
    >
      {/* 상단 헤더 */}
      <div
        style={{
          backgroundColor: "#0E4A84",
          color: "#ffffff",
          padding: "14px 18px",
          borderRadius: 12,
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}
      >
        <div>
          <div style={{ fontSize: 14, opacity: 0.8 }}>HYU Timetable</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{currentSetName}</div>
        </div>
        <div style={{ fontSize: 12, color: "#ECEFF1" }}>
          세트별로 강의를 저장하고 불러올 수 있어요.
        </div>
      </div>

      <div style={{ display: "flex", gap: 24 }}>
        {/* ===== 왼쪽: 시간표 ===== */}
        <div
          style={{
            flex: 1.6,
            backgroundColor: "#ffffff",
            borderRadius: 12,
            padding: 16,
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          }}
        >
          {/* 세트 컨트롤 */}
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <select
              value={selectedSet || ""}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedSet(v ? Number(v) : null);
              }}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #898C8E",
                fontSize: 14,
                color: "#0E4A84",
              }}

            >
              {sets.length === 0 && <option value="">세트 없음</option>}
              {sets.map((s) => (
                <option key={s.set_id} value={s.set_id}>
                  {s.name}
                </option>
              ))}
            </select>

            <button
              onClick={createSet}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "none",
                backgroundColor: "#0E4A84",
                color: "#ffffff",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              ➕ 세트 추가
            </button>

            <button
              onClick={deleteSet}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #898C8E",
                backgroundColor: "#ffffff",
                color: "#898C8E",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              🗑 세트 삭제
            </button>

            <button
              onClick={saveTimetable}
              style={{
                marginLeft: "auto",
                padding: "6px 14px",
                borderRadius: 999,
                border: "none",
                backgroundColor: "#0E4A84",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              💾 시간표 저장
            </button>
          </div>

          {/* 시간표 표 */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              tableLayout: "fixed",
              fontSize: 12,
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "#0E4A84",
                  color: "#ffffff",
                }}
              >
                <th
                  style={{
                    padding: 6,
                    border: "1px solid #ECEFF1",
                    width: 82,
                  }}
                >
                  교시
                </th>
                {days.map((d) => (
                  <th
                    key={d}
                    style={{
                      padding: 6,
                      border: "1px solid #ECEFF1",
                    }}
                  >
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {times.map((t) => (
                <tr key={t}>
                  {/* 교시 라벨 */}
                  <td
                    style={{
                      border: "1px solid #ECEFF1",
                      backgroundColor: "#F7F9FA",
                      color: "#0E4A84",
                      textAlign: "center",
                      verticalAlign: "middle",
                      padding: 4,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{t}교시</div>
                    <div style={{ fontSize: 10, color: "#898C8E" }}>
                      {periodToTimeRange(t, t)}
                    </div>
                  </td>

                  {/* 각 요일 칸 */}
                  {days.map((day) => {
                    const starting = selectedCourses.find(
                      (c) => c.요일 === day && Number(c.시작교시) === t
                    );

                    const covered = selectedCourses.some(
                      (c) =>
                        c.요일 === day &&
                        Number(c.시작교시) < t &&
                        Number(c.종료교시) >= t
                    );

                    if (covered) return null;

                    if (!starting) {
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
                      Number(starting.종료교시) -
                      Number(starting.시작교시) +
                      1;

                    return (
                      <td
                        key={day}
                        rowSpan={span}
                        style={{
                          border: "1px solid #ECEFF1",
                          backgroundColor: getColor(starting),
                          color: "#ffffff",
                          position: "relative",
                          padding: 6,
                          fontSize: 11,
                        }}
                      >
                        {/* 삭제 버튼 (우상단 X) */}
                        <button
                          onClick={() =>
                            removeCourse(starting.id, starting.요일)
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
                            color: "#ffffff",
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                          title="시간표에서 삭제"
                        >
                          ×
                        </button>

                        <div style={{ fontWeight: 700, marginBottom: 2 }}>
                          {starting.교과목명}
                        </div>
                        <div style={{ marginBottom: 2 }}>
                          {starting.교강사 || "-"}
                        </div>
                        <div style={{ fontSize: 10 }}>
                          {starting.요일} {starting.시작교시}~
                          {starting.종료교시}교시
                          <br />
                          {periodToTimeRange(
                            Number(starting.시작교시),
                            Number(starting.종료교시)
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
                          <div>{starting.강의실}</div>
                          <div>
                            {starting.이수구분 || "이수구분 없음"} ·{" "}
                            {starting.학점 ?? 0}학점
                          </div>
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
                        title="클릭하면 목록에서 제거됩니다."
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

        {/* ===== 오른쪽: 검색/목록 ===== */}
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
              onChange={(e) =>
                setFilters((f) => ({ ...f, subject: e.target.value }))
              }
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
              onChange={(e) =>
                setFilters((f) => ({ ...f, professor: e.target.value }))
              }
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
              onChange={(e) =>
                setFilters((f) => ({ ...f, year: e.target.value }))
              }
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
              onChange={(e) =>
                setFilters((f) => ({ ...f, type: e.target.value }))
              }
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
              onChange={(e) =>
                setFilters((f) => ({ ...f, day: e.target.value }))
              }
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

          <select
            value={filters.sort}
            onChange={(e) =>
              setFilters((f) => ({ ...f, sort: e.target.value }))
            }
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

          {/* 검색 버튼 (강제 새로고침용) */}
          <button
            onClick={doSearchCourses}
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

          {/* 강의 목록 */}
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
      </div>
    </div>
  );
}

export default Timetable;
