import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ExamplePage from './pages/ExamplePage';

export default function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/example">예시</Link>
      </nav>
      <Routes>
        <Route path="/example" element={<ExamplePage />} />
      </Routes>
    </BrowserRouter>
  );
}