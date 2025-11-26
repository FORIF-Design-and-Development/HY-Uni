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
  getAllSets: async (): Promise<TimetableSet[]> => {
    const [rows] = await pool.query(
      `SELECT 
        timetable_list_id AS set_id, 
        timetable_name AS name
      FROM timetable_list
      ORDER BY timetable_list_id`
    );
    return rows as TimetableSet[];
  },

  createSet: async (name: string): Promise<void> => {
    await pool.query(
      "INSERT INTO timetable_list (timetable_name, user_id) VALUES (?, 1)",
      [name]
    );
  },

  deleteSet: async (id: number): Promise<void> => {
    await pool.query(
      "DELETE FROM timetable_list WHERE timetable_list_id = ?",
      [id]
    );
  },
};
