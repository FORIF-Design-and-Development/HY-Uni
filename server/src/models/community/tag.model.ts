import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/db';

// DB 테이블 이름을 상수로 관리
export const TAGS_TABLE = 'tag';
export const POST_TAGS_TABLE = 'post_tag';

// MySQL이 반환한 RowDataPacket을 테이블 스키마에 맞춰 표현한 타입(= 원본 DB 레코드 형태).
export interface TagRow extends RowDataPacket {
  tag_id: number;
  name: string;
}

// 애플리케이션 내부에서 사용할 도메인 모델(카멜 케이스 필드 등으로 정규화된 형태).
export interface Tag {
  id: number;
  name: string;
  createdAt: Date;
}

// DB에서 조회한 Raw 행을 도메인 모델로 변환해 애플리케이션이 바로 사용 가능하게 만듦.
export const toTag = (row: TagRow): Tag => ({
  id: row.tag_id,
  name: row.name,
  createdAt: new Date(), // created_at 컬럼이 없으므로 현재 시간 사용
});

// 게시글 ID로 태그 목록 조회
export async function findTagsByPostId(postId: number): Promise<Tag[]> {
  const sql = `
    SELECT t.tag_id, t.name
    FROM ${TAGS_TABLE} t
    INNER JOIN ${POST_TAGS_TABLE} pt ON t.tag_id = pt.tag_id
    WHERE pt.post_id = ?
    ORDER BY t.tag_id ASC
  `;

  const [rows] = await pool.query<TagRow[]>(sql, [postId]);
  return rows.map(toTag);
}

