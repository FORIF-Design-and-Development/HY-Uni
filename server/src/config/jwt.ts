import jwt, { Secret } from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET: Secret =
  process.env.JWT_ACCESS_SECRET || 'dev-access-secret';
const REFRESH_TOKEN_SECRET: Secret =
  process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';

const ACCESS_TOKEN_EXPIRES_IN =
  process.env.JWT_ACCESS_EXPIRES_IN || '15m'; //15분
const REFRESH_TOKEN_EXPIRES_IN =
  process.env.JWT_REFRESH_EXPIRES_IN || '7d'; //7일

export interface JwtPayload {
  userId: number;
}

export function signAccessToken(userId: number): string {
  const payload: JwtPayload = { userId };
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN as any,
  });
}

export function signRefreshToken(userId: number): string {
  const payload: JwtPayload = { userId };
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN as any,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_TOKEN_SECRET) as JwtPayload;
}