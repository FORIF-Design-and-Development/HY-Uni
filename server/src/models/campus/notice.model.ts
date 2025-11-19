// src/models/notice.model.ts

import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool as db } from "../../config/db";

/**
 * 공지사항 기본
 */
export interface Notice {
  noticeId: number;
  title: string;
  content: string;
  author: string | null;
  postedAt: Date;
  originalUrl: string;
  createdAt: Date;
}

/**
 * [크롤러용] 생성 DTO
 */
export interface CreateNoticeDTO {
  title: string;
  content: string;
  author: string | null;
  postedAt: Date; // Service에서 Date 객체로 변환 후 전달
  originalUrl: string;
}

/**
 * [수동] 생성 DTO
 */
export interface ManualCreateNoticeDTO {
  title: string;
  content: string;
  author: string | null;
}

/**
 * 업데이트 DTO
 */
export interface UpdateNoticeDTO {
  title: string;
  content: string;
  author: string | null;
}

/**
 * DB의 snake_case 컬럼을 위한 내부용 인터페이스
 */
interface NoticeRow extends RowDataPacket {
  notice_id: number;
  title: string;
  content: string;
  author: string | null;
  posted_at: string; // DB -> string
  original_url: string;
  created_at: string; // DB -> string
}

export class NoticeModel {
  /**
   * Helper: DB 'NoticeRow'를 JS/TS 'Notice' 타입으로 변환
   */
  private static mapRowToNotice(row: NoticeRow): Notice {
    return {
      noticeId: row.notice_id,
      title: row.title,
      content: row.content,
      author: row.author,
      postedAt: new Date(row.posted_at),
      originalUrl: row.original_url,
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * 모든 공지사항을 조회 (최신순)
   */
  static async findAll(): Promise<Notice[]> {
    const query = "SELECT * FROM notice ORDER BY posted_at DESC";
    const [rows] = await db.query<NoticeRow[]>(query);
    return rows.map(this.mapRowToNotice);
  }

  /**
   * ID로 특정 공지사항 조회
   */
  static async findById(noticeId: number): Promise<Notice | null> {
    const query = "SELECT * FROM notice WHERE notice_id = ?";
    const [rows] = await db.query<NoticeRow[]>(query, [noticeId]);
    const firstRow = rows[0];

    if (firstRow) {
      return this.mapRowToNotice(firstRow);
    }
    return null;
  }

  /**
   * [크롤러용] 원본 URL로 공지사항 조회 (중복 확인)
   */
  static async findByUrl(originalUrl: string): Promise<Notice | null> {
    const query = "SELECT * FROM notice WHERE original_url = ?";
    const [rows] = await db.query<NoticeRow[]>(query, [originalUrl]);
    const firstRow = rows[0];

    if (firstRow) {
      return this.mapRowToNotice(firstRow);
    }
    return null;
  }

  /**
   * 새 공지사항 생성 (크롤러가 사용)
   */
  static async create(noticeData: CreateNoticeDTO): Promise<number> {
    const { title, content, author, postedAt, originalUrl } = noticeData;
    const query = `
      INSERT INTO notice (title, content, author, posted_at, original_url)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute<ResultSetHeader>(query, [
      title,
      content,
      author,
      postedAt,
      originalUrl,
    ]);
    return result.insertId;
  }

  /**
   * 새 공지사항 생성 (수동)
   */
  static async createManual(
    noticeData: ManualCreateNoticeDTO
  ): Promise<number> {
    const { title, content, author } = noticeData;
    const query = `
      INSERT INTO notice (title, content, author, posted_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `;
    const [result] = await db.execute<ResultSetHeader>(query, [
      title,
      content,
      author || "관리자",
    ]);
    return result.insertId;
  }

  /**
   * 공지사항 update
   */
  static async update(
    noticeId: number,
    noticeData: UpdateNoticeDTO
  ): Promise<boolean> {
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
    return result.affectedRows > 0;
  }

  /**
   * 공지사항 삭제
   */
  static async remove(noticeId: number): Promise<boolean> {
    const query = "DELETE FROM notice WHERE notice_id = ?";
    const [result] = await db.execute<ResultSetHeader>(query, [noticeId]);
    return result.affectedRows > 0;
  }
}
