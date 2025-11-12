import mysql from "mysql2/promise";

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "abcde12345",
  database: "hy_timetable",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default db;
