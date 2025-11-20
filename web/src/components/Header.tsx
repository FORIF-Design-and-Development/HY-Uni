import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* 로고 */}
        <Link
          to="/"
          className="text-2xl font-bold text-indigo-600 flex items-center gap-2"
        >
          🏫 HY-Uni
        </Link>

        {/* 네비게이션 메뉴 */}
        <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-600">
          <Link to="/" className="hover:text-indigo-600 transition">
            대시보드
          </Link>
          <Link
            to="/campus/notice"
            className="hover:text-indigo-600 transition"
          >
            공지사항
          </Link>
          <Link to="/community" className="hover:text-indigo-600 transition">
            커뮤니티
          </Link>
        </nav>

        {/* 우측 로그인 버튼 (예시) */}
        <div>
          <button className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition">
            로그인
          </button>
        </div>
      </div>
    </header>
  );
}
