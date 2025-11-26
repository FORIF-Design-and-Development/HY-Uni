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
  removeCourse: (id: number, day: string, start: number, end: number) => void;
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
      set({ selectedSet: data[0].timetable_list_id });
      await get().loadTimetable(data[0].timetable_list_id);
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
        교과목명: r.course_name,
        교강사: r.professor,
        요일: r.day,
        시작교시: r.start_time,
        종료교시: r.end_time,
        강의실: r.location,
        학점: r.credit,
        이수구분: r.major_division,
        권장학년: r.required_grade,
      }))
    );

    const complete = merged.filter((c) => c.day && c.start_time);
    const incomplete = merged.filter((c) => !c.day || !c.start_time);

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
    if (!course.day || !course.start_time) {
      // 시간정보 없는 강의는 미지정 영역에 표시
      set((state) => ({
        incompleteCourses: [...state.incompleteCourses, course],
        selectedCourses: [...state.selectedCourses, course],
      }));
      return;
    }

    set((state) => ({
      selectedCourses: [...state.selectedCourses, course],
    }));
  },

  removeCourse: (course_id, day, start, end) =>
  set((state) => ({
    selectedCourses: state.selectedCourses.filter(
      (c) =>
        !(
          c.course_id === course_id &&
          c.day === day &&
          Number(c.start_time) >= Number(start) &&
          Number(c.end_time) <= Number(end)
        )
    ),
  })),



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
        courseId: c.course_id,
        day: c.day,
        start: c.start_time,
        end: c.end_time,
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
    if (a.course_name !== b.course_name)
      return a.course_name.localeCompare(b.course_name);
    if (a.professor !== b.professor)
      return a.professor.localeCompare(b.professor);
    if (a.day !== b.day)
      return (DAY_ORDER[a.day] || 99) - (DAY_ORDER[b.day] || 99);
    return Number(a.start_time) - Number(b.start_time);
  });

  const merged: any[] = [];
  let cur: any = null;

  for (const r of sorted) {
    if (
      cur &&
      cur.course_name === r.course_name &&
      cur.professor === r.professor &&
      cur.day === r.day &&
      Number(cur.end_time) === Number(r.start_time)
    ) {
      cur.end_time = r.end_time;
    } else {
      cur = { ...r };
      merged.push(cur);
    }
  }
  return merged;
}

if (typeof window !== "undefined") {
  (window as any).useTimetableStore = useTimetableStore;
}

