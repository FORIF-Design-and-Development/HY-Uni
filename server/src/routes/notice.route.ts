// // api/notices API 엔드포인트, controller와 연결
// // src/routes/notice.route.ts

// import { Router } from "express";
// // ⭐️ .js 확장자 사용
// import * as noticeController from "../controllers/notice.controller.js";

// // 💡 컨벤션(Named Export 채택)에 따라 'noticeRouter'로 명명하여 내보냅니다.
// export const noticeRouter = Router();

// // --- 공지사항 (Notice) API 라우트 ---

// /**
//  * @route   GET /
//  * @desc    공지사항 전체 목록 조회
//  * @access  Public
//  */
// noticeRouter.get("/", noticeController.getNoticeList);

// /**
//  * @route   GET /:id
//  * @desc    공지사항 상세 조회
//  * @access  Public
//  */
// noticeRouter.get("/:id", noticeController.getNoticeDetail);

// /**
//  * @route   POST /
//  * @desc    공지사항 생성
//  * @access  Public
//  */
// noticeRouter.post("/", noticeController.postNotice);
// // PUT /:id   (공지... 수정)
// // DELETE /:id (공지... 삭제)

// src/routes/notice.route.ts
import { Router } from "express";
import * as noticeController from "../controllers/notice.controller.js";

export const noticeRouter = Router();

// GET / (전체 목록 조회)
noticeRouter.get("/", noticeController.getNoticeList);

// GET /:id (상세 조회)
noticeRouter.get("/:id", noticeController.getNoticeDetail);

// POST / (새 공지사항 생성)
noticeRouter.post("/", noticeController.postNotice);

// UPDATE /:id (공지사항 수정)
noticeRouter.put("/:id", noticeController.putNotice);

//  DELETE /:id (공지사항 삭제)
noticeRouter.delete("/:id", noticeController.deleteNotice);
