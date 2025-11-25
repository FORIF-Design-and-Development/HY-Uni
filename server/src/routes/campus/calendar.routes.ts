import express from 'express';
import {
    createCalendarEvent,
    deleteCalendarEvent,
    getCalendarEvents,
    updateCalendarEvent
} from '../../controllers/campus/calendar.controller';
// import { authenticateToken } from '../../middlewares/auth';

const router = express.Router();

// 일정 조회 (GET /api/calendar/events)
router.get('/events', getCalendarEvents);

// 일정 생성 (POST /api/calendar/events)
router.post('/events', createCalendarEvent);

// 일정 수정 (PATCH /api/calendar/events/:calendarId)
router.patch('/events/:calendarId', updateCalendarEvent);

// 일정 삭제 (DELETE /api/calendar/events/:calendarId)
router.delete('/events/:calendarId', deleteCalendarEvent);

// // 일정 조회
// router.get('/events', authenticateToken, getCalendarEvents);

// // 일정 생성
// router.post('/events', authenticateToken, createCalendarEvent);

// // 일정 수정
// router.patch('/events/:calendarId', authenticateToken, updateCalendarEvent);

// // 일정 삭제
// router.delete('/events/:calendarId', authenticateToken, deleteCalendarEvent);

export default router;