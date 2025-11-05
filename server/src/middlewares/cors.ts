import cors from 'cors';
import type { CorsOptions } from 'cors';

const corsOptions: CorsOptions = {
  origin: process.env.CORS_ORIGINS?.split(',') ?? '*',
  credentials: true,
};

export const corsMiddleware = cors(corsOptions);