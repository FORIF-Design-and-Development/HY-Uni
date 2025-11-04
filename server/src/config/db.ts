// src/config/db.ts

import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// 1. 환경 변수들을 객체에서 구조분해합니다.
const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

// 2. 필수 변수 중 하나라도 없으면 에러를 발생시키고 앱을 중지합니다.
if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
  console.error(
    "❌ 치명적 오류: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME 환경 변수가 .env 파일에 설정되지 않았습니다."
  );
  process.exit(1); // 프로세스 강제 종료
}

// 3. 이 코드가 실행될 때, 변수들은 모두 undefined가 아님(즉, string임)이 보장됩니다.
const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
