import { Request, Response, NextFunction } from "express";
import { TimetableSetsModel } from "../../models/campus/timetablesets.model";

export const getAllSets = async (req, res, next) => {
  try {
    const userId = (req as any).userId;

    // 현재 세트 조회
    let rows = await TimetableSetsModel.getAllSets(userId);

    // 서버에서 기본 세트 자동 생성
    if (rows.length === 0) {
      await TimetableSetsModel.createSet("2025-2", userId);
      rows = await TimetableSetsModel.getAllSets(userId); // 다시 조회
    }

    return res.json({ success: true, data: rows });

  } catch (err) {
    next(err);
  }
};


export const createSet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = req.body.name;
    const userId = (req as any).userId;

    await TimetableSetsModel.createSet(name, userId);
    res.json({ success: true });

  } catch (err) {
    next(err);
  }
};

export const deleteSet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const userId = (req as any).userId;

    await TimetableSetsModel.deleteSet(id, userId);
    res.json({ success: true });

  } catch (err) {
    next(err);
  }
};
