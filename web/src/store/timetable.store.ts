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

  // ✅ [추가] store에 구현되어 있는데 interface에 없어서 TS 에러 발생 → 선언 추가
  createSetWithPrompt: () => Promise<void>;

  loadTimetable: (setId: number) => Promise<void>;
  searchCourses: () => Promise<void>;

  addCourse: (course: any) => void;
  removeCourse: (id: number, day: string, start: number, end: number) => void;
  removeIncomplete: (index: number) => void;

  saveTimetable: () => Promise<void>;

  setFilters: (name: string, value: string) => void;
  setSelectedSet: (id: number) => void;
}

// ✅ [추가] timeToSlot을 여러 곳에서 재사용하려고 store 밖에 헬퍼로 분리
// - 교시 숫자(1, 2.5 등) 또는 TIME 문자열("09:00:00")을 30분 슬롯(0~)으로 통일
const timeToSlot = (periodOrTime: number | string | null) => {
  if (periodOrTime == null) return null;

  if (typeof periodOrTime === "number") {
    if (isNaN(periodOrTime)) return null;
    return Math.round((periodOrTime - 1) * 2);
  }

  if (typeof periodOrTime === "string") {
    if (periodOrTime === "-" || periodOrTime.trim() === "") return null;
    if (!periodOrTime.includes(":")) return null;

    const [hStr, mStr] = periodOrTime.split(":");
    const h = Number(hStr);
    const m = Number(mStr);
    if (isNaN(h) || isNaN(m)) return null;

    return (h - 9) * 2 + (m >= 30 ? 1 : 0);
  }

  return null;
};

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

    const normalized = raw.map((r: any) => {
      // ✅ [추가] 값 정규화 함수 (null/undefined/빈값 처리 + TIME 문자열 유지)
      const normalize = (v: any) => {
        if (v === null || v === undefined) return null;
        if (typeof v === "number") return v;

        // ✅ [추가] TIME 문자열("09:00:00")은 Number로 바꾸면 NaN이니까 그대로 유지
        if (typeof v === "string") {
          if (v === "-" || v.trim() === "") return null;
          if (v.includes(":")) return v; // ✅ TIME 문자열 유지
          const n = Number(v);
          return Number.isFinite(n) ? n : null;
        }

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

    const complete = normalized.filter((c: any) => {
      const s = timeToSlot(c.start_time);
      const e = timeToSlot(c.end_time);

      return c.day && c.day !== "-" && s != null && e != null && e > s;
    });

    const incomplete = normalized.filter((c: any) => {
      const s = timeToSlot(c.start_time);
      const e = timeToSlot(c.end_time);

      return !c.day || c.day === "-" || s == null || e == null || e <= s;
    });

    // ✅ [추가] loadTimetable 결과를 state에 반영해야 화면이 갱신됨
    set({
      selectedSet: setId, // ✅ [추가] 현재 로드한 세트로 동기화
      selectedCourses: mergeByCourseAndDay(complete), // ✅ [추가] 연속 시간 병합
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
      }));
      return;
    }

    set((state) => ({
      selectedCourses: [...state.selectedCourses, course],
    }));
  },

  removeCourse: (course_id, day, start, end) =>
    set((state) => ({
      selectedCourses: state.selectedCourses.filter((c) => {
        // ✅ [추가] start/end/c.start_time/c.end_time이 TIME 문자열이어도 삭제가 되도록 슬롯 비교
        const cStart = timeToSlot(c.start_time);
        const cEnd = timeToSlot(c.end_time);
        const startSlot = timeToSlot(start as any);
        const endSlot = timeToSlot(end as any);

        // ✅ [추가] 변환 실패 시 안전하게 삭제 대상에서 제외(= 남김)
        if (cStart == null || cEnd == null || startSlot == null || endSlot == null) return true;

        return !(
          c.course_id === course_id &&
          c.day === day &&
          cStart >= startSlot &&
          cEnd <= endSlot
        );
      }),
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
    const valid = all.filter((c) => c.course_id);

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
    if (a.course_name !== b.course_name) return a.course_name.localeCompare(b.course_name);
    if (a.professor !== b.professor) return a.professor.localeCompare(b.professor);
    if (a.day !== b.day) return (DAY_ORDER[a.day] || 99) - (DAY_ORDER[b.day] || 99);

    // ✅ [수정] Number()는 TIME 문자열에서 NaN → 슬롯 기반 정렬로 변경
    return (timeToSlot(a.start_time) ?? 9999) - (timeToSlot(b.start_time) ?? 9999);
  });

  const merged: any[] = [];
  let cur: any = null;

  for (const r of sorted) {
    if (
      cur &&
      cur.course_name === r.course_name &&
      cur.professor === r.professor &&
      cur.day === r.day &&
      // ✅ [수정] Number()는 TIME 문자열에서 NaN → 슬롯 비교로 변경
      (timeToSlot(cur.end_time) ?? -1) === (timeToSlot(r.start_time) ?? -2)
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
