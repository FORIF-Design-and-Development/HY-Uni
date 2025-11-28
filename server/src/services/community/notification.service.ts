import type { Response } from 'express';
import { createNotification } from '../../models/community/notification.model';
import type { NotificationType } from '../../models/community/notification.model';
import { findBoardSubscribers } from '../../models/community/board-subscription.model';
import { findPostAuthorId } from '../../models/community/post.model';
import { findCommentById } from '../../models/community/comment.model';

// SSE 연결을 관리하는 Map
// key: userId, value: Response 객체
const sseConnections = new Map<number, Response>();

// SSE 연결 등록
export function registerSSEConnection(userId: number, res: Response): void {
  // 기존 연결이 있으면 제거
  const existingConnection = sseConnections.get(userId);
  if (existingConnection) {
    try {
      existingConnection.end();
    } catch (error) {
      // 연결이 이미 끊어진 경우 무시
    }
  }

  // SSE 헤더 설정
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // nginx 버퍼링 방지

  // 연결 저장
  sseConnections.set(userId, res);

  // 연결 종료 시 정리
  res.on('close', () => {
    sseConnections.delete(userId);
  });

  // 초기 연결 확인 메시지 전송
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
}

// SSE 연결 해제
export function unregisterSSEConnection(userId: number): void {
  const connection = sseConnections.get(userId);
  if (connection) {
    try {
      connection.end();
    } catch (error) {
      // 에러 무시
    }
    sseConnections.delete(userId);
  }
}

// 특정 사용자에게 알림 전송
async function sendNotificationToUser(
  userId: number,
  notificationId: number,
  type: NotificationType,
  actorId: number | null,
  entityId: number | null,
): Promise<void> {
  const connection = sseConnections.get(userId);
  if (!connection) {
    return; // 연결이 없으면 무시
  }

  try {
    const data = {
      type: 'notification',
      notification: {
        id: notificationId,
        type,
        actorId,
        entityId,
        createdAt: new Date().toISOString(),
      },
    };
    connection.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch (error) {
    // 연결 오류 시 제거
    console.error(`SSE connection error for user ${userId}:`, error);
    sseConnections.delete(userId);
  }
}

// 알림 생성 및 발송 (게시판 구독자에게)
export async function notifyBoardSubscribers(
  boardId: number,
  actorId: number,
  postId: number,
): Promise<void> {
  try {
    // 게시판 구독자 조회 (작성자 제외)
    const subscribers = await findBoardSubscribers(boardId);

    for (const subscriber of subscribers) {
      // 자기 자신에게는 알림을 보내지 않음
      if (subscriber.userId === actorId) continue;

      // DB에 알림 저장
      const notificationId = await createNotification(
        subscriber.userId,
        actorId,
        'new_post_in_board',
        postId,
      );

      // SSE로 실시간 전송
      await sendNotificationToUser(
        subscriber.userId,
        notificationId,
        'new_post_in_board',
        actorId,
        postId,
      );
    }
  } catch (error) {
    console.error('Failed to notify board subscribers:', error);
    // 알림 실패는 메인 로직에 영향 없도록 에러를 던지지 않음
  }
}

// 게시글 작성자에게 댓글 알림
export async function notifyPostAuthor(
  postId: number,
  actorId: number,
  commentId: number,
): Promise<void> {
  try {
    const postAuthorId = await findPostAuthorId(postId);
    if (!postAuthorId) return;

    // 자기 자신에게는 알림을 보내지 않음
    if (postAuthorId === actorId) return;

    const notificationId = await createNotification(
      postAuthorId,
      actorId,
      'new_comment_on_post',
      postId, // 게시글 ID로 변경
    );

    await sendNotificationToUser(
      postAuthorId,
      notificationId,
      'new_comment_on_post',
      actorId,
      postId, // 게시글 ID로 변경
    );
  } catch (error) {
    console.error('Failed to notify post author:', error);
  }
}

// 댓글 작성자에게 답글 알림
export async function notifyCommentAuthor(
  commentId: number,
  actorId: number,
  replyId: number,
): Promise<void> {
  try {
    const comment = await findCommentById(commentId);
    if (!comment) return;

    // 자기 자신에게는 알림을 보내지 않음
    if (comment.userId === actorId) return;

    const notificationId = await createNotification(
      comment.userId,
      actorId,
      'new_reply_on_comment',
      comment.postId, // 게시글 ID로 변경
    );

    await sendNotificationToUser(
      comment.userId,
      notificationId,
      'new_reply_on_comment',
      actorId,
      comment.postId, // 게시글 ID로 변경
    );
  } catch (error) {
    console.error('Failed to notify comment author:', error);
  }
}

// 게시글 작성자에게 반응 알림
export async function notifyPostReaction(
  postId: number,
  actorId: number,
): Promise<void> {
  try {
    const postAuthorId = await findPostAuthorId(postId);
    if (!postAuthorId) return;

    // 자기 자신에게는 알림을 보내지 않음
    if (postAuthorId === actorId) return;

    const notificationId = await createNotification(
      postAuthorId,
      actorId,
      'new_reaction_on_post',
      postId,
    );

    await sendNotificationToUser(
      postAuthorId,
      notificationId,
      'new_reaction_on_post',
      actorId,
      postId,
    );
  } catch (error) {
    console.error('Failed to notify post reaction:', error);
  }
}

// 댓글 작성자에게 반응 알림
export async function notifyCommentReaction(
  commentId: number,
  actorId: number,
): Promise<void> {
  try {
    const comment = await findCommentById(commentId);
    if (!comment) return;

    // 자기 자신에게는 알림을 보내지 않음
    if (comment.userId === actorId) return;

    const notificationId = await createNotification(
      comment.userId,
      actorId,
      'new_reaction_on_comment',
      comment.postId, // 게시글 ID로 변경
    );

    await sendNotificationToUser(
      comment.userId,
      notificationId,
      'new_reaction_on_comment',
      actorId,
      comment.postId, // 게시글 ID로 변경
    );
  } catch (error) {
    console.error('Failed to notify comment reaction:', error);
  }
}

