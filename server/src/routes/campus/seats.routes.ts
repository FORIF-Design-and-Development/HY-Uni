// server/src/routes/campus/seats.routes.ts
import { Router } from 'express';
import { seatsController } from '../../controllers/campus/seats.controller';

const router = Router();

router.get('/', seatsController.getLibrarySeats.bind(seatsController));

export default router;

// 도서관 좌석 정보 조회 : curl "http://localhost:3000/api/seats"
