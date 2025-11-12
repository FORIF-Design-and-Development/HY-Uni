// 비즈니스 로직(공지사항 생성, 수정, 조회

// src/services/notice.service.ts

import {
  Notice,
  ManualCreateNoticeDTO,
  UpdateNoticeDTO,
} from "../types/notice.type.js";
// ⭐️ 방금 작성한 repository 함수들을 import 합니다.
import * as noticeRepository from "../repositories/notice.repository.js";

/**
 * [컨벤션: 함수명 camelCase, Named Export]
 * 모든 공지사항 목록을 조회합니다.
 */
export const getNotices = async (): Promise<Notice[]> => {
  // Repository를 호출하여 DB 데이터를 가져옵니다.
  const notices = await noticeRepository.findAll();

  // (만약 비즈니스 로직이 있다면 여기서 추가)
  // 예: 특정 단어가 포함된 공지는 필터링...

  return notices;
};

/**
 * ID로 특정 공지사항 상세 정보를 조회합니다.
 */
export const getNoticeById = async (noticeId: number): Promise<Notice> => {
  const notice = await noticeRepository.findById(noticeId);

  // 💡 [비즈니스 로직]
  // ID에 해당하는 공지사항이 없는 경우 에러를 발생시킵니다.
  // 이 에러는 controller에서 받아 처리하게 됩니다.
  if (!notice) {
    // ⭐️ 실제 구현 시 http-status-codes 라이브러리나
    //    커스텀 에러(Error.ts)를 사용하는 것이 좋습니다.
    const error = new Error("해당 공지사항을 찾을 수 없습니다.");
    (error as any).status = 404; // 404 Not Found
    throw error;
  }

  return notice;
};

export const createNotice = async (
  noticeData: ManualCreateNoticeDTO
): Promise<Notice> => {
  // 1. [비즈니스 로직] 유효성 검사
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

  // 2. Repository 호출 (생성)
  const newNoticeId = await noticeRepository.createManual(noticeData);

  // 3. 생성된 객체를 다시 조회해서 반환 (findById 재사용)
  //    (DB가 생성한 notice_id, created_at, posted_at 등을 포함)
  const createdNotice = await noticeRepository.findById(newNoticeId);

  if (!createdNotice) {
    // 4. (예외 처리) 생성 직후 조회가 안 될 경우
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
  // 1. [비즈니스 로직] 유효성 검사 (create와 동일)
  if (!noticeData.title || noticeData.title.trim() === "") {
    const error = new Error("제목을 입력해야 합니다.");
    (error as any).status = 400; // 400 Bad Request
    throw error;
  }
  if (!noticeData.content || noticeData.content.trim() === "") {
    // ... (400 에러) ...
  }

  // 2. Repository 호출 (수정)
  const success = await noticeRepository.update(noticeId, noticeData);

  // 3. [비즈니스 로직] ID가 없어 수정에 실패한 경우 404 에러
  if (!success) {
    const error = new Error("해당 공지사항을 찾을 수 없어 수정할 수 없습니다.");
    (error as any).status = 404; // 404 Not Found
    throw error;
  }

  // 4. 수정된 최신 데이터를 다시 조회해서 반환
  const updatedNotice = await noticeRepository.findById(noticeId);
  if (!updatedNotice) {
    // (이론상 발생하기 어렵지만) 예외 처리
    const error = new Error("공지사항 수정 후 조회에 실패했습니다.");
    (error as any).status = 500;
    throw error;
  }

  return updatedNotice;
};

// 공지사항 삭제
export const deleteNotice = async (noticeId: number): Promise<void> => {
  // 1. Repository 호출 (삭제)
  const success = await noticeRepository.remove(noticeId);

  // 2. [비즈니스 로직] ID가 없어 삭제에 실패한 경우 404 에러
  if (!success) {
    const error = new Error("해당 공지사항을 찾을 수 없어 삭제할 수 없습니다.");
    (error as any).status = 404; // 404 Not Found
    throw error;
  }

  // 성공 시 (void) 아무것도 반환하지 않음
};
