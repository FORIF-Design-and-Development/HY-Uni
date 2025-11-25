import { pool } from "../../config/db";

export const TimetableSetsModel = {
  getAllSets: async () => {
    const [rows] = await pool.query(
      "SELECT timetable_list_id AS id, timetable_name AS name FROM timetable_list ORDER BY timetable_list_id"
    );
    return rows;
  },

  createSet: async (name: string) => {
    await pool.query(
      "INSERT INTO timetable_list (timetable_name, user_id) VALUES (?, 1)",
      [name]
    );
  },

  deleteSet: async (id: number) => {
    await pool.query(
      "DELETE FROM timetable_list WHERE timetable_list_id = ?",
      [id]
    );
  },
};
