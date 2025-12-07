import React, { useState } from "react";
import { askChatbot, ChatbotResponse } from "../../api/campus/chatbot.api";

type Message = {
  id: number;
  role: "user" | "bot";
  text: string;
};

const ChatbotPage: React.FC = () => {
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
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        height: "66vh",
        boxSizing: "border-box",
      }}
    >
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>
        한양대 학사관리 챗봇
      </h1>

      <div
        style={{
          flex: 1,
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 12,
          overflowY: "auto",
          marginBottom: 12,
          backgroundColor: "#fafafa",
        }}
      >
        {messages.length === 0 && (
          <div style={{ color: "#888", fontSize: 14 }}>
            한양대학교 학생을 위한 통합 학사관리 챗봇입니다.
            <br/>전과 신청 방법, 인공지능과기계학습 수업시간 등 다양한 걸 물어보세요!
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                maxWidth: "80%",
                padding: "8px 12px",
                borderRadius: 12,
                whiteSpace: "pre-wrap",
                fontSize: 14,
                backgroundColor:
                  m.role === "user" ? "#d1e7ff" : "white",
                border:
                  m.role === "user"
                    ? "1px solid #9ec5fe"
                    : "1px solid #ddd",
              }}
            >
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
            챗봇이 답변을 생성하고 있습니다...
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            color: "#b02a37",
            backgroundColor: "#f8d7da",
            border: "1px solid #f5c2c7",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 13,
            marginBottom: 8,
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="질문을 입력하세요."
          style={{
            flex: 1,
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #ccc",
            fontSize: 14,
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            cursor: loading ? "default" : "pointer",
            backgroundColor: loading ? "#ccc" : "#0d6efd",
            color: "white",
            fontSize: 14,
          }}
        >
          {loading ? "전송 중..." : "전송"}
        </button>
      </form>
    </div>
  );
};

export default ChatbotPage;