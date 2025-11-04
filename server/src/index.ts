import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session"; // ⭐️ 세션 추가
import passport from "./config/passport"; // ⭐️ Passport 설정 가져오기
import apiRouter from "./routes";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// 1. CORS 설정 (⭐️ 중요: 쿠키 교환을 위해 origin과 credentials 설정)
app.use(
  cors({
    origin: "http://localhost:5173", // ⭐️ React 앱 주소
    credentials: true, // ⭐️ 쿠키 허용
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. ⭐️ Express 세션 설정 (Passport보다 먼저!)
app.use(
  session({
    secret: process.env.SESSION_SECRET as string, // .env의 세션 비밀 키
    resave: false,
    saveUninitialized: false, // 로그인한 사용자만 세션 저장
    cookie: {
      httpOnly: true, // JS에서 쿠키 접근 불가
      secure: false, // 🚨 개발 환경에서는 false (https 아님)
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7일
    },
  })
);

// 3. ⭐️ Passport 미들웨어 초기화
app.use(passport.initialize());
app.use(passport.session()); // 세션과 Passport 연결

// 4. API 라우터 연결
app.use("/api", apiRouter);

// 서버 실행
app.listen(port, () => {
  console.log(`🚀 API 서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
