// src/controllers/community.controller.ts
import { Request, Response } from "express";
import pool from "../config/db"; // DB 연결

/**
 * 📦 GET /api/community/boards
 * 모든 게시판 목록을 가져옵니다.
 */
export const getBoards = async (req: Request, res: Response) => {
  try {
    const [boards] = await pool.query("SELECT * FROM boards");

    // ⭐️ EJS 렌더링(res.render) 대신 JSON(res.json)으로 응답
    res.json(boards);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류" });
  }
};

/**
 * 📋 GET /api/community/board/:slug
 * 특정 게시판의 글 목록을 가져옵니다.
 */
export const getPostsByBoard = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    // 1. 게시판 정보 확인
    const [boardRows] = await pool.query(
      "SELECT * FROM boards WHERE slug = ?",
      [slug]
    );
    const board = (boardRows as any[])[0];

    if (!board) {
      return res.status(404).json({ message: "게시판을 찾을 수 없습니다." });
    }

    // 2. 해당 게시판의 글 목록
    const [posts] = await pool.query(
      "SELECT id, title, created_at FROM posts WHERE board_id = ? ORDER BY created_at DESC",
      [board.id]
    );

    // ⭐️ 게시판 정보와 글 목록을 함께 JSON으로 응답
    res.json({ board, posts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류" });
  }
};

/**
 * 📄 GET /api/community/post/:id
 * 특정 게시글 1개의 상세 내용을 가져옵니다.
 */
export const getPostById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [postRows] = await pool.query("SELECT * FROM posts WHERE id = ?", [
      id,
    ]);
    const post = (postRows as any[])[0];

    if (!post) {
      return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
    }

    // (추후) 댓글 가져오는 로직 추가

    // ⭐️ 게시글 정보를 JSON으로 응답
    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 오류" });
  }
};
