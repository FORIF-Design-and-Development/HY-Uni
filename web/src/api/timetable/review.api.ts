import axios from "axios";
import { API_BASE_URL } from "../timetable/timetable.api";

export const reviewAPI = {
  getReviews: (courseId: number) =>
    axios.get(`${API_BASE_URL}/reviews/${courseId}`),

  createReview: (data: any) =>
    axios.post(`${API_BASE_URL}/reviews`, data),
};
