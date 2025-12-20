import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { askChatbot, ChatbotResponse } from "../../api/campus/chatbot.api";
import { X, MessageCircle, LayoutDashboard, Bot, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Message = {
  id: number;
  role: "user" | "bot";
  text: string;
};

export const FloatingChatbot: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 페이지 이동 시 챗봇 닫기
  useEffect(() => {
    setIsOpen(false);
    setIsMenuOpen(false);
  }, [location.pathname]);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

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

  // 메뉴 항목 정의
  const menuItems = [
    {
      id: 'chatbot',
      label: '챗봇',
      icon: Bot,
      path: '/chatbot',
      onClick: () => {
        setIsOpen(true);
        setIsMenuOpen(false);
      },
    },
    {
      id: 'community',
      label: '커뮤니티',
      icon: MessageCircle,
      path: '/community',
      onClick: () => {
        navigate('/community');
        setIsMenuOpen(false);
      },
    },
    {
      id: 'dashboard',
      label: '대시보드',
      icon: LayoutDashboard,
      path: '/dashboard',
      onClick: () => {
        navigate('/dashboard');
        setIsMenuOpen(false);
      },
    },
  ];

  return (
    <>
      {/* Speed Dial 메뉴 */}
      <AnimatePresence>
        {isMenuOpen && !isOpen && (
          <motion.div
            ref={menuRef}
            className="fixed bottom-20 right-5 z-50 flex flex-col-reverse gap-3 items-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.id}
                  onClick={item.onClick}
                  className="flex items-center gap-2 bg-white text-gray-700 px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-shadow font-semibold text-sm border border-gray-100"
                  initial={{ 
                    opacity: 0, 
                    y: 20,
                    scale: 0.8 
                  }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    scale: 1 
                  }}
                  exit={{ 
                    opacity: 0, 
                    y: 20,
                    scale: 0.8 
                  }}
                  transition={{ 
                    delay: index * 0.05,
                    type: "spring",
                    stiffness: 300,
                    damping: 25
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 메인 플로팅 버튼 */}
      {!isOpen && (
        <motion.button
          onClick={() => {
            if (isMenuOpen) {
              setIsMenuOpen(false);
            } else {
              setIsMenuOpen(true);
            }
          }}
          className={`fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-[#016ABF] text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center ${
            !isMenuOpen ? 'animate-bounce-gentle' : ''
          }`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          animate={{
            rotate: isMenuOpen ? 45 : 0,
          }}
          transition={{ 
            rotate: { duration: 0.2 }
          }}
          aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
        >
          {isMenuOpen ? (
            <X className="w-6 h-6" strokeWidth={2.5} />
          ) : (
            <Plus className="w-6 h-6" strokeWidth={2.5} />
          )}
        </motion.button>
      )}

      {/* 챗봇 창 */}
      {isOpen && (
        <div className="fixed bottom-5 right-20 z-50 w-80 h-[400px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-slide-up">
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

