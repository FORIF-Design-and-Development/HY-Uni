import { NextFunction, Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../../config/db';
import { Calendar, CalendarResponse, CreateCalendarRequest, UpdateCalendarRequest } from '../../models/campus/calendar.model';

// 일정 조회 (GET /api/calendar/events)
export async function getCalendarEvents(req: Request, res: Response, next: NextFunction) {
  try {
    // TODO: 인증 미들웨어 완성 후 실제 user_id 사용
    const userId = 2; // 임시로 하드코딩
    // const userId = (req as any).user?.userId;

    const { start_datetime, end_datetime } = req.query;

    let query = 'SELECT * FROM user_calendar WHERE user_id = ?';
    const params: any[] = [userId];

    // 날짜 범위 필터링
    if (start_datetime && end_datetime) {
      query += ' AND start_datetime >= ? AND end_datetime <= ?';
      params.push(start_datetime, end_datetime);
    }

    query += ' ORDER BY start_datetime ASC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    const calendars = rows as Calendar[];

    // 응답 형식 변환
    const events: CalendarResponse[] = calendars.map(cal => ({
      calendar_id: cal.calendar_id,
      event_title: cal.event_title,
      start_datetime: cal.start_datetime,
      end_datetime: cal.end_datetime,
      status: cal.status,
      color: cal.color,
      is_recurring: cal.is_recurring,
      recurring_rule: cal.recurring_rule,
      reminder_status: cal.reminder_status,
      reminder_type: cal.reminder_type,
    }));

    return res.json(events);
  } catch (err) {
    next(err);
  }
}

// 일정 생성 (POST /api/calendar/events)
export async function createCalendarEvent(req: Request, res: Response, next: NextFunction) {
  try {
    // TODO: 인증 미들웨어 완성 후 실제 user_id 사용
    const userId = 2; // 임시로 하드코딩
    // const userId = (req as any).user?.userId;

    const {
      event_title,
      start_datetime,
      end_datetime,
      status,
      color,
      is_recurring,
      recurring_rule,
      reminder_status,
      reminder_type,
    } = req.body as CreateCalendarRequest;

    // 필수 필드 검증
    if (!event_title || !start_datetime || !end_datetime) {
      return res.status(400).json({
        success: false,
        message: '필수 항목이 누락되었습니다. (event_title, start_datetime, end_datetime)',
      });
    }

    // INSERT 쿼리
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO user_calendar 
        (user_id, event_title, start_datetime, end_datetime, status, color, 
         is_recurring, recurring_rule, reminder_status, reminder_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        event_title,
        start_datetime,
        end_datetime,
        status || null,
        color || null,
        is_recurring || false,
        recurring_rule || null,
        reminder_status || '비활성화',
        reminder_type || null,
      ]
    );

    const insertedId = result.insertId;

    // 생성된 일정 조회
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM user_calendar WHERE calendar_id = ?',
      [insertedId]
    );
    const calendar = rows[0] as Calendar;

    const response: CalendarResponse = {
      calendar_id: calendar.calendar_id,
      event_title: calendar.event_title,
      start_datetime: calendar.start_datetime,
      end_datetime: calendar.end_datetime,
      status: calendar.status,
      color: calendar.color,
      is_recurring: calendar.is_recurring,
      recurring_rule: calendar.recurring_rule,
      reminder_status: calendar.reminder_status,
      reminder_type: calendar.reminder_type,
    };

    return res.status(201).json(response);
  } catch (err) {
    next(err);
  }
}

// 일정 수정 (PATCH /api/calendar/events/:calendarId)
export async function updateCalendarEvent(req: Request, res: Response, next: NextFunction) {
  try {
    // TODO: 인증 미들웨어 완성 후 실제 user_id 사용
    const userId = 2; // 임시로 하드코딩
    // const userId = (req as any).user?.userId;

    const calendarId = Number(req.params.calendarId);
    
    if (isNaN(calendarId)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 calendar_id입니다.',
      });
    }

    // 해당 일정이 존재하고 본인 소유인지 확인
    const [checkRows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM user_calendar WHERE calendar_id = ? AND user_id = ?',
      [calendarId, userId]
    );

    if (checkRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '일정을 찾을 수 없거나 권한이 없습니다.',
      });
    }

    const updateData = req.body as UpdateCalendarRequest;
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    // 동적으로 업데이트할 필드 구성
    if (updateData.event_title !== undefined) {
      updateFields.push('event_title = ?');
      updateValues.push(updateData.event_title);
    }
    if (updateData.start_datetime !== undefined) {
      updateFields.push('start_datetime = ?');
      updateValues.push(updateData.start_datetime);
    }
    if (updateData.end_datetime !== undefined) {
      updateFields.push('end_datetime = ?');
      updateValues.push(updateData.end_datetime);
    }
    if (updateData.status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(updateData.status);
    }
    if (updateData.color !== undefined) {
      updateFields.push('color = ?');
      updateValues.push(updateData.color);
    }
    if (updateData.is_recurring !== undefined) {
      updateFields.push('is_recurring = ?');
      updateValues.push(updateData.is_recurring);
    }
    if (updateData.recurring_rule !== undefined) {
      updateFields.push('recurring_rule = ?');
      updateValues.push(updateData.recurring_rule);
    }
    if (updateData.reminder_status !== undefined) {
      updateFields.push('reminder_status = ?');
      updateValues.push(updateData.reminder_status);
    }
    if (updateData.reminder_type !== undefined) {
      updateFields.push('reminder_type = ?');
      updateValues.push(updateData.reminder_type);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: '수정할 내용이 없습니다.',
      });
    }

    updateValues.push(calendarId, userId);

    await pool.query(
      `UPDATE user_calendar SET ${updateFields.join(', ')} WHERE calendar_id = ? AND user_id = ?`,
      updateValues
    );

    // 수정된 일정 조회
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM user_calendar WHERE calendar_id = ?',
      [calendarId]
    );
    const calendar = rows[0] as Calendar;

    const response: CalendarResponse = {
      calendar_id: calendar.calendar_id,
      event_title: calendar.event_title,
      start_datetime: calendar.start_datetime,
      end_datetime: calendar.end_datetime,
      status: calendar.status,
      color: calendar.color,
      is_recurring: calendar.is_recurring,
      recurring_rule: calendar.recurring_rule,
      reminder_status: calendar.reminder_status,
      reminder_type: calendar.reminder_type,
    };

    return res.json(response);
  } catch (err) {
    next(err);
  }
}

// 일정 삭제 (DELETE /api/calendar/events/:calendarId)
export async function deleteCalendarEvent(req: Request, res: Response, next: NextFunction) {
  try {
    // TODO: 인증 미들웨어 완성 후 실제 user_id 사용
    const userId = 2; // 임시로 하드코딩
    // const userId = (req as any).user?.userId;

    const calendarId = Number(req.params.calendarId);
    
    if (isNaN(calendarId)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 calendar_id입니다.',
      });
    }

    // 해당 일정이 존재하고 본인 소유인지 확인
    const [checkRows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM user_calendar WHERE calendar_id = ? AND user_id = ?',
      [calendarId, userId]
    );

    if (checkRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '일정을 찾을 수 없거나 권한이 없습니다.',
      });
    }

    await pool.query(
      'DELETE FROM user_calendar WHERE calendar_id = ? AND user_id = ?',
      [calendarId, userId]
    );

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}