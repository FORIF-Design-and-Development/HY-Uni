import { useAuth } from "../App"; // ⭐️ 전역 인증 상태 가져오기

function HomePage() {
  const { user, authLoading } = useAuth(); // ⭐️ 유저 정보 가져오기

  // ⭐️ 인증 로딩 중일 때는 다른 화면 표시
  if (authLoading) {
    return <p>사용자 정보를 확인 중입니다...</p>;
  }

  return (
    <div>
      {/* ⭐️ 로그인 상태에 따라 다른 환영 메시지 */}
      {user ? (
        <>
          <h2>🏫 {user.nickname}님, 환영합니다!</h2>
          <p>왼쪽 메뉴에서 게시판을 선택해 주세요.</p>
        </>
      ) : (
        <>
          <h2>🏫 우리 학교 커뮤니티에 오신 것을 환영합니다!</h2>
          <p>왼쪽 메뉴에서 Google로 로그인하여 커뮤니티 활동을 시작하세요.</p>
        </>
      )}
      <p>이 커뮤니티는 React(Web)와 Express(Server)로 만들어지고 있습니다.</p>
    </div>
  );
}

export default HomePage;
