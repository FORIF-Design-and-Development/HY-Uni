import { Request, Response, NextFunction } from "express";

/**
 * 사용자가 로그인했는지 확인하는 미들웨어
 */
export const isAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Passport가 req.isAuthenticated()를 제공합니다.
  if (req.isAuthenticated()) {
    return next(); // 로그인 됨 -> 다음 단계로
  }

  // 로그인 안됨 -> 401 (Unauthorized) 에러
  res.status(401).json({ message: "로그인이 필요합니다." });
};
