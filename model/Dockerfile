# HY-Uni/model/Dockerfile
FROM python:3.11-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 필수 시스템 라이브러리 및 빌드 도구 설치
# - build-essential: gcc, g++ 등 C 컴파일러 (numpy, pandas 등 C 확장 패키지용)
# - python3-dev: Python C 확장 모듈 컴파일용 헤더 파일
# - libsqlite3-dev: SQLite 개발 라이브러리 (ChromaDB용)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3-dev \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# FastAPI 엔트리포인트가 src.app:app 라고 가정
CMD ["sh", "-c", "uvicorn src.app:app --host 0.0.0.0 --port ${PORT:-8080}"]