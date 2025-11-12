import sqlite3
import csv

# DB 연결 (없으면 자동 생성)
conn = sqlite3.connect("courses.db")
cur = conn.cursor()

# 테이블 생성
cur.execute("""
CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    professor TEXT,
    department TEXT,
    code TEXT,
    credit TEXT
)
""")

# CSV 데이터 읽기
with open("courses.csv", newline='', encoding='cp949') as f:

    reader = csv.reader(f)
    next(reader)  # 헤더 건너뛰기
    for row in reader:
        if len(row) < 5:
            continue
        cur.execute("INSERT INTO courses (name, professor, department, code, credit) VALUES (?, ?, ?, ?, ?)", row[:5])

conn.commit()
conn.close()

print("✅ CSV → SQLite 변환 완료! (courses.db)")
