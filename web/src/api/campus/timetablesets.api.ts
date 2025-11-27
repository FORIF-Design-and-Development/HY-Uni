import axios from "axios";

export async function getAllSets() {
  const res = await axios.get("/api/timetablesets");
  return res.data;
}

export async function createSet(name: string) {
  const res = await axios.post("/api/timetablesets", { name });
  return res.data;
}

export async function deleteSet(id: number) {
  const res = await axios.delete(`/api/timetablesets/${id}`);
  return res.data;
}
