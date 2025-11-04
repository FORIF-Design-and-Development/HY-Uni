import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import pool from "./db"; // DB 풀

// 1. Passport 전략 설정 (구글)
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      // ⭐️ 백엔드 API 주소 기준
      callbackURL: "http://localhost:3000/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      // profile에서 사용자 정보 (구글 ID, 이메일, 이름)를 받음
      const { id: google_id, displayName: nickname, emails } = profile;
      const email = emails?.[0]?.value;

      if (!email) {
        return done(
          new Error("Google 계정에서 이메일을 가져올 수 없습니다."),
          false
        );
      }

      try {
        // 1. DB에서 기존 유저 찾기
        const [existingUsers] = await pool.query(
          "SELECT * FROM users WHERE google_id = ? OR email = ?",
          [google_id, email]
        );
        const existingUser = (existingUsers as any[])[0];

        if (existingUser) {
          // 2-1. 기존 유저가 있으면 로그인 성공
          return done(null, existingUser);
        }

        // 2-2. 기존 유저가 없으면 새로 생성
        const [newUserResult] = await pool.query(
          "INSERT INTO users (google_id, email, nickname) VALUES (?, ?, ?)",
          [google_id, email, nickname]
        );

        const newUserId = (newUserResult as any).insertId;

        const [newUsers] = await pool.query(
          "SELECT * FROM users WHERE id = ?",
          [newUserId]
        );

        // 새로 생성된 유저 정보로 로그인 성공
        return done(null, (newUsers as any[])[0]);
      } catch (err) {
        return done(err as Error, false);
      }
    }
  )
);

// 2. 세션에 사용자 ID 저장
passport.serializeUser((user: any, done) => {
  done(null, user.id); // 세션에는 user.id만 저장
});

// 3. 세션에서 사용자 정보 복원
passport.deserializeUser(async (id: number, done) => {
  try {
    // DB에서 id로 전체 사용자 정보를 찾아 req.user에 저장
    const [users] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
    const user = (users as any[])[0];
    done(null, user || false); // 유저가 없으면 false
  } catch (err) {
    done(err, false);
  }
});

export default passport;
