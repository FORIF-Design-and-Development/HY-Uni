import { Router } from 'express';
import { cafeteriaController } from '../../controllers/campus/cafeteria.controller';

const router = Router();

// 2-10-1. 식당 목록 조회(List)
// GET /api/cafeterias
router.get('/', cafeteriaController.getCafeteriaList.bind(cafeteriaController));

// 2-10-2. 식당 상세 조회(Read)
// GET /api/cafeterias/{cafeteria_id}
router.get('/:cafeteria_id', cafeteriaController.getCafeteriaDetail.bind(cafeteriaController));

// 2-10-4. 특정 식당 메뉴 조회 (List)
// GET /api/cafeterias/{cafeteria_id}/menus  
router.get('/:cafeteria_id/menus', cafeteriaController.getCafeteriaMenus.bind(cafeteriaController));

export default router;

/*
==============================================
🍽️ Cafeteria API 엔드포인트 (명세서 준수)
==============================================

📍 기본 URL: /api/cafeterias

📋 식당 목록 조회
GET /api/cafeterias
- 모든 식당 목록과 기본 정보

🏪 식당 상세 조회  
GET /api/cafeterias/{cafeteria_id}
- 특정 식당의 상세 정보

🍽️ 특정 식당 메뉴 조회
GET /api/cafeterias/{cafeteria_id}/menus
Query: ?served_date=2024-10-06&meal_time=lunch
- 특정 식당의 메뉴 정보

==============================================
🎯 사용 예시
==============================================

# 식당 목록
curl "http://localhost:3000/api/cafeterias"

# 식당 상세 정보 (ID=1)
curl "http://localhost:3000/api/cafeterias/1"

# 특정 식당 전체 메뉴 (ID=1)
curl "http://localhost:3000/api/cafeterias/1/menus"

# 특정 식당 중식만 (ID=1)
curl "http://localhost:3000/api/cafeterias/1/menus?meal_time=lunch"

==============================================
*/
