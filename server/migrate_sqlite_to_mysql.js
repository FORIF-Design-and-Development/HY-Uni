import sqlite3 from "sqlite3";
import mysql from "mysql2/promise";

const MYSQL_CONFIG = {
  host: "localhost",
  user: "root",
  password: "abcde12345", // ← 너의 MySQL root 비밀번호
  database: "timetable",
  charset: "utf8mb4",
};

const SQLITE_FILE = "./courses.db";

(async () => {
  try {
    console.log("🚀 SQLite → MySQL 이관 시작");

    // 1️⃣ SQLite 연결
    const sqlite = new sqlite3.Database(SQLITE_FILE);
    const allRows = await new Promise((resolve, reject) => {
      sqlite.all(
        "SELECT name, professor, department, code, credit FROM courses",
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    console.log(`✅ SQLite에서 ${allRows.length}개의 레코드 읽음`);

    // 2️⃣ MySQL 연결
    const mysqlConn = await mysql.createConnection(MYSQL_CONFIG);
    console.log("🔗 MySQL 연결 완료");

    // 3️⃣ 테이블 생성 (모든 컬럼 문자열로)
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        학년 VARCHAR(50),
        이수구분 VARCHAR(50),
        학수번호_수업번호 VARCHAR(255),
        교과목명 VARCHAR(255),
        교강사 VARCHAR(255),
        학점 VARCHAR(50),
        시간 VARCHAR(255),
        강의실 VARCHAR(255),
        요일 VARCHAR(50),
        시작교시 VARCHAR(50),
        종료교시 VARCHAR(50)
      ) CHARACTER SET utf8mb4;
    `;
    await mysqlConn.query(createTableQuery);
    console.log("🧱 MySQL 테이블 확인 완료");

    // 4️⃣ 데이터 삽입 (전부 문자열로 안전 삽입)
    const insertQuery = `
      INSERT INTO courses (교과목명, 교강사, 학수번호_수업번호, 강의실, 학점)
      VALUES (?, ?, ?, ?, ?)
    `;

    for (const r of allRows) {
      try {
        await mysqlConn.query(insertQuery, [
          String(r.name || ""),
          String(r.professor || ""),
          String(r.code || ""),
          String(r.department || ""),
          String(r.credit || ""),
        ]);
      } catch (e) {
        console.warn("⚠️ 삽입 스킵됨:", e.message);
      }
    }

    console.log(`🎯 ${allRows.length}개의 데이터가 MySQL로 이관 완료!`);
    sqlite.close();
    await mysqlConn.end();
    console.log("🔒 모든 DB 연결 종료");
  } catch (err) {
    console.error("❌ 오류 발생:", err);
  }
})();
