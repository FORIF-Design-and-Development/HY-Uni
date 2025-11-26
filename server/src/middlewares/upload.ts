import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  UPLOAD_IMAGES_DIR,
  UPLOAD_VIDEOS_DIR,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
} from '../config/upload';

// 업로드 디렉토리 생성 (없으면)
[UPLOAD_IMAGES_DIR, UPLOAD_VIDEOS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 파일명 생성 함수
function generateFilename(originalname: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const ext = path.extname(originalname);
  return `${timestamp}-${random}${ext}`;
}

// 이미지 저장 설정
const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_IMAGES_DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, generateFilename(file.originalname));
  },
});

// 동영상 저장 설정
const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_VIDEOS_DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, generateFilename(file.originalname));
  },
});

// 파일 타입 검증 함수
function imageFileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `허용되지 않은 이미지 타입입니다. 허용 타입: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
      ),
    );
  }
}

function videoFileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  if (ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `허용되지 않은 동영상 타입입니다. 허용 타입: ${ALLOWED_VIDEO_TYPES.join(', ')}`,
      ),
    );
  }
}

// 이미지 업로드 미들웨어 (최대 5개)
export const uploadImages = multer({
  storage: imageStorage,
  limits: {
    fileSize: MAX_IMAGE_SIZE,
  },
  fileFilter: imageFileFilter,
}).array('images', 5); // 필드명: images, 최대 5개

// 동영상 업로드 미들웨어 (최대 1개)
export const uploadVideos = multer({
  storage: videoStorage,
  limits: {
    fileSize: MAX_VIDEO_SIZE,
  },
  fileFilter: videoFileFilter,
}).array('videos', 1); // 필드명: videos, 최대 1개

// 통합 저장소 (필드명에 따라 다른 디렉토리 사용)
const combinedStorage = multer.diskStorage({
  destination: (_req, file, cb) => {
    if (file.fieldname === 'images') {
      cb(null, UPLOAD_IMAGES_DIR);
    } else if (file.fieldname === 'videos') {
      cb(null, UPLOAD_VIDEOS_DIR);
    } else {
      cb(new Error('Unknown field name'), '');
    }
  },
  filename: (_req, file, cb) => {
    cb(null, generateFilename(file.originalname));
  },
});

// 통합 파일 필터
function combinedFileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  if (file.fieldname === 'images') {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `허용되지 않은 이미지 타입입니다. 허용 타입: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
        ),
      );
    }
  } else if (file.fieldname === 'videos') {
    if (ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `허용되지 않은 동영상 타입입니다. 허용 타입: ${ALLOWED_VIDEO_TYPES.join(', ')}`,
        ),
      );
    }
  } else {
    cb(new Error('Unknown field name'));
  }
}

// 이미지와 동영상을 함께 업로드하는 미들웨어
export const uploadFiles = multer({
  storage: combinedStorage,
  fileFilter: combinedFileFilter,
  limits: {
    fileSize: Math.max(MAX_IMAGE_SIZE, MAX_VIDEO_SIZE),
  },
}).fields([
  { name: 'images', maxCount: 5 },
  { name: 'videos', maxCount: 1 },
]);

