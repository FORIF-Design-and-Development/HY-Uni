import { api } from "../axios";

export interface ChatbotRequest {
  question: string;
}

export interface ChatbotMeta {
  question?: string;
  data_source_used?: string;
  used_chunks?: any[];
  [key: string]: any;
}

export interface ChatbotResponse {
  answer: string;
  meta?: ChatbotMeta;
}

export async function askChatbot(
  payload: ChatbotRequest
): Promise<ChatbotResponse> {
  const res = await api.post<ChatbotResponse>("/chat/chatbot", payload);
  return res.data;
}