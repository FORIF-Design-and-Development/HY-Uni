import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import LoginTest from "./pages/auth/LoginTest";
import RegisterTest from "./pages/auth/RegisterTest";
import FindEmailTest from "./pages/auth/FindEmailTest.tsx";
import ResetPasswordTest from "./pages/auth/ResetPasswordTest.tsx";
import NoticePage from "./pages/campus/NoticePage.tsx";
import Timetable from "./pages/timetable/TimetablePage.tsx";
import ReviewPage from "./pages/timetable/ReviewPage";


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
        <Route path="/reviews/:courseId" element={<ReviewPage />} />
      </Routes>
    </BrowserRouter>
  );
}
