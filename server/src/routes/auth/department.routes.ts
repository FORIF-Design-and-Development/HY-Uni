import { Router } from 'express';
import { fetchDepartments } from '../../controllers/auth/department.controller';

const router = Router();

router.get('/', fetchDepartments);

export default router;