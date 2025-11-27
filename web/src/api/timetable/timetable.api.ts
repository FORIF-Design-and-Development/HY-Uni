import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export const timetableAPI = {
  getSets: () => axios.get(`${API_BASE_URL}/timetablesets`),
  createSet: (name: string) => axios.post(`${API_BASE_URL}/timetablesets`, { name }),
  deleteSet: (id: number) => axios.delete(`${API_BASE_URL}/timetablesets/${id}`),

  getTimetable: (setId: number) =>
    axios.get(`${API_BASE_URL}/timetable`, { params: { setId } }),

  resetTimetable: (setId: number) =>
    axios.delete(`${API_BASE_URL}/timetable/reset`, { params: { setId } }),

  saveCourse: (data: any) => axios.post(`${API_BASE_URL}/timetable`, data),

  searchCourses: (filters: any) =>
    axios.get(`${API_BASE_URL}/courses`, { params: filters }),
};
