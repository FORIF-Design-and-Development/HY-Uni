// src/routes/community.routes.ts
import { Router } from "express";
// ⭐️ 컨트롤러 함수들을 가져옵니다.
import {
  getBoards,
  getPostsByBoard,
  getPostById,
} from "../controllers/community.controller";

const router = Router();

// GET /api/community/boards
router.get("/boards", getBoards);

// GET /api/community/board/:slug
router.get("/board/:slug", getPostsByBoard);

// GET /api/community/post/:id
router.get("/post/:id", getPostById);

// (나중에 글 작성, 수정, 삭제 API 추가)
// POST /api/community/post
// PUT /api/community/post/:id
// DELETE /api/community/post/:id

export default router;
