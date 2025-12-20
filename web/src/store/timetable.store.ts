import { create } from "zustand";
import { timetableAPI } from "../api/campus/timetable.api";

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

  defaultInitialized: boolean;

  loadSets: () => Promise<void>;
  createSet: (name: string) => Promise<void>;
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

  defaultInitialized: false,

  // ==================== 세트 ====================
  loadSets: async () => {
    const state = get();

    // 1) 최초 진입 시 한번만 실행하도록
    if (state.defaultInitialized) {
      const res = await timetableAPI.getSets();
      const data = res.data.data || [];
      set({ sets: data });
      return;
    }

    // 2) 세트 조회
    const res = await timetableAPI.getSets();
    let data = res.data.data || [];

    // 3) 세트가 없는 경우 → 기본 세트 자동생성
    if (data.length === 0) {
      await timetableAPI.createSet("2025-2");

      const reload = await timetableAPI.getSets();
      data = reload.data.data || [];
    }

    // 4) 상태 저장 + 플래그 ON
    set({ sets: data, defaultInitialized: true });

    // 5) 첫 세트 자동 선택
    if (data.length > 0 && !state.selectedSet) {
      const first = data[0].timetable_list_id;
      set({ selectedSet: first });
      await get().loadTimetable(first);
    }
  },


  createSet: async (name: string) => {
    await timetableAPI.createSet(name);
    await get().loadSets();
  },

  createSetWithPrompt: async () => {
    const name = window.prompt("새 시간표 이름을 입력하세요");
    if (!name) return;
    await get().createSet(name.trim());
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
    console.log("🔹 loadTimetable called with", setId);

    const res = await timetableAPI.getTimetable(setId);
    const raw = res.data.data || [];

    console.log("🔹 raw from API", raw);

    const normalized = raw.map((r) => {
    const normalize = (v: any) => {
      if (v === null || v === undefined) return null;
      if (typeof v === "number") return v;
      if (typeof v === "string") return Number(v);
      return null;
    };

    // 커스텀
    if (r.custom_schedule_id) {
      return {
        id: r.custom_schedule_id,
        course_id: null,
        title: r.custom_title,
        day: r.custom_day,
        start_time: normalize(r.custom_start),
        end_time: normalize(r.custom_end),
        location: r.custom_location,
        is_custom: true,
      };
    }

    // 정규
    return {
      id: r.course_id,
      course_id: r.course_id,
      course_name: r.course_name,
      professor: r.professor,
      location: r.location,
      credit: r.credit,
      major_division: r.major_division,
      grade: r.required_grade,
      day: r.day,
      start_time: normalize(r.start_time),
      end_time: normalize(r.end_time),
      is_custom: false,
    };
  });

    const complete = normalized.filter(
      (c) =>
        c.day &&
        c.start_time != null &&
        c.end_time != null &&
        !isNaN(Number(c.start_time)) &&
        !isNaN(Number(c.end_time))
    );

    const incomplete = normalized.filter(
      (c) =>
        !c.day ||
        c.start_time == null ||
        c.end_time == null ||
        c.start_time === "-" ||
        c.end_time === "-"
    );

    console.log("🔹 complete", complete);
    console.log("🔹 incomplete", incomplete);

    set({
      selectedCourses: complete,
      incompleteCourses: incomplete,
    });
  },


  // ==================== 검색 ====================
    searchCourses: async () => {
    const filters = get().filters;
    const res = await timetableAPI.searchCourses(filters);
    set({ courses: res.data.data });
  },


  // ==================== 추가/삭제 ====================
  addCourse: (course) => {
    if (!course.day || !course.start_time) {
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

    // course_id 없는 강의 제외
    const valid = all.filter(c => c.course_id);

    for (const c of valid) {
      await timetableAPI.saveCourse({
        setId,
        courseId: c.course_id,
        day: c.day ?? null,
        start: c.start_time ?? null,
        end: c.end_time ?? null,
      });
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
