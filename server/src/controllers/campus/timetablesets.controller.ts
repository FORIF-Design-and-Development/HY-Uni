import { Request, Response, NextFunction } from "express";
import { TimetableSetsModel } from "../../models/campus/timetablesets.model";

export const getAllSets = async (req: Request, res: Response, next: NextFunction) => {
 try {
    const userId = (req as any).userId;
    const rows = await TimetableSetsModel.getAllSets();
    res.json({ data: rows });

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

    await TimetableSetsModel.deleteSet(id);
    res.json({ success: true });

  } catch (err) {
    next(err);
  }
};
