import { pool } from "../../config/db";

export const CustomModel = {
  create: async (userId, title, day, start, end, location) => {
    const [result] = await pool.query(
      `
      INSERT INTO custom_schedule (user_id, title, day, start_time, end_time, location)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [userId, title, day, start, end, location]
    );

    return (result as any).insertId;
  }
};
