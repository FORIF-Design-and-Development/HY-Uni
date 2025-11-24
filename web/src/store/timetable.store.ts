import { create } from "zustand";
import { timetableAPI } from "../api/timetable/timetable.api";

const delay = (ms = 200) => new Promise((res) => setTimeout(res, ms));

interface TimetableState {
  sets: any[];
  selectedSet: number | null;

  courses: any[];
  selectedCourses: any[];
  incompleteCourses: any[];

  filters: {
    subject: string;
    professor: string;
    year: string;
    type: string;
    day: string;
    sort: string;
  };

  loadSets: () => Promise<void>;
  createSet: () => Promise<void>;
  deleteSet: () => Promise<void>;

  loadTimetable: (setId: number) => Promise<void>;
  searchCourses: () => Promise<void>;

  addCourse: (course: any) => void;
  removeCourse: (id: number, day: string) => void;
  removeIncomplete: (index: number) => void;

  saveTimetable: () => Promise<void>;

  setFilters: (name: string, value: string) => void;
  setSelectedSet: (id: number) => void;
}

export const useTimetableStore = create<TimetableState>((set, get) => ({
  sets: [],
  selectedSet: null,

  courses: [],
  selectedCourses: [],
  incompleteCourses: [],

  filters: {
    subject: "",
    professor: "",
    year: "",
    type: "",
    day: "",
    sort: "이름순",
  },

  // ==================== 세트 ====================
  loadSets: async () => {
    const res = await timetableAPI.getSets();
    const data = res.data.data || [];

    set({ sets: data });

    if (data.length > 0 && !get().selectedSet) {
      set({ selectedSet: data[0].set_id });
      await get().loadTimetable(data[0].set_id);
    }
  },

  createSet: async () => {
    const name = window.prompt("새 시간표 이름을 입력하세요");
    if (!name) return;

    await timetableAPI.createSet(name.trim());
    await get().loadSets();
  },

  deleteSet: async () => {
    const id = get().selectedSet;
    if (!id) return;

    await timetableAPI.deleteSet(id);
    set({ selectedCourses: [], incompleteCourses: [] });
    await get().loadSets();
  },

  // ==================== 시간표 ====================
  loadTimetable: async (setId: number) => {
    const res = await timetableAPI.getTimetable(setId);
    const raw = res.data.data || [];

    const merged = mergeByCourseAndDay(
      raw.map((r: any) => ({
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
      }))
    );

    const complete = merged.filter((c) => c.요일 && c.시작교시);
    const incomplete = merged.filter((c) => !c.요일 || !c.시작교시);

    set({ selectedCourses: complete, incompleteCourses: incomplete });
  },

  // ==================== 검색 ====================
  searchCourses: async () => {
    const filters = get().filters;
    const res = await timetableAPI.searchCourses(filters);

    const merged = mergeByCourseAndDay(res.data.data);
    set({ courses: merged });
  },

  // ==================== 추가/삭제 ====================
  addCourse: (course) => {
    if (!course.요일 || !course.시작교시) {
      set((state) => ({
        incompleteCourses: [...state.incompleteCourses, course],
      }));
      return;
    }

    set((state) => ({
      selectedCourses: [...state.selectedCourses, course],
    }));
  },

  removeCourse: (id, day) => {
    set((state) => ({
      selectedCourses: state.selectedCourses.filter(
        (c) => !(c.id === id && c.요일 === day)
      ),
    }));
  },

  removeIncomplete: (idx) => {
    set((state) => ({
      incompleteCourses: state.incompleteCourses.filter((_, i) => i !== idx),
    }));
  },

  // ==================== 저장 ====================
  saveTimetable: async () => {
    const setId = get().selectedSet;
    if (!setId) return;

    await timetableAPI.resetTimetable(setId);

    const all = [...get().selectedCourses, ...get().incompleteCourses];
    for (const c of all) {
      await timetableAPI.saveCourse({
        setId,
        courseId: c.id,
        day: c.요일,
        start: c.시작교시,
        end: c.종료교시,
      });
      await delay(10);
    }

    window.alert("시간표 저장 완료!");
  },

  // ==================== 상태 변경 ====================
  setFilters: (name, value) =>
    set((state) => ({
      filters: { ...state.filters, [name]: value },
    })),

  setSelectedSet: (id: number) => set({ selectedSet: id }),
}));


// ==================== 병합 함수 ====================
const DAY_ORDER: Record<string, number> = { 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };

function mergeByCourseAndDay(rows: any[]): any[] {
  if (!rows || rows.length === 0) return [];
  const sorted = [...rows].sort((a, b) => {
    if (a.교과목명 !== b.교과목명)
      return a.교과목명.localeCompare(b.교과목명);
    if (a.교강사 !== b.교강사)
      return a.교강사.localeCompare(b.교강사);
    if (a.요일 !== b.요일)
      return (DAY_ORDER[a.요일] || 99) - (DAY_ORDER[b.요일] || 99);
    return Number(a.시작교시) - Number(b.시작교시);
  });

  const merged: any[] = [];
  let cur: any = null;

  for (const r of sorted) {
    if (
      cur &&
      cur.교과목명 === r.교과목명 &&
      cur.교강사 === r.교강사 &&
      cur.요일 === r.요일 &&
      Number(cur.종료교시) === Number(r.시작교시)
    ) {
      cur.종료교시 = r.종료교시;
    } else {
      cur = { ...r };
      merged.push(cur);
    }
  }
  return merged;
}
