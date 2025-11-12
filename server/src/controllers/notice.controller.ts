// Express req와 res 요청 직접 처리
// src/controllers/notice.controller.ts

// ⭐️ Express의 Request, Response, NextFunction 타입을 가져옵니다.
import { Request, Response, NextFunction } from "express";
// ⭐️ service 함수들을 .js 확장자로 import 합니다.
import * as noticeService from "../services/notice.service.js";
import {
  ManualCreateNoticeDTO,
  UpdateNoticeDTO,
} from "../types/notice.type.js";

/**
 * [컨벤션: 함수명 camelCase, Named Export]
 * 공지사항 전체 목록 조회 API
 */
export const getNoticeList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. Service 로직 호출
    const notices = await noticeService.getNotices();

    // 2. 성공 응답 반환
    res.status(200).json(notices);
  } catch (error) {
    // 3. Service에서 발생한 에러를 Express 에러 핸들러로 전달
    //    (아마도 src/middlewares/error.ts에서 처리)
    next(error);
    //Example;
  }
};

/**
 * 공지사항 상세 조회 API
 */
export const getNoticeDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. URL 파라미터에서 noticeId를 가져옵니다.
    // ⭐️ [수정] 'req.params.id'를 'string'으로 타입 단언 (as string)
    const noticeId = parseInt(req.params.id as string, 10);

    // 💡 간단한 유효성 검사
    // (만약 'id'가 undefined였더라도, parseInt(undefined)는 NaN이 되므로
    //  아래의 isNaN(noticeId) 검사에서 걸리게 됩니다.)
    if (isNaN(noticeId)) {
      const error = new Error("유효하지 않은 ID입니다.");
      (error as any).status = 400; // 400 Bad Request
      throw error;
    }

    // 2. Service 로직 호출
    const notice = await noticeService.getNoticeById(noticeId);

    // 3. 성공 응답 반환
    res.status(200).json(notice);
  } catch (error) {
    // 4. 에러 핸들러로 전달
    next(error);
  }
};

export const postNotice = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. req.body에서 데이터 추출 (express.json() 미들웨어 필요)
    const noticeData: ManualCreateNoticeDTO = {
      title: req.body.title,
      content: req.body.content,
      author: req.body.author,
    };

    // 2. Service 로직 호출
    const newNotice = await noticeService.createNotice(noticeData);

    // 3. 성공 응답 (201 Created)
    // ⭐️ POST 생성 성공은 201 코드를 사용하는 것이 좋습니다.
    res.status(201).json(newNotice);
  } catch (error) {
    // 4. 유효성 검사 에러(400) 또는 기타 에러 처리
    next(error);
  }
};

export const putNotice = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. URL 파라미터에서 ID 가져오기
    const noticeId = parseInt(req.params.id as string, 10);
    if (isNaN(noticeId)) {
      const error = new Error("유효하지 않은 ID입니다.");
      (error as any).status = 400;
      throw error;
    }

    // 2. req.body에서 수정할 데이터 가져오기
    const noticeData: UpdateNoticeDTO = {
      title: req.body.title,
      content: req.body.content,
      author: req.body.author,
    };

    // 3. Service 로직 호출
    const updatedNotice = await noticeService.updateNotice(
      noticeId,
      noticeData
    );

    // 4. 성공 응답 (200 OK)
    res.status(200).json(updatedNotice);
  } catch (error) {
    next(error);
  }
};

/**
 * 💡 [신규 추가] 공지사항 삭제 API (DELETE /:id)
 */
export const deleteNotice = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. URL 파라미터에서 ID 가져오기
    const noticeId = parseInt(req.params.id as string, 10);
    if (isNaN(noticeId)) {
      const error = new Error("유효하지 않은 ID입니다.");
      (error as any).status = 400;
      throw error;
    }

    // 2. Service 로직 호출
    await noticeService.deleteNotice(noticeId);

    // 3. 성공 응답 (204 No Content)
    // ⭐️ DELETE 성공 시에는 204 코드를 보내고 본문(body)은 비워두는 것이 표준입니다.
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
