import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/db';
import { findFilterKeywordsByUserId } from './filter-keyword.model';

// DB 테이블 이름 상수
const POSTS_TABLE = 'post';
const BOARDS_TABLE = 'board';
const USERS_TABLE = 'user';
const TAGS_TABLE = 'tag';
const POST_TAGS_TABLE = 'post_tag';
const ATTACHMENTS_TABLE = 'attachment';

// 검색 옵션
export type SortBy = 'relevance';

export interface SearchOptions {
  query: string;
  page: number;
  pageSize: number;
  sortBy: SortBy;
  boardId?: number;
  userId: number;
}

// 검색 결과 Row 타입
interface SearchResultRow extends RowDataPacket {
  post_id: number;
  title: string;
  content: string;
  is_anonymous: 0 | 1;
  like_count: number;
  comment_count: number;
  view_count: number;
  created_at: Date;
  board_id: number | null;
  board_name: string | null;
  user_id: number | null;
  user_nickname: string | null;
  tag_ids: string | null; // GROUP_CONCAT 결과
  tag_names: string | null; // GROUP_CONCAT 결과
  image_url: string | null;
  video_url: string | null;
}

// 검색 결과 타입
export interface SearchResult {
  id: number;
  title: string;
  contentSnippet: string;
  board: {
    id: number;
    name: string;
  } | null;
  counts: {
    likes: number;
    comments: number;
    views: number;
  };
  createdAt: string;
  author: {
    nickname: string;
  };
  tags: Array<{
    id: number;
    name: string;
  }>;
  previews: {
    imageUrl: string | null;
    videoUrl: string | null;
  };
}

// 검색 응답 타입
export interface SearchResponse {
  results: SearchResult[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalResults: number;
    totalPages: number;
  };
}

// content의 처음 15자를 추출하는 함수
function extractContentSnippet(content: string): string {
  if (!content) return '';
  return content.length > 15 ? content.substring(0, 15) : content;
}

// tag_ids와 tag_names 문자열을 파싱하여 배열로 변환
function parseTags(tagIds: string | null, tagNames: string | null): Array<{ id: number; name: string }> {
  if (!tagIds || !tagNames) return [];
  
  const ids = tagIds.split(',').map(id => Number.parseInt(id.trim(), 10));
  const names = tagNames.split(',');
  
  return ids.map((id, index) => ({
    id,
    name: names[index]?.trim() || '',
  })).filter(tag => tag.id && tag.name);
}

// Row를 SearchResult로 변환
function toSearchResult(row: SearchResultRow): SearchResult {
  return {
    id: row.post_id,
    title: row.title,
    contentSnippet: extractContentSnippet(row.content),
    board: row.board_id && row.board_name
      ? {
          id: row.board_id,
          name: row.board_name,
        }
      : null,
    counts: {
      likes: row.like_count,
      comments: row.comment_count,
      views: row.view_count,
    },
    createdAt: new Date(row.created_at).toISOString(),
    author: {
      nickname: row.is_anonymous ? '익명' : (row.user_nickname || '익명'),
    },
    tags: parseTags(row.tag_ids, row.tag_names),
    previews: {
      imageUrl: row.image_url || null,
      videoUrl: row.video_url || null,
    },
  };
}

// 게시글 검색 함수
export async function searchPosts(options: SearchOptions): Promise<SearchResponse> {
  const { query, page, pageSize, sortBy, boardId, userId } = options;
  const offset = (page - 1) * pageSize;
  const searchTerm = `%${query}%`;

  // 사용자의 필터 키워드 조회
  const filterKeywordsWithId = await findFilterKeywordsByUserId(userId);
  const filterKeywords = filterKeywordsWithId.map((k) => k.name);

  // 필터 키워드 제외 조건 생성
  let filterKeywordConditions = '';
  const filterParams: any[] = [];
  if (filterKeywords.length > 0) {
    const conditions: string[] = [];
    for (const keyword of filterKeywords) {
      const keywordPattern = `%${keyword}%`;
      conditions.push('(p.title NOT LIKE ? AND p.content NOT LIKE ?)');
      filterParams.push(keywordPattern, keywordPattern);
    }
    if (conditions.length > 0) {
      filterKeywordConditions = `AND ${conditions.join(' AND ')}`;
    }
  }

  // boardId 필터 조건
  const boardFilter = boardId ? 'AND p.board_id = ?' : '';

  // 메인 검색 쿼리
  const sql = `
    SELECT
      p.post_id,
      p.title,
      p.content,
      p.is_anonymous,
      p.like_count,
      p.comment_count,
      p.view_count,
      p.created_at,
      b.board_id,
      b.name AS board_name,
      u.user_id,
      u.nickname AS user_nickname,
      GROUP_CONCAT(DISTINCT t.tag_id ORDER BY t.tag_id) AS tag_ids,
      GROUP_CONCAT(DISTINCT t.name ORDER BY t.tag_id) AS tag_names,
      (SELECT url FROM ${ATTACHMENTS_TABLE} WHERE post_id = p.post_id AND type = 'image' LIMIT 1) AS image_url,
      (SELECT url FROM ${ATTACHMENTS_TABLE} WHERE post_id = p.post_id AND type = 'video' LIMIT 1) AS video_url,
      CASE 
        WHEN p.title LIKE ? THEN 1 
        WHEN p.content LIKE ? THEN 2 
        ELSE 3 
      END AS relevance_order
    FROM ${POSTS_TABLE} AS p
    LEFT JOIN ${BOARDS_TABLE} AS b ON p.board_id = b.board_id
    LEFT JOIN ${USERS_TABLE} AS u ON p.user_id = u.user_id
    LEFT JOIN ${POST_TAGS_TABLE} AS pt ON p.post_id = pt.post_id
    LEFT JOIN ${TAGS_TABLE} AS t ON pt.tag_id = t.tag_id
    WHERE p.status IN ('published', 'edited')
      AND (p.title LIKE ? OR p.content LIKE ?)
      ${boardFilter}
      ${filterKeywordConditions}
    GROUP BY p.post_id
    ORDER BY relevance_order, p.created_at DESC
    LIMIT ? OFFSET ?
  `;

  // 쿼리 파라미터 구성 - 순서 수정
  const params: any[] = [];
  params.push(searchTerm); // SELECT CASE의 title LIKE 파라미터
  params.push(searchTerm); // SELECT CASE의 content LIKE 파라미터
  params.push(searchTerm); // WHERE title LIKE
  params.push(searchTerm); // WHERE content LIKE
  if (boardId) {
    params.push(boardId);
  }
  params.push(...filterParams); // 필터 키워드 파라미터
  params.push(pageSize);
  params.push(offset);

  // 검색 결과 조회
  const [rows] = await pool.query<SearchResultRow[]>(sql, params);
  
  // 디버깅: rows 확인
  console.log('검색 쿼리 결과 rows 개수:', rows.length);
  console.log('검색 쿼리 결과 rows 샘플:', rows.slice(0, 2));
  
  const results = rows.map(toSearchResult);
  
  // 디버깅: 변환된 results 확인
  console.log('변환된 results 개수:', results.length);
  console.log('변환된 results 샘플:', results.slice(0, 2));

  // 총 결과 수 계산
  const countSql = `
    SELECT COUNT(DISTINCT p.post_id) AS total
    FROM ${POSTS_TABLE} AS p
    WHERE p.status IN ('published', 'edited')
      AND (p.title LIKE ? OR p.content LIKE ?)
      ${boardFilter}
      ${filterKeywordConditions}
  `;

  const countParams: any[] = [searchTerm, searchTerm];
  if (boardId) {
    countParams.push(boardId);
  }
  countParams.push(...filterParams); // 필터 키워드 파라미터

  const [countRows] = await pool.query<RowDataPacket[]>(countSql, countParams);
  const totalResults = (countRows[0]?.total as number) || 0;
  const totalPages = Math.ceil(totalResults / pageSize);

  return {
    results,
    pagination: {
      currentPage: page,
      pageSize,
      totalResults,
      totalPages,
    },
  };
}

