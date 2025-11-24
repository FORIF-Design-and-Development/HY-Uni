import axios from "axios";

export async function getCourses(params: {
  subject?: string;
  professor?: string;
  year?: string;
  type?: string;
  day?: string;
  sort?: string;
}) {
  const res = await axios.get("/api/courses", { params });
  return res.data;
}
