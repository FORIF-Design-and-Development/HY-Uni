import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import RegisterTest from "./pages/auth/RegisterTest";
import LoginTest from "./pages/auth/LoginTest";
import Timetable from "./pages/timetable/Timetable";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import NoticePage from "./pages/campus/NoticePage.tsx";

export default function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/example">예시</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Layout />}></Route>
        <Route path="/register" element={<RegisterTest />} />
        <Route path="/login" element={<LoginTest />} />
        <Route path="/timetable" element={<Timetable />} />
        <Route index element={<DashboardPage />} />
        <Route path="/" element={<Navigate to="/campus/notice" replace />} />
        <Route path="/campus/notices" element={<NoticePage />} />
      </Routes>
    </BrowserRouter>
  );
}
