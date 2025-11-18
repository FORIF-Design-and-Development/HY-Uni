import { Router } from 'express';
import { getAllDepartments } from '../../models/auth/auth.department.model';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const departments = await getAllDepartments();
    res.json({ success: true, departments });
  } catch (err) {
    next(err);
  }
});

export default router;