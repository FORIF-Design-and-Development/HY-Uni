import path from 'path';

// 업로드 디렉토리 경로 설정
// TODO: 클라우드 사용시 변경
export const UPLOAD_BASE_DIR = path.join(__dirname, '../../uploads');
export const UPLOAD_IMAGES_DIR = path.join(UPLOAD_BASE_DIR, 'images');
export const UPLOAD_VIDEOS_DIR = path.join(UPLOAD_BASE_DIR, 'videos');

// 정적 파일 URL 경로
export const UPLOAD_IMAGES_URL = '/uploads/images';
export const UPLOAD_VIDEOS_URL = '/uploads/videos';

// 파일 크기 제한 (바이트)
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

// 허용 파일 타입
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4'];

// 파일 개수 제한
export const MAX_IMAGE_COUNT = 5;
export const MAX_VIDEO_COUNT = 1;

