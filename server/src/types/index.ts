import { Request } from "express";

/**
 * Passport를 통해 인증된 후의 Request 타입
 * req.user 객체를 포함합니다.
 */
export interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    nickname: string;
    email: string;
    department_id: number | null;
    // ... passport.serializeUser에서 넣은 다른 필드들
  };
}
