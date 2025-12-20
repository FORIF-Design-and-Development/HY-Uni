import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { askChatbot, ChatbotResponse } from "../../api/campus/chatbot.api";
import { X, MessageCircle } from "lucide-react";

type Message = {
  id: number;
  role: "user" | "bot";
  text: string;
};

export const FloatingChatbot: React.FC = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 페이지 이동 시 챗봇 닫기
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    setError(null);
    setInput("");

    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      text: question,
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      setLoading(true);
      const res: ChatbotResponse = await askChatbot({ question });

      const botMsg: Message = {
        id: Date.now() + 1,
        role: "bot",
        text: res.answer || "(빈 응답)",
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          "챗봇 서버 호출 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 플로팅 버튼 */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-[#016ABF] text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center"
          style={{
            animation: "float 3s ease-in-out infinite",
          }}
          aria-label="챗봇 열기"
        >
          <MessageCircle className="w-6 h-6" strokeWidth={2.5} />
        </button>
      )}

      {/* 챗봇 창 */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 left-5 z-50 max-w-md mx-auto h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-slide-up">
          {/* 헤더 */}
          <div className="bg-[#016ABF] text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" strokeWidth={2.5} />
              <h3 className="font-bold text-sm">한양대 학사관리 챗봇</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              aria-label="챗봇 닫기"
            >
              <X className="w-5 h-5" strokeWidth={2.5} />
            </button>
          </div>

          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
            {messages.length === 0 && (
              <div className="text-gray-500 text-xs text-center py-4">
                한양대학교 학생을 위한 통합 학사관리 챗봇입니다.
                <br />
                전과 신청 방법, 인공지능과기계학습 수업시간 등 다양한 걸 물어보세요!
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-2xl text-xs whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-[#016ABF] text-white"
                      : "bg-white text-gray-800 border border-gray-200"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="text-xs text-gray-500 text-center">
                챗봇이 답변을 생성하고 있습니다...
              </div>
            )}
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mx-4 mt-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 text-xs">
              {error}
            </div>
          )}

          {/* 입력 영역 */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="질문을 입력하세요."
                className="flex-1 px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#016ABF] focus:border-transparent"
                autoFocus
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  loading || !input.trim()
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-[#016ABF] text-white hover:bg-[#0159a0] active:scale-95"
                }`}
              >
                {loading ? "전송 중..." : "전송"}
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

