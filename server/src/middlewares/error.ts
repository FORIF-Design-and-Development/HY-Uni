import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../config/jwt';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// 등록되지 않은 경로 처리
export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, 'Not Found'));
}

// 전역 에러 핸들러
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = typeof err?.status === 'number' ? err.status : 500;

  // 404 에러는 로그를 출력하지 않음 (정적 파일 요청 등 정상적인 경우)
  if (status !== 404) {
    console.error(err);
  }

  res.status(status).json({ message: err.message ?? 'Internal Server Error' });
}

/**
 * 필수 인증 미들웨어
 * 토큰이 없거나 유효하지 않으면 401 에러 반환
 * 인증 성공 시 req.userId에 사용자 ID 설정
 * 
 * TODO: 개발용 임시 하드코딩 - user_id = 14
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // 쿠키 또는 Authorization 헤더에서 토큰 추출
  const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({
      data: null,
      error: {
        code: 'MISSING_TOKEN',
        message: '인증 토큰이 필요합니다.',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    (req as any).userId = payload.userId;
    next();
  } catch (error) {
    res.status(401).json({
      data: null,
      error: {
        code: 'INVALID_TOKEN',
        message: '유효하지 않은 인증 토큰입니다.',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }
}