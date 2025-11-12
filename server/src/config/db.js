import mysql from "mysql2/promise";

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "abcde12345", // ← 여기에 실제 MySQL 비밀번호 입력
  database: "hy_timetable",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default db;
