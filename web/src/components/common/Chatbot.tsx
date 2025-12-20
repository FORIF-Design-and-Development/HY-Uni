import React, { useState } from "react";
import { askChatbot, ChatbotResponse } from "../../api/campus/chatbot.api";

type Message = {
  id: number;
  role: "user" | "bot";
  text: string;
};

interface ChatbotProps {
  className?: string;
  maxHeight?: string;
}

export const Chatbot: React.FC<ChatbotProps> = ({ 
  className = "", 
  maxHeight = "400px" 
}) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div
      className={`flex flex-col ${className}`}
      style={{
        height: maxHeight,
        boxSizing: "border-box",
      }}
    >
      <h2 className="text-[15px] font-bold text-gray-800 mb-3">
        🤖 한양대 학사관리 챗봇
      </h2>

      <div
        className="flex-1 border border-gray-200 rounded-2xl p-3 overflow-y-auto mb-3 bg-gray-50"
        style={{ minHeight: 0 }}
      >
        {messages.length === 0 && (
          <div className="text-gray-500 text-xs">
            한양대학교 학생을 위한 통합 학사관리 챗봇입니다.
            <br />
            전과 신청 방법, 인공지능과기계학습 수업시간 등 다양한 걸 물어보세요!
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex mb-2 ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs whitespace-pre-wrap ${
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
          <div className="text-xs text-gray-500 mt-2">
            챗봇이 답변을 생성하고 있습니다...
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 text-xs mb-3">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="질문을 입력하세요."
          className="flex-1 px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#016ABF] focus:border-transparent"
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
      </form>
    </div>
  );
};

