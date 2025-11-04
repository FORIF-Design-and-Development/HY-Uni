import { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { User, checkUserStatus } from "./api/apiClient";

// 페이지 컴포넌트 임포트
import HomePage from "./pages/HomePage";
import BoardPage from "./pages/BoardPage";
import PostPage from "./pages/PostPage";
import AdditionalInfoPage from "./pages/AdditionalInfoPage"; // ⭐️ 신규
import Sidebar from "./components/Sidebar";
import "./style.css";

// 1. ⭐️ 인증 컨텍스트(Context) 생성
// 앱 전역에서 사용자 정보(user)와 로딩 상태(authLoading)를 공유
interface AuthContextType {
  user: User | null;
  authLoading: boolean;
  setUser: (user: User | null) => void;
}
export const AuthContext = createContext<AuthContextType | null>(null);
// 간단한 custom hook
export const useAuth = () => useContext(AuthContext) as AuthContextType;

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true); // ⭐️ 인증 로딩 상태

  // 2. 앱 시작 시 로그인 상태 확인
  useEffect(() => {
    checkUserStatus()
      .then((userData) => {
        setUser(userData);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setAuthLoading(false); // 인증 확인 완료
      });
  }, []);

  return (
    <AuthContext.Provider value={{ user, authLoading, setUser }}>
      <BrowserRouter>
        <Sidebar /> {/* 사이드바는 항상 표시 */}
        <main className="app-main">
          {/* 3. ⭐️ 인증 로딩 중일 때는 아무것도 렌더링하지 않음 */}
          {authLoading ? (
            <p>로그인 상태 확인 중...</p>
          ) : (
            <Routes>
              {/* --- 4. ⭐️ 신규 가입자 라우팅 (핵심) --- */}
              {user && !user.department_id ? (
                // 로그인 O, 추가 정보 X -> 무조건 추가 정보 페이지로
                <>
                  <Route
                    path="/signup-details"
                    element={<AdditionalInfoPage />}
                  />
                  <Route
                    path="*"
                    element={<Navigate to="/signup-details" replace />}
                  />
                </>
              ) : (
                // --- 5. 일반 사용자 라우팅 ---
                <>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/board/:slug" element={<BoardPage />} />
                  <Route path="/post/:id" element={<PostPage />} />
                  {/* (방어) 추가 정보 페이지 접근 시 메인으로 */}
                  <Route
                    path="/signup-details"
                    element={<Navigate to="/" replace />}
                  />
                </>
              )}
            </Routes>
          )}
        </main>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
export default App;
