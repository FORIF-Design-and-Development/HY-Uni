import { Router } from 'express';
import { cafeteriaController } from '../../controllers/campus/cafeteria.controller.js';

const router = Router();

router.get('/today', cafeteriaController.getTodayMenus.bind(cafeteriaController)); // 오늘의 학식

// 캐시 관리 (관리자용) 우선 db연동이 아니라 cache 방식으로 테스트 해서 추후 수정 예정
router.get('/cache/status', cafeteriaController.getCacheStatus.bind(cafeteriaController));
router.post('/cache/refresh', cafeteriaController.refreshCache.bind(cafeteriaController));


export default router;

/*
==============================================

# 오늘의 전체 메뉴
curl "http://localhost:3000/api/menus/today"

# 오늘의 중식만
curl "http://localhost:3000/api/menus/today?meal_time=lunch"

# 오늘의 석식만
curl "http://localhost:3000/api/menus/today?meal_time=dinner"

==============================================
*/