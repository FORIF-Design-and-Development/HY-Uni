import { api } from "../axios";

  //   시간표 세트 API
export const timetableAPI = {
  getSets: () => api.get("/timetablesets"),
  createSet: (name: string) => api.post("/timetablesets", { name }),
  deleteSet: (id: number) => api.delete(`/timetablesets/${id}`),

  //   시간표 (강의 배치)
  getTimetable: (setId: number) => api.get("/timetable", { params: { setId } }),
  resetTimetable: (setId: number) => api.delete("/timetable/reset", { params: { setId } }),
  saveCourse: (data: any) => api.post("/timetable", data),

  //   강의 검색 (course)
  searchCourses: (filters: any) => api.get("/courses", { params: filters }),
};
