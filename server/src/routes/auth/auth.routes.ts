import { Router } from 'express';
import { register, login, findEmail, resetPassword, refresh, logout } from '../../controllers/auth/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/find-email', findEmail);
router.post('/reset-password', resetPassword);
router.post('/refresh', refresh);
router.post('/logout', logout);

export default router;