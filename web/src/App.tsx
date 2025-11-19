import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ExamplePage from './pages/ExamplePage';
import RegisterTest from './pages/auth/RegisterTest';
import LoginTest from './pages/auth/LoginTest';
import Timetable from './pages/timetable/Timetable';

export default function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/example">예시</Link>
      </nav>
      <Routes>
        <Route path="/example" element={<ExamplePage />} />
        <Route path="/register" element={<RegisterTest/>}/>
        <Route path="/login" element={<LoginTest />}/>
        <Route path="/timetable" element={<Timetable />} />
      </Routes>
    </BrowserRouter>
  );
}