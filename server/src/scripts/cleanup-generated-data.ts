import dotenv from 'dotenv';
import { pool } from '../config/db';
import { UPLOAD_IMAGES_DIR, UPLOAD_VIDEOS_DIR } from '../config/upload';
import fs from 'fs/promises';
import path from 'path';
import type { RowDataPacket } from 'mysql2/promise';

dotenv.config();

// 삭제 옵션
const CLEANUP_CONFIG = {
  // 최근 N분 이후 생성된 데이터만 삭제 (null이면 모든 생성 데이터 삭제)
  // 예: 60 = 최근 60분(1시간) 이후 생성된 데이터 삭제
  // 합성 데이터 생성 후 바로 삭제하려면 30분 정도로 설정
  deleteAfterMinutes: 30 as number | null,
  // 또는 특정 시간 이후 생성된 데이터만 삭제 (null이면 무시)
  // 예: '2024-01-01 00:00:00' 형식
  deleteAfter: null as string | null,
  // 또는 특정 게시글 ID 범위 삭제
  deletePostIds: null as number[] | null,
};

// 특정 시간 이후 생성된 게시글 ID 조회
async function getPostIdsToDelete(): Promise<number[]> {
  if (CLEANUP_CONFIG.deletePostIds) {
    return CLEANUP_CONFIG.deletePostIds;
  }

  let sql = 'SELECT post_id FROM post WHERE 1=1';
  const params: any[] = [];

  if (CLEANUP_CONFIG.deleteAfterMinutes) {
    // 최근 N분 이후 생성된 데이터
    sql += ' AND created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)';
    params.push(CLEANUP_CONFIG.deleteAfterMinutes);
    console.log(`최근 ${CLEANUP_CONFIG.deleteAfterMinutes}분 이후 생성된 게시글을 삭제합니다.`);
  } else if (CLEANUP_CONFIG.deleteAfter) {
    sql += ' AND created_at >= ?';
    params.push(CLEANUP_CONFIG.deleteAfter);
    console.log(`${CLEANUP_CONFIG.deleteAfter} 이후 생성된 게시글을 삭제합니다.`);
  } else {
    // 모든 게시글 조회 (주의: 실제 운영 데이터도 삭제될 수 있음)
    console.warn('⚠️  모든 게시글을 삭제합니다. 주의하세요!');
    console.warn('⚠️  안전을 위해 deleteAfterMinutes 또는 deleteAfter를 설정하는 것을 권장합니다.');
  }

  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  return rows.map(row => row.post_id as number);
}

// 게시글과 관련된 모든 데이터 삭제
async function deletePostWithRelations(postId: number): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. 첨부파일 정보 조회 (파일 삭제를 위해)
    const [attachmentRows] = await connection.query<RowDataPacket[]>(
      `SELECT attachment_id, type, url 
       FROM attachment 
       WHERE post_id = ?`,
      [postId]
    );

    // 2. 첨부파일 파일 시스템에서 삭제
    for (const attachment of attachmentRows) {
      try {
        let filePath: string;
        if (attachment.type === 'image') {
          const filename = (attachment.url as string).replace('/uploads/images/', '');
          filePath = path.join(UPLOAD_IMAGES_DIR, filename);
        } else if (attachment.type === 'video') {
          const filename = (attachment.url as string).replace('/uploads/videos/', '');
          filePath = path.join(UPLOAD_VIDEOS_DIR, filename);
        } else {
          continue;
        }

        try {
          await fs.unlink(filePath);
        } catch (error) {
          // 파일이 없어도 계속 진행
          console.warn(`파일 삭제 실패 (없을 수 있음): ${filePath}`);
        }
      } catch (error) {
        console.warn(`첨부파일 삭제 중 오류: ${attachment.url}`, error);
      }
    }

    // 3. 투표 관련 데이터 삭제
    const [pollRows] = await connection.query<RowDataPacket[]>(
      'SELECT poll_id FROM poll WHERE post_id = ?',
      [postId]
    );

    for (const poll of pollRows) {
      const pollId = poll.poll_id as number;
      
      // poll_vote 삭제
      await connection.execute(
        `DELETE pv FROM poll_vote pv
         INNER JOIN poll_option po ON pv.option_id = po.option_id
         WHERE po.poll_id = ?`,
        [pollId]
      );

      // poll_option 삭제
      await connection.execute(
        'DELETE FROM poll_option WHERE poll_id = ?',
        [pollId]
      );

      // poll 삭제
      await connection.execute(
        'DELETE FROM poll WHERE poll_id = ?',
        [pollId]
      );
    }

    // 4. 댓글 관련 데이터 삭제
    // comment_reaction 삭제 (대댓글부터)
    await connection.execute(
      `DELETE cr FROM comment_reaction cr
       INNER JOIN comment c ON cr.comment_id = c.comment_id
       WHERE c.post_id = ?`,
      [postId]
    );

    // 대댓글(자식 댓글) 먼저 삭제
    await connection.execute(
      `DELETE FROM comment 
       WHERE post_id = ? AND parent_comment_id IS NOT NULL`,
      [postId]
    );

    // 부모 댓글 삭제
    await connection.execute(
      'DELETE FROM comment WHERE post_id = ?',
      [postId]
    );

    // 5. 게시글 관련 데이터 삭제
    // post_reaction 삭제
    await connection.execute(
      'DELETE FROM post_reaction WHERE post_id = ?',
      [postId]
    );

    // scrap 삭제
    await connection.execute(
      'DELETE FROM scrap WHERE post_id = ?',
      [postId]
    );

    // attachment 삭제
    await connection.execute(
      'DELETE FROM attachment WHERE post_id = ?',
      [postId]
    );

    // post_tag 삭제
    await connection.execute(
      'DELETE FROM post_tag WHERE post_id = ?',
      [postId]
    );

    // post 삭제
    await connection.execute(
      'DELETE FROM post WHERE post_id = ?',
      [postId]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// 메인 실행 함수
async function main() {
  console.log('생성된 합성 데이터 삭제 시작...\n');

  try {
    // 삭제할 게시글 ID 조회
    console.log('1. 삭제할 게시글 조회 중...');
    const postIds = await getPostIdsToDelete();
    
    if (postIds.length === 0) {
      console.log('   삭제할 게시글이 없습니다.');
      return;
    }

    console.log(`   ✓ 삭제할 게시글: ${postIds.length}개`);
    console.log(`   ⚠️  이 작업은 되돌릴 수 없습니다!\n`);

    // 사용자 확인 (자동 실행이므로 바로 진행)
    console.log('2. 게시글 및 관련 데이터 삭제 중...');

    let deletedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < postIds.length; i++) {
      const postId = postIds[i];
      if (!postId) continue;

      try {
        await deletePostWithRelations(postId);
        deletedCount++;
      } catch (error) {
        errorCount++;
        console.error(`게시글 ${postId} 삭제 실패:`, error);
      }

      if ((i + 1) % 50 === 0) {
        console.log(`   진행률: ${i + 1}/${postIds.length} (성공: ${deletedCount}, 실패: ${errorCount})`);
      }
    }

    console.log(`\n✅ 삭제 완료!`);
    console.log(`   - 성공: ${deletedCount}개`);
    console.log(`   - 실패: ${errorCount}개`);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

