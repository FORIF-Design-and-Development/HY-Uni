// src/services/notice.service.ts

import {
  Notice,
  ManualCreateNoticeDTO,
  UpdateNoticeDTO,
  NoticeModel,
} from "../../../models/campus/notice.model";

/**
 * 모든 공지사항 목록을 조회
 */
export const getNotices = async (): Promise<Notice[]> => {
  const notices = await NoticeModel.findAll();
  return notices;
};

/**
 * ID로 특정 공지사항 상세 정보를 조회
 */
export const getNoticeById = async (noticeId: number): Promise<Notice> => {
  const notice = await NoticeModel.findById(noticeId);
  if (!notice) {
    const error = new Error("해당 공지사항을 찾을 수 없습니다.");
    (error as any).status = 404; // 404 Not Found
    throw error;
  }

  return notice;
};

export const createNotice = async (
  noticeData: ManualCreateNoticeDTO
): Promise<Notice> => {
  if (!noticeData.title || noticeData.title.trim() === "") {
    const error = new Error("제목을 입력해야 합니다.");
    (error as any).status = 400; // 400 Bad Request
    throw error;
  }
  if (!noticeData.content || noticeData.content.trim() === "") {
    const error = new Error("내용을 입력해야 합니다.");
    (error as any).status = 400; // 400 Bad Request
    throw error;
  }

  //Model 생성
  const newNoticeId = await NoticeModel.createManual(noticeData);
  const createdNotice = await NoticeModel.findById(newNoticeId);

  if (!createdNotice) {
    const error = new Error("공지사항 생성 후 조회에 실패했습니다.");
    (error as any).status = 500; // 500 Internal Server Error
    throw error;
  }

  return createdNotice;
};

//공지 수정
export const updateNotice = async (
  noticeId: number,
  noticeData: UpdateNoticeDTO
): Promise<Notice> => {
  if (!noticeData.title || noticeData.title.trim() === "") {
    const error = new Error("제목을 입력해야 합니다.");
    (error as any).status = 400; // 400 Bad Request
    throw error;
  }
  if (!noticeData.content || noticeData.content.trim() === "") {
    const error = new Error("내용을 입력해야 합니다.");
    (error as any).status = 400; // 400 Bad Request
    throw error;
  }
  const success = await NoticeModel.update(noticeId, noticeData);

  if (!success) {
    const error = new Error("해당 공지사항을 찾을 수 없어 수정할 수 없습니다.");
    (error as any).status = 404; // 404 Not Found
    throw error;
  }

  const updatedNotice = await NoticeModel.findById(noticeId);
  if (!updatedNotice) {
    const error = new Error("공지사항 수정 후 조회에 실패했습니다.");
    (error as any).status = 500;
    throw error;
  }

  return updatedNotice;
};

// 공지사항 삭제
export const deleteNotice = async (noticeId: number): Promise<void> => {
  const success = await NoticeModel.remove(noticeId);

  if (!success) {
    const error = new Error("해당 공지사항을 찾을 수 없어 삭제할 수 없습니다.");
    (error as any).status = 404; // 404 Not Found
    throw error;
  }
};
