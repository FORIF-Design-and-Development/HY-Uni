import { Router } from "express";
import passport from "../config/passport"; // 설정된 passport 가져오기
import {
  checkAuthStatus,
  logout,
  updateUserDetails,
} from "../controllers/auth.controller";

const router = Router();

//--- 1. 구글 로그인 시작 ---
// (GET) /api/auth/google
// 이 주소로 접근하면 구글 로그인 페이지로 리디렉션됩니다.
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"], // 구글에서 '프로필'과 '이메일' 정보를 요청
  })
);

//--- 2. 구글 로그인 콜백 ---
// (GET) /api/auth/google/callback
// 구글 로그인이 성공하면 구글이 이 주소로 리디렉션시킵니다.
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "http://localhost:5173/?login=failed", //  실패 시 React 앱으로 리디렉션
  }),
  (req, res) => {
    // ⭐️ 로그인 성공!
    // passport.ts의 done(null, user)가 실행됨.
    // 세션이 생성되고 쿠키가 브라우저에 저장됨.
    // ⭐️ 성공 시 React 앱의 메인 페이지로 리디렉션
    res.redirect("http://localhost:5173/");
  }
);

//--- 3. (나중에 추가) 네이버, 카카오 ---
// router.get('/naver', ...);
// router.get('/naver/callback', ...);

//--- 4. 로그인 상태 확인 (웹 앱용) ---
// (GET) /api/auth/me
router.get("/me", checkAuthStatus);

//--- 5. 로그아웃 ---
// (POST) /api/auth/logout
router.post("/logout", logout);

//--- 6. 신규 회원 추가 정보 입력 ---
// (POST) /api/auth/update-details
router.post("/update-details", updateUserDetails);

export default router;
