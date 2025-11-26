import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../config/jwt';
import {
  findBoardById,
  findBoardsWithUserFlags,
} from '../../models/community/board.model';
import {
  addBoardFavorite,
  isBoardFavorite,
  removeBoardFavorite,
} from '../../models/community/board-favorite.model';
import {
  addBoardSubscription,
  isBoardSubscribed,
  removeBoardSubscription,
} from '../../models/community/board-subscription.model';

// 게시판 목록 조회
// - 사용자 즐겨찾기/구독 여부를 포함한 전체 게시판 리스트 반환
export async function getBoards(
  req: Request, // 요청 객체
  res: Response, // 응답 객체
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
    let userId: number;
    try {
      const payload = verifyAccessToken(token);
      userId = payload.userId;
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

    const boards = await findBoardsWithUserFlags(userId); // 게시판 목록 조회

    // 응답 객체에 게시판 목록 추가
    res.status(200).json({ 
      data: {
        boards,
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
        message: '게시판 목록 조회 중 오류가 발생했습니다.',
        code: 'INTERNAL_ERROR',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    next(error);
  }
}

// 게시판 즐겨찾기 토글
// - 사용자가 특정 게시판을 즐겨찾기 상태로 등록 또는 해제.
export async function toggleBoardFavorite(
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
    let userId: number;
    try {
      const payload = verifyAccessToken(token);
      userId = payload.userId;
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

    // 게시판 ID 파라미터 추출
    const boardIdParam = req.params.boardId ?? '';
    const boardId = Number.parseInt(boardIdParam, 10);

    // 게시판 ID 유효성 검사
    // TODO: middleware로 refactoring
    if (!Number.isInteger(boardId) || boardId <= 0) {
      res.status(400).json({
        data: null,
        error: {
          message: '유효하지 않은 게시판 ID입니다.',
          code: 'INVALID_BOARD_ID',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 게시판 조회
    const board = await findBoardById(boardId);

    // 게시판 조회 결과 유효성 검사
    // TODO: middleware로 refactoring
    if (!board) {
      res.status(404).json({
        data: null,
        error: {
          message: '해당 ID의 게시판을 찾을 수 없습니다.',
          code: 'BOARD_NOT_FOUND',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 사용자가 게시판을 즐겨찾기 하고 있는지 확인
    const alreadyFavorite = await isBoardFavorite(userId, boardId);

    if (alreadyFavorite) { // 이미 즐겨찾기 하고 있으면
      await removeBoardFavorite(userId, boardId); // 즐겨찾기 제거
    } else { // 즐겨찾기 하고 있지 않으면
      await addBoardFavorite(userId, boardId); // 즐겨찾기 추가
    }

    // 응답 객체에 게시판 ID 및 즐겨찾기 여부 추가
    res.status(200).json({
      data: {
        boardId,
        isFavorite: !alreadyFavorite,
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

// 게시판 알림 설정 토글
// - 특정 게시판에 대한 알림(구독) 설정을 추가하거나 해제
export async function toggleBoardSubscription(
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
    let userId: number;
    try {
      const payload = verifyAccessToken(token);
      userId = payload.userId;
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

    // 게시판 ID 파라미터 추출
    const boardIdParam = req.params.boardId ?? '';
    const boardId = Number.parseInt(boardIdParam, 10);

    // 게시판 ID 유효성 검사
    // TODO: middleware로 refactoring
    if (!Number.isInteger(boardId) || boardId <= 0) {
      res.status(400).json({
        data: null,
        error: {
          message: '유효하지 않은 게시판 ID입니다.',
          code: 'INVALID_BOARD_ID',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 게시판 조회
    const board = await findBoardById(boardId);

    // 게시판 조회 결과 유효성 검사
    // TODO: middleware로 refactoring
    if (!board) {
      res.status(404).json({
        data: null,
        error: {
          message: '해당 ID의 게시판을 찾을 수 없습니다.',
          code: 'BOARD_NOT_FOUND',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 사용자가 게시판을 구독하고 있는지 확인
    const alreadySubscribed = await isBoardSubscribed(userId, boardId);

    if (alreadySubscribed) { // 이미 구독하고 있으면
      await removeBoardSubscription(userId, boardId); // 구독 제거
    } else { // 구독하고 있지 않으면
      await addBoardSubscription(userId, boardId); // 구독 추가
    }

    // 응답 객체에 게시판 ID 및 구독 여부 추가
    res.status(200).json({
      data: {
        boardId,
        isSubscribed: !alreadySubscribed,
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

