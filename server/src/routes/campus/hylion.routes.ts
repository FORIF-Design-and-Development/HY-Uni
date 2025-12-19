import { Router } from 'express';
import { hylionController } from '../../controllers/campus/hylion.controller';

const router = Router();

// ===== 하이리온 API 엔드포인트 =====

// 1. 하이리온 컬렉션 조회 (인증 필요)
// GET /api/hylion/collection
router.get('/collection', hylionController.getCollection.bind(hylionController));

// 2. 현재 하이리온 변경 (인증 필요)
// PATCH /api/hylion/current-icon
router.patch('/current-icon', hylionController.updateCurrentIcon.bind(hylionController));

// 3. 전체 미션 목록 조회 (인증 필요)
// GET /api/hylion/missions
router.get('/missions', hylionController.getAllMissions.bind(hylionController));

// 4. 미션 진행도 조회 (인증 필요)
// GET /api/hylion/missions/progress
router.get('/missions/progress', hylionController.getMissionProgress.bind(hylionController));

// 5. 전체 아이콘 목록 조회 (공개 API - 인증 불필요)
// GET /api/hylion/icons
router.get('/icons', hylionController.getAllIcons.bind(hylionController));

export default router;

/*
==============================================
🦁 Hylion (하이리온) API 엔드포인트
==============================================

📍 기본 URL: /api/hylion

🎨 컬렉션 관리
GET /api/hylion/collection
- 사용자의 하이리온 컬렉션 조회 (획득/미획득 아이콘)
- 인증: 필요 (JWT)

PATCH /api/hylion/current-icon
- 현재 대시보드에 표시할 하이리온 변경
- 인증: 필요 (JWT)
- Body: { iconId: number }

🎯 미션 관리
GET /api/hylion/missions
- 전체 미션 목록 조회 (사용자 진행도 포함)
- 인증: 필요 (JWT)
- Query: ?category=community_post (선택)

GET /api/hylion/missions/progress
- 미션 진행도 조회 (진행 중 / 완료)
- 인증: 필요 (JWT)
- Query: ?category=community_post (선택)

📋 아이콘 목록
GET /api/hylion/icons
- 전체 아이콘 목록 조회 (공개 API)
- 인증: 불필요
- Query: ?category=basic|college (선택)

==============================================
🎯 사용 예시
==============================================

# 컬렉션 조회
curl -H "Authorization: Bearer {token}" \
  "http://localhost:3000/api/hylion/collection"

# 현재 아이콘 변경
curl -X PATCH \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"iconId": 2}' \
  "http://localhost:3000/api/hylion/current-icon"

# 미션 목록 조회
curl -H "Authorization: Bearer {token}" \
  "http://localhost:3000/api/hylion/missions"

# 커뮤니티 미션만 조회
curl -H "Authorization: Bearer {token}" \
  "http://localhost:3000/api/hylion/missions?category=community_post"

# 미션 진행도 조회
curl -H "Authorization: Bearer {token}" \
  "http://localhost:3000/api/hylion/missions/progress"

# 전체 아이콘 목록 (공개)
curl "http://localhost:3000/api/hylion/icons"

# 기본 아이콘만 조회
curl "http://localhost:3000/api/hylion/icons?category=basic"

==============================================
*/