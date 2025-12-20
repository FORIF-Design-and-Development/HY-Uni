import { api } from "../axios";

export const timetablesetsAPI = {
  getAllSets: () => api.get("/timetablesets"),
  createSet: (name: string) => api.post("/timetablesets", { name }),
  deleteSet: (id: number) => api.delete(`/timetablesets/${id}`),
};
