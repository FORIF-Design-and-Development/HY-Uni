import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getBoards, Board, logoutUser } from "../api/apiClient";
import { useAuth } from "../App"; // ⭐️ 전역 인증 상태 가져오기
import "./Sidebar.css";

// ⭐️ 구글 로그인 백엔드 API 주소
const GOOGLE_LOGIN_URL = "http://localhost:3000/api/auth/google";

function Sidebar() {
  const [boards, setBoards] = useState<Board[]>([]);
  const { user, setUser } = useAuth(); // ⭐️ 전역 user 상태
  const navigate = useNavigate();

  // 1. 게시판 목록 불러오기 (기존과 동일)
  useEffect(() => {
    getBoards()
      .then((data) => setBoards(data))
      .catch((err) => console.error("게시판 목록 로딩 실패:", err));
  }, []);

  // 2. ⭐️ 로그아웃 핸들러
  const handleLogout = async () => {
    try {
      await logoutUser();
      setUser(null); // 전역 상태 업데이트
      navigate("/"); // 메인 페이지로 이동
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }
  };

  return (
    <nav className="sidebar">
      {/* ⭐️ 상단: 로그인 상태 표시 */}
      <div className="sidebar-profile">
        {user ? (
          // 로그인 된 경우
          <>
            <div className="welcome-msg">👋 {user.nickname}님</div>
            {/* department_id가 없으면 '준회원' 등으로 표시 가능 */}
            <button onClick={handleLogout} className="logout-btn">
              로그아웃
            </button>
          </>
        ) : (
          // 로그인 안된 경우
          <>
            {/* ⭐️ (중요) axios가 아닌 <a> 태그로 직접 백엔드 API 호출 */}
            <a href={GOOGLE_LOGIN_URL} className="login-btn google">
              Google로 로그인
            </a>
            {/* <a href="..." className="login-btn naver">Naver로 로그인</a> */}
            {/* <a href="..." className="login-btn kakao">Kakao로 로그인</a> */}
          </>
        )}
      </div>

      {/* ⭐️ 하단: 게시판 목록 (기존과 동일) */}
      <h2 className="sidebar-title">
        <Link to="/">📚 게시판</Link>
      </h2>
      <ul>
        {boards.map((board) => (
          <li key={board.id}>
            <Link to={`/board/${board.slug}`}>{board.name}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Sidebar;
