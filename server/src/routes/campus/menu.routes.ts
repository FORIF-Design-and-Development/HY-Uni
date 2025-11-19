import { Router } from 'express';
import { cafeteriaController } from '../../controllers/campus/cafeteria.controller';

const router = Router();

// 2-10-3. 오늘의 학식 조회
// GET /api/menus/today
router.get('/today', cafeteriaController.getTodayMenus.bind(cafeteriaController));

export default router;

/*
==============================================
🍽️ Menu API 엔드포인트
==============================================

📍 기본 URL: /api/menus

📋 오늘의 전체 메뉴 조회
GET /api/menus/today
- 모든 식당의 오늘 메뉴

🍚 오늘의 중식만 조회
GET /api/menus/today?meal_time=lunch

🍜 오늘의 석식만 조회
GET /api/menus/today?meal_time=dinner

🥣 오늘의 조식만 조회
GET /api/menus/today?meal_time=breakfast

==============================================
🎯 사용 예시
==============================================

# 오늘의 전체 메뉴
curl "http://localhost:3000/api/menus/today"

# 오늘의 중식만
curl "http://localhost:3000/api/menus/today?meal_time=lunch"

# 오늘의 석식만
curl "http://localhost:3000/api/menus/today?meal_time=dinner"

==============================================
*/