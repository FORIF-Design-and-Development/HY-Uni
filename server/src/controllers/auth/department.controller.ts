import { Request, Response, NextFunction } from 'express';
import { getAllDepartments } from '../../models/auth/auth.department.model';

export async function fetchDepartments(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const departments = await getAllDepartments();
    return res.json({ success: true, departments });
  } catch (err) {
    next(err);
  }
}