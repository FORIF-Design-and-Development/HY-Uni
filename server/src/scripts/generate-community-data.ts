import dotenv from 'dotenv';
import { pool } from '../config/db';
import { createPostWithRelations, CreatePostPayload, togglePostReaction, togglePostScrap } from '../models/community/post.model';
import { createComment, createReply, CreateCommentPayload, CreateReplyPayload } from '../models/community/comment.model';
import { findBoardById } from '../models/community/board.model';
import { UPLOAD_IMAGES_DIR, UPLOAD_IMAGES_URL, UPLOAD_VIDEOS_DIR, UPLOAD_VIDEOS_URL } from '../config/upload';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import https from 'https';
import type { RowDataPacket } from 'mysql2/promise';

dotenv.config();

// 합성 데이터 생성 옵션
const GENERATION_CONFIG = {
  postsToCreate: 100, // 새로 생성할 게시글 수
  commentsPerPost: { min: 0, max: 10 }, // 게시글당 댓글 수
  repliesPerComment: { min: 0, max: 3 }, // 댓글당 대댓글 수
  reactionsPerPost: { min: 0, max: 50 }, // 게시글당 좋아요/싫어요 수
  scrapsPerPost: { min: 0, max: 20 }, // 게시글당 스크랩 수
  imageAttachmentProbability: 0.4, // 40% 확률로 이미지 첨부
  videoAttachmentProbability: 0.1, // 10% 확률로 동영상 첨부
};

// 제목 템플릿 (한국어)
const TITLE_TEMPLATES = [
  '{subject} 관련 질문이 있습니다',
  '{subject} 추천해주세요',
  '{subject} 후기 공유합니다',
  '{subject} 정보 공유합니다',
  '{subject} 모집합니다',
  '{subject} 어떻게 생각하세요?',
  '{subject} 도와주세요',
  '{subject} 궁금한 점이 있어요',
  '{subject} 경험담 공유',
  '{subject} 알려드립니다',
];

// 제목 템플릿 (영어)
const TITLE_TEMPLATES_EN = [
  'Question about {subject}',
  'Recommend {subject}',
  'Sharing my experience with {subject}',
  'Information about {subject}',
  'Looking for {subject}',
  'What do you think about {subject}?',
  'Need help with {subject}',
  'I have a question about {subject}',
  'Sharing my story about {subject}',
  'Let me tell you about {subject}',
];

// 내용 템플릿 (한국어)
const CONTENT_TEMPLATES = [
  '안녕하세요! {subject}에 대해 궁금한 점이 있어서 글을 남깁니다.\n\n{details}\n\n도움 주시면 감사하겠습니다!',
  '{subject}에 대한 정보를 공유하고 싶어서 글을 작성합니다.\n\n{details}\n\n참고가 되셨으면 좋겠습니다.',
  '{subject} 후기를 남깁니다.\n\n{details}\n\n도움이 되셨으면 좋겠습니다!',
  '{subject} 모집합니다!\n\n{details}\n\n관심 있으신 분들 연락 주세요.',
  '{subject}에 대해 여러분의 의견을 듣고 싶습니다.\n\n{details}\n\n많은 참여 부탁드립니다.',
];

// 내용 템플릿 (영어)
const CONTENT_TEMPLATES_EN = [
  'Hello! I have a question about {subject}.\n\n{details}\n\nThank you for your help!',
  'I would like to share some information about {subject}.\n\n{details}\n\nI hope this is helpful.',
  'Sharing my experience with {subject}.\n\n{details}\n\nI hope this helps!',
  'Looking for {subject}!\n\n{details}\n\nPlease contact me if you are interested.',
  'I would like to hear your opinions about {subject}.\n\n{details}\n\nPlease participate!',
];

// 댓글 템플릿
const COMMENT_TEMPLATES = [
  '좋은 정보 감사합니다!',
  '도움이 많이 되었어요.',
  '저도 비슷한 경험이 있습니다.',
  '추가로 궁금한 점이 있어요.',
  '공감합니다.',
  '좋은 글 감사합니다.',
  '도움이 되었습니다.',
  '유용한 정보네요!',
];

// 랜덤 요소 선택
function getRandomElement<T>(array: T[]): T {
  if (array.length === 0) {
    throw new Error('Cannot get random element from empty array');
  }
  return array[Math.floor(Math.random() * array.length)]!;
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 실제 DB에서 사용자 ID 목록 조회
async function getAllUserIds(): Promise<number[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT user_id FROM user WHERE status = "active" ORDER BY user_id'
  );
  return rows.map(row => row.user_id as number);
}

// 게시판 정보 타입
interface BoardInfo {
  boardId: number;
  name: string;
}

// 이미지에 나온 5개 게시판만 필터링하여 조회
async function getAllBoardIds(): Promise<number[]> {
  const boardInfos = await getTargetBoards();
  return boardInfos.map(board => board.boardId);
}

// 이미지에 나온 5개 게시판 정보 조회 (자유, 동아리, 취업/진로, 단과대/학과, International)
async function getTargetBoards(): Promise<BoardInfo[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT board_id, name FROM board WHERE parent_board_id IS NULL ORDER BY board_id'
  );
  
  const targetBoards = rows
    .map(row => ({
      boardId: row.board_id as number,
      name: row.name as string,
    }))
    .filter(board => {
      const name = board.name;
      return (
        name.includes('자유') ||
        name.includes('동아리') ||
        name.includes('취업') ||
        name.includes('진로') ||
        name.includes('단과대') ||
        name.includes('학과') ||
        name.includes('International')
      );
    });
  
  return targetBoards;
}

// 게시판이 International Board인지 확인
function isInternationalBoard(boardName: string): boolean {
  return boardName.includes('International');
}

// 특정 게시판의 실제 태그 ID 목록 조회
async function getTagsByBoardId(boardId: number): Promise<number[]> {
  // 하위 게시판의 경우 부모 게시판의 태그를 사용
  const [boardRows] = await pool.query<RowDataPacket[]>(
    'SELECT COALESCE(parent_board_id, board_id) as target_board_id FROM board WHERE board_id = ?',
    [boardId]
  );
  
  if (boardRows.length === 0) return [];
  
  const firstRow = boardRows[0];
  if (!firstRow) return [];
  
  const targetBoardId = firstRow.target_board_id as number;
  
  const [tagRows] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT t.tag_id 
     FROM tag t
     INNER JOIN board_tag bt ON t.tag_id = bt.tag_id
     WHERE bt.board_id = ?
     ORDER BY t.tag_id`,
    [targetBoardId]
  );
  
  return tagRows.map(row => row.tag_id as number);
}

// 태그 이름 조회
async function getTagNames(tagIds: number[]): Promise<string[]> {
  if (tagIds.length === 0) return [];
  
  const placeholders = tagIds.map(() => '?').join(',');
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT name FROM tag WHERE tag_id IN (${placeholders})`,
    tagIds
  );
  return rows.map(row => row.name as string);
}

// 실제 DB에서 게시글 ID 목록 조회 (댓글 작성용)
async function getAllPostIds(): Promise<number[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT post_id FROM post WHERE status IN ("published", "edited") ORDER BY post_id'
  );
  return rows.map(row => row.post_id as number);
}

// 랜덤 제목 생성
function generateTitle(availableTags: string[], isEnglish: boolean = false): string {
  const subject = availableTags.length > 0 
    ? getRandomElement(availableTags) 
    : (isEnglish ? 'Post' : '게시글');
  const templates = isEnglish ? TITLE_TEMPLATES_EN : TITLE_TEMPLATES;
  const template = getRandomElement(templates);
  return template.replace('{subject}', subject);
}

// 한글 상세 내용 템플릿
const DETAIL_TEMPLATES_KO = [
  '최근에 {subject}에 대해 관심을 갖게 되었는데, 여러분의 경험이나 조언이 궁금합니다. 특히 실용적인 팁이나 주의사항이 있다면 알려주시면 감사하겠습니다.',
  '{subject}에 대한 정보를 찾고 있는데, 인터넷에서 찾은 정보만으로는 부족한 것 같아서 직접 물어보게 되었습니다. 실제로 경험해보신 분들의 솔직한 후기를 듣고 싶습니다.',
  '{subject}를 계획하고 있는데, 처음 접하는 분야라서 막막한 상황입니다. 어떤 것부터 시작해야 할지, 어떤 점을 주의해야 할지 조언을 구하고 싶습니다.',
  '{subject}에 대해 여러 가지 의견이 있는 것 같은데, 실제로는 어떤지 궁금합니다. 좋은 점과 아쉬운 점 모두 솔직하게 들려주시면 도움이 될 것 같습니다.',
  '{subject}를 추천받았는데, 실제로 사용해보신 분들의 후기가 궁금합니다. 특히 초보자가 알아두면 좋을 점이나 주의할 점이 있다면 알려주세요.',
  '{subject}에 대해 공부하고 있는데, 이해가 잘 안 되는 부분이 있어서 질문드립니다. 비슷한 경험이 있으신 분들께 도움을 요청드립니다.',
  '{subject}를 고려하고 있는데, 여러 옵션 중에서 어떤 것이 좋을지 고민이 됩니다. 각각의 장단점이나 추천하는 이유를 알려주시면 감사하겠습니다.',
  '{subject}에 대한 정보를 공유하고 싶어서 글을 작성합니다. 제 경험을 바탕으로 도움이 될 만한 내용을 정리해봤으니 참고하시면 좋을 것 같습니다.',
];

// 영어 상세 내용 템플릿
const DETAIL_TEMPLATES_EN = [
  'I recently became interested in {subject} and would like to hear about your experiences or advice. If you have any practical tips or things to watch out for, please let me know.',
  'I am looking for information about {subject}, but what I found online seems insufficient, so I decided to ask directly. I would like to hear honest reviews from those who have actually experienced it.',
  'I am planning to do {subject}, but since this is my first time in this field, I feel lost. I would like advice on where to start and what to be careful about.',
  'There seem to be various opinions about {subject}, and I am curious about what it is actually like. I would appreciate it if you could honestly share both the good and bad points.',
  'I was recommended {subject}, and I would like to hear reviews from those who have actually used it. If there are any tips or things to watch out for, especially for beginners, please let me know.',
  'I am studying {subject}, but there are parts I do not understand well, so I am asking for help. I would appreciate help from those who have had similar experiences.',
  'I am considering {subject}, but I am having trouble deciding which option would be best among several. I would appreciate it if you could tell me the pros and cons of each or why you recommend it.',
  'I would like to share information about {subject}. I have organized some helpful content based on my experience, so I hope it will be useful.',
];

// 랜덤 내용 생성
function generateContent(availableTags: string[], isEnglish: boolean = false): string {
  const subject = availableTags.length > 0 
    ? getRandomElement(availableTags) 
    : (isEnglish ? 'Post' : '게시글');
  const templates = isEnglish ? CONTENT_TEMPLATES_EN : CONTENT_TEMPLATES;
  const template = getRandomElement(templates);
  
  // 상세 내용 생성 (3개 문단)
  const detailTemplates = isEnglish ? DETAIL_TEMPLATES_EN : DETAIL_TEMPLATES_KO;
  const details = Array.from({ length: 3 }, () => {
    const detailTemplate = getRandomElement(detailTemplates);
    return detailTemplate.replace('{subject}', subject);
  }).join('\n\n');
  
  return template.replace('{subject}', subject).replace('{details}', details);
}

// 랜덤 댓글 생성
function generateComment(): string {
  return getRandomElement(COMMENT_TEMPLATES);
}

// 파일명 생성
function generateFilename(extension: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}.${extension}`;
}

// Placeholder 이미지 다운로드 (picsum.photos 사용)
async function downloadPlaceholderImage(
  filename: string, 
  width: number = 800, 
  height: number = 600
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = `https://picsum.photos/${width}/${height}?random=${Date.now()}`;
    const filePath = path.join(UPLOAD_IMAGES_DIR, filename);
    
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // 리다이렉트 처리
        const redirectUrl = response.headers.location;
        if (!redirectUrl) {
          reject(new Error('Redirect location not found'));
          return;
        }
        https.get(redirectUrl, (redirectResponse) => {
          if (redirectResponse.statusCode !== 200) {
            reject(new Error(`Failed to download image: ${redirectResponse.statusCode}`));
            return;
          }
          const fileStream = fsSync.createWriteStream(filePath);
          redirectResponse.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close();
            resolve(`${UPLOAD_IMAGES_URL}/${filename}`);
          });
          fileStream.on('error', reject);
        }).on('error', reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }

      const fileStream = fsSync.createWriteStream(filePath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve(`${UPLOAD_IMAGES_URL}/${filename}`);
      });

      fileStream.on('error', reject);
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// 샘플 동영상 파일 복사 (있는 경우)
async function copySampleVideo(filename: string): Promise<string | null> {
  try {
    // 기존 동영상 파일 확인
    const existingVideos = await fs.readdir(UPLOAD_VIDEOS_DIR);
    const videoFiles = existingVideos.filter(f => 
      f.endsWith('.mp4') && !f.startsWith('.')
    );
    
    if (videoFiles.length > 0) {
      // 랜덤으로 하나 선택하여 복사
      const sourceFile = videoFiles[Math.floor(Math.random() * videoFiles.length)];
      if (!sourceFile) return null;
      const sourcePath = path.join(UPLOAD_VIDEOS_DIR, sourceFile);
      const destPath = path.join(UPLOAD_VIDEOS_DIR, filename);
      
      await fs.copyFile(sourcePath, destPath);
      return `${UPLOAD_VIDEOS_URL}/${filename}`;
    }
    
    return null;
  } catch (error) {
    console.error('동영상 복사 실패:', error);
    return null;
  }
}

// 첨부파일 생성
async function generateAttachments(title: string): Promise<Array<{ type: 'IMAGE' | 'VIDEO'; url: string }>> {
  const attachments: Array<{ type: 'IMAGE' | 'VIDEO'; url: string }> = [];

  // 이미지 첨부 (40% 확률)
  if (Math.random() < GENERATION_CONFIG.imageAttachmentProbability) {
    const numImages = Math.floor(Math.random() * 3) + 1; // 1-3개
    const imageSizes = [
      { width: 800, height: 600 },
      { width: 1200, height: 800 },
      { width: 600, height: 400 },
    ];
    
    for (let i = 0; i < numImages; i++) {
      try {
        const filename = generateFilename('jpg');
        const size = imageSizes[Math.floor(Math.random() * imageSizes.length)];
        if (!size) continue;
        const imageUrl = await downloadPlaceholderImage(filename, size.width, size.height);
        attachments.push({ type: 'IMAGE', url: imageUrl });
      } catch (error) {
        console.warn(`이미지 생성 실패 (${i + 1}/${numImages}):`, error);
        // 실패해도 계속 진행
      }
    }
  }

  // 동영상 첨부 (10% 확률, 이미지가 있을 때만)
  if (attachments.length > 0 && Math.random() < GENERATION_CONFIG.videoAttachmentProbability) {
    try {
      const filename = generateFilename('mp4');
      const videoUrl = await copySampleVideo(filename);
      if (videoUrl) {
        attachments.push({ type: 'VIDEO', url: videoUrl });
      }
    } catch (error) {
      console.warn('동영상 생성 실패:', error);
      // 동영상 실패는 무시하고 계속 진행
    }
  }

  return attachments;
}

// 게시글 생성
async function generatePost(
  userIds: number[],
  boardIds: number[]
): Promise<number | null> {
  if (userIds.length === 0 || boardIds.length === 0) {
    console.warn('사용자 또는 게시판이 없어 게시글을 생성할 수 없습니다.');
    return null;
  }

  const userId = getRandomElement(userIds);
  const boardId = getRandomElement(boardIds);
  
  // 게시판 정보 조회 (이름 확인용)
  const boardInfos = await getTargetBoards();
  const boardInfo = boardInfos.find(b => b.boardId === boardId);
  const boardName = boardInfo?.name || '';
  const isInternational = isInternationalBoard(boardName);
  
  // 해당 게시판의 태그 조회
  const availableTagIds = await getTagsByBoardId(boardId);
  const tagNames = await getTagNames(availableTagIds);
  
  // International Board일 경우 영어로 생성
  const title = generateTitle(tagNames, isInternational);
  const content = generateContent(tagNames, isInternational);
  const isAnonymous = Math.random() > 0.2; // 80% 익명
  
  // 무조건 태그 선택 (1-3개, 최소 1개)
  if (availableTagIds.length === 0) {
    console.warn(`게시판 ${boardId}에 태그가 없어 게시글을 생성할 수 없습니다.`);
    return null;
  }
  const numTags = Math.min(getRandomInt(1, 3), availableTagIds.length);
  const selectedTagIds = availableTagIds
    .sort(() => Math.random() - 0.5)
    .slice(0, numTags);
  
  // 첨부파일 생성
  const attachments = await generateAttachments(title);
  
  // 20% 확률로 투표 포함
  const hasPoll = Math.random() > 0.8;
  const poll = hasPoll ? {
    question: isInternational 
      ? `I would like to hear your opinion about ${title}.`
      : `${title}에 대한 의견을 듣고 싶습니다.`,
    options: isInternational
      ? [
          'Strongly Agree',
          'Agree',
          'Neutral',
          'Disagree',
          'Strongly Disagree'
        ]
      : [
          '매우 동의합니다',
          '동의합니다',
          '보통입니다',
          '반대합니다',
          '매우 반대합니다'
        ],
    expiredAt: null,
  } : null;
  
  const payload: CreatePostPayload = {
    userId,
    boardId,
    title,
    content,
    isAnonymous,
    tagIds: selectedTagIds,
    attachments,
    poll,
  };
  
  try {
    const result = await createPostWithRelations(payload);
    return result.postId;
  } catch (error) {
    console.error(`게시글 생성 실패:`, error);
    return null;
  }
}

// 댓글 생성
async function generateComments(
  postId: number,
  userIds: number[]
): Promise<void> {
  if (userIds.length === 0) return;
  
  const numComments = getRandomInt(
    GENERATION_CONFIG.commentsPerPost.min,
    GENERATION_CONFIG.commentsPerPost.max
  );
  
  for (let i = 0; i < numComments; i++) {
    const userId = getRandomElement(userIds);
    const content = generateComment();
    const isAnonymous = Math.random() > 0.2; // 80% 익명
    const isSecret = Math.random() > 0.9; // 10% 비밀댓글
    
    const payload: CreateCommentPayload = {
      postId,
      userId,
      content,
      isAnonymous,
      isSecret,
    };
    
    try {
      const result = await createComment(payload);
      
      // 대댓글 생성 (30% 확률)
      if (Math.random() > 0.7) {
        const numReplies = getRandomInt(
          GENERATION_CONFIG.repliesPerComment.min,
          GENERATION_CONFIG.repliesPerComment.max
        );
        
        for (let j = 0; j < numReplies; j++) {
          const replyUserId = getRandomElement(userIds);
          const replyContent = generateComment();
          const replyIsAnonymous = Math.random() > 0.2; // 80% 익명
          const replyIsSecret = Math.random() > 0.9;
          
          const replyPayload: CreateReplyPayload = {
            parentCommentId: result.commentId,
            userId: replyUserId,
            content: replyContent,
            isAnonymous: replyIsAnonymous,
            isSecret: replyIsSecret,
          };
          
          try {
            await createReply(replyPayload);
          } catch (error) {
            // 이미 대댓글이 있거나 다른 오류는 무시
            if (!(error as any).message?.includes('INVALID_PARENT_COMMENT')) {
              console.error(`대댓글 생성 실패:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error(`댓글 생성 실패:`, error);
    }
  }
}

// 게시글 반응 생성 (좋아요/싫어요)
async function generateReactions(
  postId: number,
  userIds: number[]
): Promise<void> {
  if (userIds.length === 0) return;
  
  const numReactions = getRandomInt(
    GENERATION_CONFIG.reactionsPerPost.min,
    GENERATION_CONFIG.reactionsPerPost.max
  );
  
  // 중복 방지를 위한 Set 사용
  const usedUserIds = new Set<number>();
  
  for (let i = 0; i < numReactions && usedUserIds.size < userIds.length; i++) {
    let userId: number;
    do {
      userId = getRandomElement(userIds);
    } while (usedUserIds.has(userId));
    
    usedUserIds.add(userId);
    
    const reactionType = Math.random() > 0.1 ? 'like' : 'dislike'; // 90% 좋아요, 10% 싫어요
    
    try {
      await togglePostReaction(postId, userId, reactionType);
    } catch (error) {
      // 이미 반응이 있으면 무시
      const errorMessage = (error as any).message || '';
      if (!errorMessage.includes('ALREADY') && !errorMessage.includes('POST_NOT_FOUND')) {
        console.error(`반응 생성 실패:`, error);
      }
    }
  }
}

// 게시글 스크랩 생성
async function generateScraps(
  postId: number,
  userIds: number[]
): Promise<void> {
  if (userIds.length === 0) return;
  
  const numScraps = getRandomInt(
    GENERATION_CONFIG.scrapsPerPost.min,
    GENERATION_CONFIG.scrapsPerPost.max
  );
  
  const usedUserIds = new Set<number>();
  
  for (let i = 0; i < numScraps && usedUserIds.size < userIds.length; i++) {
    let userId: number;
    do {
      userId = getRandomElement(userIds);
    } while (usedUserIds.has(userId));
    
    usedUserIds.add(userId);
    
    try {
      await togglePostScrap(postId, userId);
    } catch (error) {
      // 이미 스크랩이 있으면 무시
      const errorMessage = (error as any).message || '';
      if (!errorMessage.includes('ALREADY') && !errorMessage.includes('POST_NOT_FOUND')) {
        console.error(`스크랩 생성 실패:`, error);
      }
    }
  }
}

// 기존 게시글에 댓글/반응 추가
async function enrichExistingPosts(
  postIds: number[],
  userIds: number[]
): Promise<void> {
  console.log(`\n4. 기존 게시글 ${postIds.length}개에 댓글/반응 추가 중...`);
  
  // 랜덤으로 일부 게시글만 선택 (전체의 30%)
  const selectedPostIds = postIds
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.floor(postIds.length * 0.3));
  
  for (let i = 0; i < selectedPostIds.length; i++) {
    const postId = selectedPostIds[i];
    if (!postId) continue;
    
    // 순차 처리로 변경 (데드락 방지)
    try {
      await generateComments(postId, userIds);
    } catch (error) {
      // 에러는 무시하고 계속 진행
    }
    
    try {
      await generateReactions(postId, userIds);
    } catch (error) {
      // 에러는 무시하고 계속 진행
    }
    
    try {
      await generateScraps(postId, userIds);
    } catch (error) {
      // 에러는 무시하고 계속 진행
    }
    
    if ((i + 1) % 10 === 0) {
      console.log(`   진행률: ${i + 1}/${selectedPostIds.length}`);
    }
  }
  
  console.log(`   ✓ 완료: ${selectedPostIds.length}개 게시글 보강`);
}

// 메인 실행 함수
async function main() {
  console.log('커뮤니티 합성 데이터 생성 시작...\n');
  
  try {
    // 업로드 디렉토리 확인
    await fs.mkdir(UPLOAD_IMAGES_DIR, { recursive: true });
    await fs.mkdir(UPLOAD_VIDEOS_DIR, { recursive: true });
    
    // 실제 DB 데이터 조회
    console.log('1. 실제 DB 데이터 조회 중...');
    const userIds = await getAllUserIds();
    const boardIds = await getAllBoardIds();
    const existingPostIds = await getAllPostIds();
    
    console.log(`   ✓ 사용자: ${userIds.length}명`);
    console.log(`   ✓ 게시판: ${boardIds.length}개`);
    console.log(`   ✓ 기존 게시글: ${existingPostIds.length}개`);
    
    if (userIds.length === 0) {
      console.error('❌ 사용자가 없습니다. 먼저 사용자를 생성해주세요.');
      process.exit(1);
    }
    
    if (boardIds.length === 0) {
      console.error('❌ 게시판이 없습니다. 먼저 게시판을 생성해주세요.');
      process.exit(1);
    }
    
    // 새 게시글 생성
    console.log(`\n2. 새 게시글 ${GENERATION_CONFIG.postsToCreate}개 생성 중...`);
    const newPostIds: number[] = [];
    
    // 이미지 다운로드 때문에 배치 크기를 작게 설정
    const batchSize = 5;
    for (let i = 0; i < GENERATION_CONFIG.postsToCreate; i += batchSize) {
      const batch = [];
      for (let j = 0; j < batchSize && i + j < GENERATION_CONFIG.postsToCreate; j++) {
        batch.push(generatePost(userIds, boardIds));
      }
      
      const results = await Promise.all(batch);
      const createdPostIds = results.filter((id): id is number => id !== null);
      newPostIds.push(...createdPostIds);
      
      if ((i + batchSize) % 50 === 0 || i + batchSize >= GENERATION_CONFIG.postsToCreate) {
        console.log(`   진행률: ${Math.min(i + batchSize, GENERATION_CONFIG.postsToCreate)}/${GENERATION_CONFIG.postsToCreate} (생성: ${newPostIds.length}개)`);
      }
    }
    
    console.log(`   ✓ 생성 완료: ${newPostIds.length}개`);
    
    // 새 게시글에 댓글/반응 추가 (순차 처리로 데드락 방지)
    console.log(`\n3. 새 게시글에 댓글/반응 추가 중...`);
    for (let i = 0; i < newPostIds.length; i++) {
      const postId = newPostIds[i];
      if (!postId) continue;
      
      // 순차 처리로 변경 (데드락 방지)
      try {
        await generateComments(postId, userIds);
      } catch (error) {
        // 에러는 무시하고 계속 진행
      }
      
      try {
        await generateReactions(postId, userIds);
      } catch (error) {
        // 에러는 무시하고 계속 진행
      }
      
      try {
        await generateScraps(postId, userIds);
      } catch (error) {
        // 에러는 무시하고 계속 진행
      }
      
      if ((i + 1) % 50 === 0) {
        console.log(`   진행률: ${i + 1}/${newPostIds.length}`);
      }
    }
    console.log(`   ✓ 완료: ${newPostIds.length}개 게시글에 댓글/반응 추가`);
    
    // 기존 게시글에 댓글/반응 추가
    if (existingPostIds.length > 0) {
      await enrichExistingPosts(existingPostIds, userIds);
    }
    
    console.log('\n✅ 모든 합성 데이터 생성 완료!');
    console.log(`   - 새 게시글: ${newPostIds.length}개`);
    console.log(`   - 기존 게시글 보강: ${existingPostIds.length > 0 ? Math.floor(existingPostIds.length * 0.3) : 0}개`);
    
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

