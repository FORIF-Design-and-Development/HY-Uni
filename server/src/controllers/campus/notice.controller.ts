// Express req와 res 요청 직접 처리
// src/controllers/notice.controller.ts

import { Request, Response, NextFunction } from "express";
import * as noticeService from "../../services/campus/notice/notice.service";
import {
  ManualCreateNoticeDTO,
  UpdateNoticeDTO,
} from "../../models/campus/notice.model";

/**
 * 공지사항 전체 목록 조회 API
 */
export const getNoticeList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const notices = await noticeService.getNotices();

    res.status(200).json(notices);
  } catch (error) {
    next(error);
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
    const noticeId = parseInt(req.params.id as string, 10);

    if (isNaN(noticeId)) {
      const error = new Error("유효하지 않은 ID입니다.");
      (error as any).status = 400; // 400 Bad Request
      throw error;
    }

    const notice = await noticeService.getNoticeById(noticeId);

    res.status(200).json(notice);
  } catch (error) {
    next(error);
  }
};

export const postNotice = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const noticeData: ManualCreateNoticeDTO = {
      title: req.body.title,
      content: req.body.content,
      author: req.body.author,
    };

    const newNotice = await noticeService.createNotice(noticeData);
    res.status(201).json(newNotice);
  } catch (error) {
    next(error);
  }
};

export const putNotice = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    //URL 파라미터에서 ID
    const noticeId = parseInt(req.params.id as string, 10);
    if (isNaN(noticeId)) {
      const error = new Error("유효하지 않은 ID입니다.");
      (error as any).status = 400;
      throw error;
    }

    const noticeData: UpdateNoticeDTO = {
      title: req.body.title,
      content: req.body.content,
      author: req.body.author,
    };

    const updatedNotice = await noticeService.updateNotice(
      noticeId,
      noticeData
    );

    res.status(200).json(updatedNotice);
  } catch (error) {
    next(error);
  }
};

/**
 * 공지사항 삭제 API (DELETE /:id)
 */
export const deleteNotice = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const noticeId = parseInt(req.params.id as string, 10);
    if (isNaN(noticeId)) {
      const error = new Error("유효하지 않은 ID입니다.");
      (error as any).status = 400;
      throw error;
    }

    await noticeService.deleteNotice(noticeId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
