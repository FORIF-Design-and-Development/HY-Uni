import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../config/jwt';
import {
  findUnreadNotificationsByUserId,
  findNotificationsByUserId,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
} from '../../models/community/notification.model';
import {
  registerSSEConnection,
  unregisterSSEConnection,
} from '../../services/community/notification.service';

// SSE 연결 엔드포인트
export async function connectSSE(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({
        data: null,
        error: { message: '인증이 필요합니다.', code: 'UNAUTHORIZED' },
        meta: null,
      });
      return;
    }

    const decoded = verifyAccessToken(token);
    const userId = decoded.userId;

    // SSE 연결 등록
    registerSSEConnection(userId, res);

    // 클라이언트 연결 유지
    req.on('close', () => {
      unregisterSSEConnection(userId);
    });
  } catch (error) {
    next(error);
  }
}

// 알림 목록 조회
export async function getNotifications(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({
        data: null,
        error: { message: '인증이 필요합니다.', code: 'UNAUTHORIZED' },
        meta: null,
      });
      return;
    }

    const decoded = verifyAccessToken(token);
    const userId = decoded.userId;

    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    const isReadParam = req.query.isRead;

    let isRead: boolean | null = null;
    if (isReadParam === 'true') {
      isRead = true;
    } else if (isReadParam === 'false') {
      isRead = false;
    }

    // limit과 offset 유효성 검사
    if (isNaN(limit) || limit < 1 || limit > 100) {
      res.status(400).json({
        data: null,
        error: {
          message: 'limit은 1 이상 100 이하여야 합니다.',
          code: 'INVALID_LIMIT',
        },
        meta: null,
      });
      return;
    }

    if (isNaN(offset) || offset < 0) {
      res.status(400).json({
        data: null,
        error: {
          message: 'offset은 0 이상이어야 합니다.',
          code: 'INVALID_OFFSET',
        },
        meta: null,
      });
      return;
    }

    const notifications = await findNotificationsByUserId(userId, limit, offset, isRead);

    res.status(200).json({
      data: { notifications },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
}

// 알림 읽음 처리
export async function markAsRead(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({
        data: null,
        error: { message: '인증이 필요합니다.', code: 'UNAUTHORIZED' },
        meta: null,
      });
      return;
    }

    const decoded = verifyAccessToken(token);
    const userId = decoded.userId;

    const notificationId = Number(req.params.notificationId);
    if (isNaN(notificationId)) {
      res.status(400).json({
        data: null,
        error: {
          message: '유효하지 않은 알림 ID입니다.',
          code: 'INVALID_NOTIFICATION_ID',
        },
        meta: null,
      });
      return;
    }

    const success = await markNotificationAsRead(notificationId, userId);
    if (!success) {
      res.status(404).json({
        data: null,
        error: {
          message: '알림을 찾을 수 없습니다.',
          code: 'NOTIFICATION_NOT_FOUND',
        },
        meta: null,
      });
      return;
    }

    res.status(200).json({
      data: { message: '알림이 읽음 처리되었습니다.' },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
}

// 모든 알림 읽음 처리
export async function markAllAsRead(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({
        data: null,
        error: { message: '인증이 필요합니다.', code: 'UNAUTHORIZED' },
        meta: null,
      });
      return;
    }

    const decoded = verifyAccessToken(token);
    const userId = decoded.userId;

    const count = await markAllNotificationsAsRead(userId);

    res.status(200).json({
      data: {
        message: `${count}개의 알림이 읽음 처리되었습니다.`,
        count,
      },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
}

// 읽지 않은 알림 개수 조회
export async function getUnreadCount(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({
        data: null,
        error: { message: '인증이 필요합니다.', code: 'UNAUTHORIZED' },
        meta: null,
      });
      return;
    }

    const decoded = verifyAccessToken(token);
    const userId = decoded.userId;

    const count = await getUnreadNotificationCount(userId);

    res.status(200).json({
      data: { count },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
}

