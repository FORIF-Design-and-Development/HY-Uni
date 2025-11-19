// src/routes/notice.route.ts
import { Router } from "express";
import * as noticeController from "../../controllers/campus/notice.controller";

export const noticeRoutes = Router();

// GET / (전체 목록 조회)
noticeRoutes.get("/", noticeController.getNoticeList);

// GET /:id (상세 조회)
noticeRoutes.get("/:id", noticeController.getNoticeDetail);

// POST / (새 공지사항 생성)
noticeRoutes.post("/", noticeController.postNotice);

// UPDATE /:id (공지사항 수정)
noticeRoutes.put("/:id", noticeController.putNotice);

//  DELETE /:id (공지사항 삭제)
noticeRoutes.delete("/:id", noticeController.deleteNotice);
