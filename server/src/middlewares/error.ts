import type { Request, Response, NextFunction } from 'express';

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
  console.error(err);
  res.status(status).json({ message: err.message ?? 'Internal Server Error' });
}