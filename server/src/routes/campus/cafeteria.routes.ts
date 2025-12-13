import { Router } from 'express';
import { cafeteriaController } from '../../controllers/campus/cafeteria.controller';
import { requireAuth } from '../../middlewares/error';

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

// ===== 🆕 리뷰 API 추가 =====

// 2-10-5. 식당 리뷰 목록 조회
// GET /api/cafeterias/{cafeteria_id}/reviews
router.get('/:cafeteria_id/reviews', cafeteriaController.getCafeteriaReviews.bind(cafeteriaController));

// 2-10-6. 리뷰 작성 (인증 필요)
// POST /api/cafeterias/{cafeteria_id}/reviews
router.post('/:cafeteria_id/reviews', requireAuth, cafeteriaController.createCafeteriaReview.bind(cafeteriaController));

// 2-10-7. 리뷰 수정 (인증 필요)
// PATCH /api/cafeterias/{cafeteria_id}/reviews/{review_id}
router.patch('/:cafeteria_id/reviews/:review_id', requireAuth, cafeteriaController.updateCafeteriaReview.bind(cafeteriaController));

// 2-10-8. 리뷰 삭제 (인증 필요)
// DELETE /api/cafeterias/{cafeteria_id}/reviews/{review_id}
router.delete('/:cafeteria_id/reviews/:review_id', requireAuth, cafeteriaController.deleteCafeteriaReview.bind(cafeteriaController));

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

⭐ 리뷰 목록 조회
GET /api/cafeterias/{cafeteria_id}/reviews
Query: ?page=1&limit=10&sort=recent
- 특정 식당의 리뷰 목록

✍️ 리뷰 작성 (인증 필요)
POST /api/cafeterias/{cafeteria_id}/reviews
Body: { rating, comment, image_url? }
- 식당 리뷰 작성

✏️ 리뷰 수정 (인증 필요)
PATCH /api/cafeterias/{cafeteria_id}/reviews/{review_id}
Body: { rating?, comment?, image_url? }
- 자신의 리뷰 수정

🗑️ 리뷰 삭제 (인증 필요)
DELETE /api/cafeterias/{cafeteria_id}/reviews/{review_id}
- 자신의 리뷰 삭제

==============================================
🎯 사용 예시
==============================================

# 식당 목록
curl "http://localhost:3000/api/cafeterias"

# 식당 상세 정보 (ID=1)
curl "http://localhost:3000/api/cafeterias/1"

# 특정 식당 전체 메뉴 (ID=1)
curl "http://localhost:3000/api/cafeterias/1/menus"

# 리뷰 목록
curl "http://localhost:3000/api/cafeterias/1/reviews"

# 리뷰 작성 (인증 필요)
curl -X POST \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"rating": 5, "comment": "맛있어요!"}' \
  "http://localhost:3000/api/cafeterias/1/reviews"

# 리뷰 수정 (인증 필요)
curl -X PATCH \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"rating": 4, "comment": "괜찮아요"}' \
  "http://localhost:3000/api/cafeterias/1/reviews/1"

# 리뷰 삭제 (인증 필요)
curl -X DELETE \
  -H "Authorization: Bearer {token}" \
  "http://localhost:3000/api/cafeterias/1/reviews/1"

==============================================
*/