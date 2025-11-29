import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import FindEmailTest from "./pages/auth/FindEmailTest.tsx";
import LoginTest from "./pages/auth/LoginTest";
import RegisterTest from "./pages/auth/RegisterTest";
import ResetPasswordTest from "./pages/auth/ResetPasswordTest.tsx";
import { CafeteriaPage } from "./pages/campus/CafeteriaPage.tsx"; // ✅ 추가
import NoticePage from "./pages/campus/NoticePage.tsx";
import ReviewPage from "./pages/campus/ReviewPage";
import Timetable from "./pages/campus/TimetablePage.tsx";

export default function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">dashboard</Link>
      </nav>
      <Routes>
        <Route path="/register" element={<RegisterTest/>}/>
        <Route path="/login" element={<LoginTest />}/>
        <Route path="/test/find-email" element={<FindEmailTest />} />
        <Route path="/test/reset-password" element={<ResetPasswordTest />} />
        <Route path="/timetable" element={<Timetable />} />
        <Route index element={<DashboardPage />} />
        <Route path="/" element={<Navigate to="/campus/notice" replace />} />
        <Route path="/campus/notices" element={<NoticePage />} />
        <Route path="/campus/cafeteria" element={<CafeteriaPage />} /> {/* ✅ 추가 */}
        <Route path="/reviews/:courseId" element={<ReviewPage />} />
      </Routes>
    </BrowserRouter>
  );
}