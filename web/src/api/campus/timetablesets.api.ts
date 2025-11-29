import { api } from "../axios";

export async function getAllSets() {
  const res = await api.get("/timetablesets");
  return res.data;
}

export async function createSet(name: string) {
  const res = await api.post("/timetablesets", { name });
  return res.data;
}

export async function deleteSet(id: number) {
  const res = await api.delete(`/timetablesets/${id}`);
  return res.data;
}
