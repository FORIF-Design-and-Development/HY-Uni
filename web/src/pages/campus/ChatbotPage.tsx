import React from "react";
import { Chatbot } from "../../components/common/Chatbot";

const ChatbotPage: React.FC = () => {
  return (
    <div className="w-full min-h-screen bg-white p-5">
      <Chatbot maxHeight="calc(100vh - 120px)" />
    </div>
  );
};

export default ChatbotPage;