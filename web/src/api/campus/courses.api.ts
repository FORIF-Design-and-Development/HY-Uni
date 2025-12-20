import { api } from "../axios"; 

export async function getCourses(params: {
  subject?: string;
  professor?: string;
  year?: string;
  type?: string;
  day?: string;
  sort?: string;
}) {

  const res = await api.get("/courses", { params });
  return res.data;
}
