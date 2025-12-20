from typing import Optional, Any, Dict
import sys
from pathlib import Path
from dotenv import load_dotenv

# 프로젝트 루트 경로를 sys.path에 추가
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

# .env 파일 로드 (Cloud Run에서는 환경변수로 주입)
load_dotenv(project_root / ".env")

from fastapi import FastAPI
from pydantic import BaseModel

from src.chat.chat_server import ChatSession


# FastAPI 인스턴스 생성
app = FastAPI(
    title="HY Academic Chatbot API",
    description="한양대 학사관리 챗봇 API",
    version="0.1.0",
)

# 서버 전체에서 공유할 ChatSession (지연 초기화)
session: Optional[ChatSession] = None

def get_session() -> ChatSession:
    """ChatSession을 지연 초기화하여 앱 시작 실패 방지"""
    global session
    if session is None:
        try:
            session = ChatSession()
        except Exception as e:
            print(f"[ERROR] ChatSession 초기화 실패: {e}")
            raise
    return session


# 1) 요청 스키마
class ChatRequest(BaseModel):
    question: str


# 2) 응답 스키마
class ChatResponse(BaseModel):
    answer: str
    meta: Optional[Dict[str, Any]] = None


# 3) 헬스 체크 (옵션)
@app.get("/health")
def health_check():
    return {"status": "ok"}


# 4) 실제 채팅 엔드포인트
@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """
    한양대 학사관리 챗봇 파이프라인을 한 번 실행하는 HTTP 엔드포인트
    """
    try:
        s = get_session()
        # 기존 CLI에서 하던 것과 거의 동일한 호출
        result: Dict[str, Any] = s.ask(
            question=req.question,
            k=5,
            model="gpt-4o-mini",
        )

        answer = result.get("answer", "")
        meta = {k: v for k, v in result.items() if k != "answer"}

        return ChatResponse(answer=answer, meta=meta)
    except Exception as e:
        print(f"[ERROR] 챗봇 처리 실패: {e}")
        return ChatResponse(
            answer=f"챗봇 서비스 오류가 발생했습니다: {str(e)}",
            meta={"error": str(e)}
        )