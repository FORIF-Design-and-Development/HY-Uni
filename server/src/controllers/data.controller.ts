import { Request, Response } from "express";
import pool from "../config/db";

/**
 * ⭐️ (GET) /api/data/departments
 * 회원가입 시 선택할 학과 목록을 반환합니다.
 */
export const getDepartments = async (req: Request, res: Response) => {
  try {
    const [departments] = await pool.query(
      "SELECT * FROM departments ORDER BY name"
    );
    res.json(departments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "학과 목록 조회 실패" });
  }
};

/**
 * ⭐️ (GET) /api/data/tags
 * 회원가입 시 선택할 태그 목록을 반환합니다.
 */
export const getTags = async (req: Request, res: Response) => {
  try {
    const [tags] = await pool.query("SELECT * FROM tags ORDER BY name");
    res.json(tags);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "태그 목록 조회 실패" });
  }
};
