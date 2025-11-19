import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth.store';

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

//공용 axios 인스턴스
export const api = axios.create({
  baseURL,
  withCredentials: true,
});

//accessToken 재발급 중인지 체크
let refreshPromise: Promise<string | null> | null = null;

//accessToken 재발급
async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await axios.post(
          `${baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { user, department, accessToken } = res.data;
        useAuthStore
          .getState()
          .setAuth({ user, department: department ?? null, accessToken });

        return accessToken as string;
      } catch (err) {
        //refresh 실패 → 로그인 정보 초기화
        useAuthStore.getState().clearAuth();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

//요청 인터셉터: accessToken 자동 부착
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

//응답 인터셉터: 401 시 /auth/refresh 호출 후 재시도
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalConfig: any = error.config || {};

    //401이고, 아직 재시도 안 했고, /auth/* 요청이 아닌 경우에만 처리
    const isAuthPath =
      typeof originalConfig.url === "string" &&
      originalConfig.url.includes("/auth/");

    if (status === 401 && !originalConfig._retry && !isAuthPath) {
      originalConfig._retry = true;

      const newToken = await refreshAccessToken();

      if (newToken) {
        originalConfig.headers = originalConfig.headers || {};
        originalConfig.headers.Authorization = `Bearer ${newToken}`;
        return api(originalConfig);
      }
    }

    return Promise.reject(error);
  }
);