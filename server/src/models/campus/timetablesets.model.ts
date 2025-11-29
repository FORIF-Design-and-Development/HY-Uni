import { pool } from "../../config/db";

export interface TimetableSet {
  set_id: number;
  name: string;
}

export interface CreateTimetableSetRequest {
  name: string;
}

export interface TimetableSetListResponse {
  sets: TimetableSet[];
}

export const TimetableSetsModel = {
  getAllSets: async (userId : number): Promise<any[]> => {
    const [rows] = await pool.query(
      `SELECT 
        timetable_list_id,
        timetable_name
      FROM timetable_list
      WHERE user_id = ?
      ORDER BY timetable_list_id`,
      [userId]
    );
    return rows as any[];
  },

  createSet: async (name: string, userId : number): Promise<void> => {
    await pool.query(
      "INSERT INTO timetable_list (timetable_name, user_id), VALUES (?,?)",
      [name, userId]
    );
  },

  deleteSet: async (id: number, userId : number): Promise<void> => {
    await pool.query(
      "DELETE FROM timetable_list WHERE timetable_list_id = ? AND user_id = ?",
      [id, userId]
    );
  },
};
