from typing import Optional, Any, Dict
import sys
from pathlib import Path

# 프로젝트 루트 경로를 sys.path에 추가
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from fastapi import FastAPI
from pydantic import BaseModel

from src.chat.chat_server import ChatSession


# FastAPI 인스턴스 생성
app = FastAPI(
    title="HY Academic Chatbot API",
    description="한양대 학사관리 챗봇 API",
    version="0.1.0",
)

# 서버 전체에서 공유할 ChatSession (하나만 생성해서 재사용)
_session: Optional[ChatSession] = None

def get_session() -> ChatSession:
    global _session
    if _session is None:
        _session = ChatSession()
    return _session


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
    session = get_session()
    result: Dict[str, Any] = session.ask(
        question=req.question,
        k=5,
        model="gpt-4o-mini",
    )

    answer = result.get("answer", "")
    meta = {k: v for k, v in result.items() if k != "answer"}
    return ChatResponse(answer=answer, meta=meta)