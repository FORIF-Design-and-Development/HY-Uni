import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../config/jwt';
import { UPLOAD_IMAGES_URL, UPLOAD_VIDEOS_URL } from '../../config/upload';

// Multer 파일 타입 확장
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
}

// 파일 업로드 핸들러
export async function uploadFiles(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // TODO: JWT 토큰 추출 로직을 미들웨어로 리팩토링 예정
    // Authorization 헤더에서 JWT 토큰 추출
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        data: null,
        error: {
          message: '인증 토큰이 필요합니다.',
          code: 'MISSING_TOKEN',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Bearer 토큰 추출
    const token = authHeader.substring(7); // 'Bearer ' 제거

    // 토큰 검증 및 user_id 추출
    // TODO: middleware로 refactoring
    try {
      verifyAccessToken(token);
    } catch (error) {
      res.status(401).json({
        data: null,
        error: {
          message: '유효하지 않은 인증 토큰입니다.',
          code: 'INVALID_TOKEN',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // multer에서 업로드된 파일 정보 가져오기 (fields 형식)
    const files = req.files as {
      images?: MulterFile[];
      videos?: MulterFile[];
    } | undefined;

    if (!files || (!files.images && !files.videos)) {
      res.status(400).json({
        data: null,
        error: {
          message: '업로드할 파일이 없습니다.',
          code: 'NO_FILES',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 이미지와 동영상 분리
    const images: Array<{ type: 'IMAGE'; url: string }> = [];
    const videos: Array<{ type: 'VIDEO'; url: string }> = [];

    if (files.images) {
      for (const file of files.images) {
        images.push({
          type: 'IMAGE',
          url: `${UPLOAD_IMAGES_URL}/${file.filename}`,
        });
      }
    }

    if (files.videos) {
      for (const file of files.videos) {
        videos.push({
          type: 'VIDEO',
          url: `${UPLOAD_VIDEOS_URL}/${file.filename}`,
        });
      }
    }

    // 성공 응답
    res.status(200).json({
      data: {
        images,
        videos,
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    // 서버 오류 처리
    // TODO: middleware로 refactoring
    res.status(500).json({
      data: null,
      error: {
        message: '파일 업로드 중 오류가 발생했습니다.',
        code: 'INTERNAL_ERROR',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    next(error);
  }
}

