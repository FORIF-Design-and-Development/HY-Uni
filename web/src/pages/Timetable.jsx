import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

// 🕒 0.1초 지연
const delay = (ms = 400) => new Promise((res) => setTimeout(res, ms));

// 🧩 초성검색 변환 함수
const getInitials = (str) => {
  const CHO = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
  const BASE = 44032, INITIAL = 588;
  return Array.from(str || "")
    .map((ch) => {
      const code = ch.charCodeAt(0) - BASE;
      return code >= 0 && code < 11172 ? CHO[Math.floor(code / INITIAL)] : ch;
    })
    .join("");
};

function Timetable() {
  const days = ["월", "화", "수", "목", "금","토"];
  const times = Array.from({ length: 15 }, (_, i) => i + 1);
  const timeLabels = [
    "09:00-10:00","10:00-11:00","11:00-12:00","12:00-13:00","13:00-14:00",
    "14:00-15:00","15:00-16:00","16:00-17:00","17:00-18:00","18:00-19:00",
    "19:00-20:00","20:00-21:00","21:00-22:00","22:00-23:00","23:00-24:00"
  ];

  // ====== 상태 ======
  const [sets, setSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [incompleteCourses, setIncompleteCourses] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [courseColors, setCourseColors] = useState({});

  // 🎨 자동랜덤 색상
  const palette = ["#6BA6FF","#74C0FC","#91E0FF","#B5EAEA","#A3D8F4","#89C2D9"];
  const getColor = (course) => {
    if (!course) return "#fff";
    if (courseColors[course.id]) return courseColors[course.id];
    const newColor = palette[Math.floor(Math.random() * palette.length)];
    const updated = { ...courseColors, [course.id]: newColor };
    setCourseColors(updated);
    localStorage.setItem("courseColors", JSON.stringify(updated));
    return newColor;
  };

  // ====== 시간표 세트 관리 ======
  const loadSets = async () => {
    await delay();
    const res = await axios.get("http://localhost:4000/api/timetable-sets");
    setSets(res.data?.data || []);
    if ((res.data?.data || []).length > 0 && !selectedSet)
      setSelectedSet(res.data.data[0].set_id);
  };

  const createSet = async () => {
    const name = prompt("새 시간표 이름 입력 (예: 2025-2)");
    if (!name) return;
    await delay();
    await axios.post("http://localhost:4000/api/timetable-sets", { name });
    await loadSets();
  };

  const deleteSet = async () => {
    if (!selectedSet) return alert("삭제할 세트를 선택하세요.");
    const target = sets.find((s) => s.set_id === selectedSet);
    if (target?.name === "기본 시간표") return alert("❌ 기본 시간표는 삭제할 수 없습니다.");
    if (!window.confirm(`🗑️ '${target.name}' 세트를 삭제하시겠습니까?`)) return;
    await delay();
    await axios.delete(`http://localhost:4000/api/timetable-sets/${selectedSet}`);
    alert(`🗑️ '${target.name}' 세트가 삭제되었습니다.`);
    setSelectedCourses([]);
    setIncompleteCourses([]);
    await loadSets();
  };

  const loadTimetable = async (setId) => {
    await delay();
    const res = await axios.get(`http://localhost:4000/api/timetable?setId=${setId}`);
    const data = res.data?.data || res.data || [];
    const complete = [], incomplete = [];
    for (const c of data) {
      if (!c.요일 || !c.시작교시 || !c.종료교시 || c.요일 === "미지정" || c.강의실?.includes("미지정"))
        incomplete.push(c);
      else complete.push(c);
    }
    setSelectedCourses(complete);
    setIncompleteCourses(incomplete);
  };

  useEffect(() => { loadSets(); }, []);
  useEffect(() => { if (selectedSet) loadTimetable(selectedSet); }, [selectedSet]);

  // ✅ 디버깅 로그
  useEffect(() => {
    console.log("✅ sets:", sets);
    console.log("✅ selectedSet:", selectedSet);
  }, [sets, selectedSet]);

  // ====== 검색 관련 ======
const [filters, setFilters] = useState({
  subject: "",
  professor: "",
  year: "",
  type: "",
  day: "",
});
const [sortOption, setSortOption] = useState("이름순");

// 🔍 필터 변경 시 자동 검색 (0.2초 지연)
useEffect(() => {
  const handler = setTimeout(() => searchCourses(), 200);
  return () => clearTimeout(handler);
}, [filters, sortOption]);

// ✅ 검색 함수 (모든 필터 반영)
const searchCourses = async () => {
  try {
    const res = await axios.get("http://localhost:4000/api/courses", {
      params: {
        subject: filters.subject || "",
        professor: filters.professor || "",
        year: filters.year || "",
        type: filters.type || "",
        day: filters.day || "",
        sort: sortOption || "이름순",
      },
    });

    const raw = res.data?.data || res.data || [];
    const parsed = raw.map((r) => ({
      id: r.id,
      교과목명: r.교과목명 || r.name || r.course_name || "",
      교강사: r.교강사 || r.professor || "",
      요일: r.요일 || r.day || "",
      시작교시: Number(r.시작교시 || r.start_period || 0),
      종료교시: Number(r.종료교시 || r.end_period || 0),
      강의실: r.강의실 || r.room || "미지정",
      학점: Number(r.학점 || r.credit || 0),
      학년: r.학년 || "",
      이수구분: r.이수구분 || "",
      시간표시:
        r.요일 && r.시작교시 && r.종료교시
          ? `${r.요일} ${r.시작교시}~${r.종료교시}교시`
          : "미지정",
    }));
    setCourses(parsed);
  } catch (err) {
    console.error("❌ 강의 검색 오류:", err);
  }
};

  // ====== 강의 추가/삭제/저장 ======
  const addCourse = (course) => {
    const isIncomplete = !course.요일 || !course.시작교시 || !course.종료교시;
    if (isIncomplete) {
      setIncompleteCourses((prev) => [...prev, course]);
      return alert(`✅ "${course.교과목명}" 미지정 강의 추가`);
    }
    if (selectedCourses.find((c) => c.id === course.id)) return;
    const overlap = selectedCourses.find(
      (c) =>
        c.요일 === course.요일 &&
        ((course.시작교시 >= c.시작교시 && course.시작교시 <= c.종료교시) ||
         (course.종료교시 >= c.시작교시 && course.종료교시 <= c.종료교시))
    );
    if (overlap) return alert(`⚠️ "${course.교과목명}"은(는) "${overlap.교과목명}"과 시간이 겹칩니다.`);
    setSelectedCourses((prev) => [...prev, course]);
  };

  const deleteIncomplete = (i) => {
    if (window.confirm("이 강의를 삭제하시겠습니까?")) {
      setIncompleteCourses((prev) => prev.filter((_, idx) => idx !== i));
    }
  };

  const saveTimetable = async () => {
    if (!selectedSet) return alert("세트를 먼저 선택하세요.");
    await delay();
    await axios.delete(`http://localhost:4000/api/timetable/reset?setId=${selectedSet}`);
    for (const c of [...selectedCourses, ...incompleteCourses]) {
      await delay();
      await axios.post("http://localhost:4000/api/timetable", {
        courseId: c.id,
        setId: selectedSet,
      });
    }
    alert("💾 저장 완료!");
  };

  // ====== UI ======
  return (
    <div style={{
      padding: "20px 30px",
      fontFamily: "Pretendard, sans-serif",
      backgroundColor: "#f8fbff",
      color: "#002C5F"
    }}>
      <div style={{
        textAlign: "center",
        background: "#E9F2FF",
        padding: "15px 0",
        marginBottom: "25px",
        borderRadius: "12px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.08)"
      }}>
        <h1 style={{ margin: 0, color: "#0046AD" }}>
          📘 {sets.find((s) => s.set_id === selectedSet)?.name || "시간표 미선택"}
        </h1>
      </div>

      <div style={{ display: "flex", gap: 30 }}>
        {/* ===== 왼쪽: 시간표 ===== */}
        <div style={{
          flex: 1.7,
          background: "white",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
        }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 15 }}>
            <select
              value={selectedSet || ""}
              onChange={(e) => setSelectedSet(Number(e.target.value))}
              style={{ padding: 6, borderRadius: 6, border: "1px solid #A8C8F0" }}
            >
              {sets.map((s) => (
                <option key={s.set_id} value={s.set_id}>{s.name}</option>
              ))}
            </select>
            <button onClick={createSet} style={{ background: "#1E88E5", color: "white", border: "none", borderRadius: 6, padding: "6px 10px" }}>➕ 새 세트</button>
            <button onClick={deleteSet} style={{ background: "#E53935", color: "white", border: "none", borderRadius: 6, padding: "6px 10px" }}>🗑 삭제</button>
            <button onClick={saveTimetable} style={{ background: "#43A047", color: "white", border: "none", borderRadius: 6, padding: "6px 10px", marginLeft: "auto" }}>💾 저장</button>
          </div>

          <table border="1" style={{
            borderCollapse: "collapse",
            width: "100%",
            textAlign: "center",
            fontSize: "14px",
            border: "1px solid #CCE0FF",
            tableLayout : "fixed"
          }}>
            <thead style={{ background: "#D9E9FF" }}>
              <tr>
                <th>교시</th>
                {days.map((d) => <th key={d}>{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {times.map((t, i) => (
                <tr key={t}>
                  <td style={{ width: "80px", background: "#F3F8FF", color: "#0046AD" }}>
                    {t}교시
                    <div style={{ fontSize: 11 }}>{timeLabels[i]}</div>
                  </td>
                  {days.map((day) => {
                    const startingCourse = selectedCourses.find((c) => c.요일 === day && c.시작교시 === t);
                    const isCovered = selectedCourses.some((c) => c.요일 === day && c.시작교시 < t && c.종료교시 >= t);
                    if (isCovered) return null;

                    if (!startingCourse) {
                      return <td key={day} style={{ border: "1px solid #DCE8FF", backgroundColor: "white" }} />;
                    }

                    const span = startingCourse.종료교시 - startingCourse.시작교시 + 1;

                    return (
                      <td
                        key={day}
                        rowSpan={span}
                        style={{
                          backgroundColor: getColor(startingCourse),
                          border: "1px solid #DCE8FF",
                          verticalAlign: "middle",
                          textAlign: "center",
                          padding: "6px",
                        }}
                      >
                        <div style={{ fontSize: 12, color: "#002C5F", lineHeight: "1.4em" }}>
                          <b style={{ fontSize: 13 }}>{startingCourse.교과목명}</b><br />
                          <span style={{ fontSize: 11 }}>{startingCourse.교강사}</span><br />
                          <small>{startingCourse.시작교시}~{startingCourse.종료교시}교시</small>
                          <div style={{ marginTop: 4, fontSize: 11, background: "rgba(255,255,255,0.6)", borderRadius: 6, padding: "2px 4px" }}>
                            <div>{startingCourse.강의실 || "미지정"}</div>
                            <div>{startingCourse.이수구분 || "이수구분 없음"}</div>
                            <div>{startingCourse.학점 || "0"}학점</div>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}

              <tr>
                <td colSpan={days.length + 1} style={{ background: "#F0F6FF", padding: 10, borderTop: "2px solid #A8C8F0" }}>
                  <b>시간·장소 비지정 강의</b>
                  <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {incompleteCourses.length === 0 ? (
                      <span style={{ color: "#777" }}>-</span>
                    ) : (
                      incompleteCourses.map((c, i) => (
                        <span
                          key={i}
                          onClick={() => deleteIncomplete(i)}
                          style={{
                            padding: "6px 8px",
                            borderRadius: 8,
                            background: "#fff",
                            border: "1px solid #BBD5FF",
                            cursor: "pointer"
                          }}
                        >
                          {c.교과목명} ({c.교강사})
                        </span>
                      ))
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ===== 오른쪽: 검색 ===== */}
        <div style={{
          flex: 0.8,
          background: "white",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
        }}>
          <h3 style={{ color: "#0046AD" }}>🔍 강의 검색</h3>

          {/* 🔍 검색창 */}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <input
              value={filters.subject || ""}
              onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
              placeholder="교과목명"
              style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #A8C8F0" }}
            />
            <input
              value={filters.professor || ""}
              onChange={(e) => setFilters({ ...filters, professor: e.target.value })}
              placeholder="교수명"
              style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #A8C8F0" }}
            />
            <button
              onClick={() => searchCourses()}
              style={{ background: "#1E88E5", color: "white", border: "none", borderRadius: 6, padding: "8px 10px", cursor: "pointer" }}
            >
              🔍
            </button>
          </div>

          {/* 필터 */}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <select value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })} style={{ flex: 1, padding: 6, borderRadius: 6 }}>
              <option value="">전체 학년</option>
              <option value="1">1학년</option>
              <option value="2">2학년</option>
              <option value="3">3학년</option>
              <option value="4">4학년</option>
            </select>

            <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} style={{ flex: 1, padding: 6, borderRadius: 6 }}>
              <option value="">이수구분</option>
              <option value="전공필수">전공필수</option>
              <option value="전공선택">전공선택</option>
              <option value="교양">교양</option>
            </select>

            <select value={filters.day} onChange={(e) => setFilters({ ...filters, day: e.target.value })} style={{ flex: 1, padding: 6, borderRadius: 6 }}>
              <option value="">전체 요일</option>
              <option value="월">월</option>
              <option value="화">화</option>
              <option value="수">수</option>
              <option value="목">목</option>
              <option value="금">금</option>
              <option value="토">토</option>
            </select>
          </div>

          <div style={{ marginTop: 8 }}>
            <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} style={{ width: "100%", padding: 6, borderRadius: 6 }}>
              <option value="이름순">이름순</option>
              <option value="학점순">학점순</option>
              <option value="요일순">요일순</option>
            </select>
          </div>

          <div style={{ maxHeight: 420, overflowY: "auto", marginTop: 10 }}>
            {courses.length === 0 ? (
              <p style={{ color: "#777", textAlign: "center" }}>검색 결과 없음</p>
            ) : (
              courses.map((c) => (
                <div key={c.id} style={{
                  border: "1px solid #C6DAF7",
                  background: "#F8FBFF",
                  marginBottom: 6,
                  padding: 10,
                  borderRadius: 8,
                }}>
                  <b>{c.교과목명}</b> ({c.교강사})<br />
                  {c.시간표시} | {c.학점}학점<br />
                  <small>{c.이수구분} · {c.학년 || "학년 정보 없음"}</small><br />
                  <button onClick={() => addCourse(c)} style={{
                    marginTop: 5,
                    background: "#2196F3",
                    color: "white",
                    border: "none",
                    borderRadius: 5,
                    padding: "4px 8px",
                    cursor: "pointer",
                  }}>
                    ➕ 추가
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Timetable;
