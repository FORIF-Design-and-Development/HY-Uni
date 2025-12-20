import { api } from '../axios';

// 업로드 응답 타입
export interface UploadResponse {
  images: Array<{ type: 'IMAGE'; url: string }>;
  videos: Array<{ type: 'VIDEO'; url: string }>;
}

// API 응답 래퍼
interface ApiResponse<T> {
  data: T;
  error: null;
  meta: {
    timestamp: string;
  };
}

/**
 * 파일 업로드
 * @param files 업로드할 파일들 (이미지와 동영상을 분리)
 * @returns 업로드된 파일들의 URL 정보
 */
export async function uploadFiles(files: {
  images?: File[];
  videos?: File[];
}): Promise<UploadResponse> {
  const formData = new FormData();

  // 이미지 파일 추가
  if (files.images && files.images.length > 0) {
    files.images.forEach((file) => {
      formData.append('images', file);
    });
  }

  // 동영상 파일 추가
  if (files.videos && files.videos.length > 0) {
    files.videos.forEach((file) => {
      formData.append('videos', file);
    });
  }

  const response = await api.post<ApiResponse<UploadResponse>>(
    '/community/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data.data;
}

