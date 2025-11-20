import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import ExamplePage from './pages/ExamplePage';
import LoginTest from './pages/auth/LoginTest';
import RegisterTest from './pages/auth/RegisterTest';
import Timetable from './pages/timetable/Timetable';

export default function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">dashboard</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/example" element={<ExamplePage />} />
        <Route path="/register" element={<RegisterTest/>}/>
        <Route path="/login" element={<LoginTest />}/>
        <Route path="/timetable" element={<Timetable />} />
      </Routes>
    </BrowserRouter>
  );
}