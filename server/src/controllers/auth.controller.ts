import { Request, Response } from "express";
import pool from "../config/db";

/**
 * ⭐️ (GET) /api/auth/me
 * 현재 로그인된 사용자 정보를 반환합니다. (세션 확인용)
 */
export const checkAuthStatus = (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    // req.user는 passport.deserializeUser가 넣어준 값
    res.json(req.user);
  } else {
    // 로그인되지 않음
    res.status(401).json(null);
  }
};

/**
 * ⭐️ (POST) /api/auth/logout
 * 사용자를 로그아웃시킵니다.
 */
export const logout = (req: Request, res: Response) => {
  req.logout((err) => {
    // req.logout은 passport 0.6+ 부터 비동기/콜백 필요
    if (err) {
      return res.status(500).json({ message: "로그아웃 실패", error: err });
    }
    // 세션 파괴
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        // 세션 파괴에 실패해도 로그아웃 자체는 된 것일 수 있음
        console.error("세션 파괴 실패:", destroyErr);
      }
      // 클라이언트의 쿠키를 지웁니다.
      res.clearCookie("connect.sid");
      res.status(200).json({ message: "로그아웃 성공" });
    });
  });
};

/**
 * ⭐️ (POST) /api/auth/update-details
 * 신규 가입자가 학과, 태그 등 추가 정보를 입력합니다.
 */
export const updateUserDetails = async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  const { departmentId, tagIds } = req.body;
  const userId = (req.user as any).id;

  // 1. 유효성 검사
  if (!departmentId || !Array.isArray(tagIds) || tagIds.length < 3) {
    return res
      .status(400)
      .json({ message: "학과와 3개 이상의 태그를 선택해야 합니다." });
  }

  // DB 트랜잭션 시작 (여러 쿼리를 동시에 실행)
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. users 테이블에 학과 ID 업데이트
    await connection.query("UPDATE users SET department_id = ? WHERE id = ?", [
      departmentId,
      userId,
    ]);

    // 2. user_tags 테이블에 태그 ID들 삽입
    // (먼저 기존 태그를 지우는 것이 안전하지만, 신규 가입이므로 INSERT만 가정)
    const tagInsertValues = tagIds.map((tagId: number) => [userId, tagId]);
    await connection.query("INSERT INTO user_tags (user_id, tag_id) VALUES ?", [
      tagInsertValues,
    ]);

    // 3. 트랜잭션 완료
    await connection.commit();

    // 4. 최신 유저 정보 반환
    const [updatedUsers] = await connection.query(
      "SELECT * FROM users WHERE id = ?",
      [userId]
    );

    res.status(200).json((updatedUsers as any[])[0]);
  } catch (error) {
    await connection.rollback(); // 오류 발생 시 롤백
    console.error("추가 정보 업데이트 실패:", error);
    res.status(500).json({ message: "서버 오류로 업데이트에 실패했습니다." });
  } finally {
    connection.release(); // 커넥션 반환
  }
};
