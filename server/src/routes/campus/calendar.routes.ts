import express from 'express';
import {
    createCalendarEvent,
    deleteCalendarEvent,
    getCalendarEvents,
    updateCalendarEvent
} from '../../controllers/campus/calendar.controller';
import { requireAuth } from '../../middlewares/error'; // 🆕 추가

const router = express.Router();

// 🆕 requireAuth 미들웨어 추가
router.get('/events', requireAuth, getCalendarEvents);
router.post('/events', requireAuth, createCalendarEvent);
router.patch('/events/:calendarId', requireAuth, updateCalendarEvent);
router.delete('/events/:calendarId', requireAuth, deleteCalendarEvent);

export default router;