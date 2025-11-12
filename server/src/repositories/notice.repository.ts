// src/repositories/notice.repository.ts

import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
// 1. '.js' 확장자 사용, { pool }을 'db'라는 이름으로 가져오기
import { pool as db } from "../config/db.js";
import {
  Notice,
  CreateNoticeDTO,
  ManualCreateNoticeDTO,
  UpdateNoticeDTO,
} from "../types/notice.type.js";

// 2. DB의 snake_case 컬럼을 위한 인터페이스 정의
interface NoticeRow extends RowDataPacket {
  notice_id: number;
  title: string;
  content: string;
  author: string | null;
  posted_at: string; // DB에서 읽을 때는 string, 이후 Date로 변환
  original_url: string;
  created_at: string;
}

/**
 * Helper: DB의 'NoticeRow'를 JS/TS의 'Notice' 타입으로 변환
 */
const mapRowToNotice = (row: NoticeRow): Notice => {
  return {
    noticeId: row.notice_id,
    title: row.title,
    content: row.content,
    author: row.author,
    postedAt: new Date(row.posted_at),
    originalUrl: row.original_url,
    createdAt: new Date(row.created_at),
  };
};

/**
 * 모든 공지사항을 조회 (최신순)
 */
export const findAll = async (): Promise<Notice[]> => {
  const query = "SELECT * FROM notice ORDER BY posted_at DESC";

  // NoticeRow[] 사용
  const [rows] = await db.query<NoticeRow[]>(query);

  return rows.map(mapRowToNotice);
};

/**
 * ID로 특정 공지사항 조회
 */
export const findById = async (noticeId: number): Promise<Notice | null> => {
  const query = "SELECT * FROM notice WHERE notice_id = ?";

  const [rows] = await db.query<NoticeRow[]>(query, [noticeId]);

  // 3. 'rows[0]' undefined 처리 (Type Guard)
  const firstRow = rows[0];

  if (firstRow) {
    return mapRowToNotice(firstRow);
  }

  return null;
};

/**
 * [크롤러용] 원본 URL로 공지사항 조회 (중복 확인)
 */
export const findByUrl = async (
  originalUrl: string
): Promise<Notice | null> => {
  const query = "SELECT * FROM notice WHERE original_url = ?";

  const [rows] = await db.query<NoticeRow[]>(query, [originalUrl]);

  // 3. 'rows[0]' undefined 처리 (Type Guard)
  const firstRow = rows[0];

  if (firstRow) {
    return mapRowToNotice(firstRow);
  }

  return null;
};

/**
 * 새 공지사항 생성 (크롤러가 사용)
 */
export const create = async (noticeData: CreateNoticeDTO): Promise<number> => {
  const { title, content, author, postedAt, originalUrl } = noticeData;
  const query = `
    INSERT INTO notice (title, content, author, posted_at, original_url)
    VALUES (?, ?, ?, ?, ?)
  `;

  // DB의 snake_case 컬럼 순서에 맞게 값을 전달
  const [result] = await db.execute<ResultSetHeader>(query, [
    title,
    content,
    author,
    postedAt,
    originalUrl,
  ]);

  // 생성된 notice_id 반환
  return result.insertId;
};

export const createManual = async (
  noticeData: ManualCreateNoticeDTO
): Promise<number> => {
  const { title, content, author } = noticeData;
  const query = `
    INSERT INTO notice (title, content, author, posted_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `;

  const [result] = await db.execute<ResultSetHeader>(query, [
    title,
    content,
    author || "관리자", // author가 없으면 '관리자'로 기본값 (예시)
  ]);

  return result.insertId;
};

//공지사항 update
export const update = async (
  noticeId: number,
  noticeData: UpdateNoticeDTO
): Promise<boolean> => {
  const { title, content, author } = noticeData;
  const query = `
    UPDATE notice
    SET title = ?, content = ?, author = ?
    WHERE notice_id = ?
  `;

  const [result] = await db.execute<ResultSetHeader>(query, [
    title,
    content,
    author,
    noticeId,
  ]);

  // ⭐️ affectedRows는 변경된 행의 수. 1이면 성공, 0이면 실패(ID가 없음)
  return result.affectedRows > 0;
};

//공지사항 삭제
export const remove = async (noticeId: number): Promise<boolean> => {
  const query = "DELETE FROM notice WHERE notice_id = ?";

  const [result] = await db.execute<ResultSetHeader>(query, [noticeId]);

  // ⭐️ 1이면 성공, 0이면 실패(ID가 없음)
  return result.affectedRows > 0;
};
