import { Request, Response } from "express";
import { askLlm } from "../../services/campus/chatbot/chatbot.service";

export async function postChatbot(req: Request, res: Response) {
  try {
    // 1) body 안전하게 읽기
    const body = (req.body ?? {}) as { question?: unknown };
    const question = body.question;

    // 2) 검증
    if (typeof question !== "string" || question.trim() === "") {
      return res
        .status(400)
        .json({ message: "question 필드는 비어 있으면 안 됩니다." });
    }

    // 3) Python LLM 서비스 호출
    const { answer, meta } = await askLlm({ question });

    // 4) 프론트로 그대로 반환
    return res.json({ answer, meta });
  } catch (err: any) {
    console.error("챗봇 서비스 호출 실패:", err);
    return res.status(500).json({
      message: "챗봇 서비스 호출 중 오류가 발생했습니다.",
      error: err?.message,
    });
  }
}