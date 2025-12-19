import axios from "axios";

const PY_LLM_URL = process.env.PY_LLM_URL || "http://localhost:8000";

export interface AskLlmParams {
  question: string;
  k?: number;
  data_source?: string | null;
  model?: string;
  userId?: string | null;
}

export interface AskLlmResult {
  answer: string;
  meta?: any;
}

export async function askLlm(
  params: AskLlmParams
): Promise<AskLlmResult> {
  const { question, k, data_source, model, userId } = params;

  const response = await axios.post(
    `${PY_LLM_URL}/chat`,
    {
      question,
      k: k ?? 5,
      data_source: data_source ?? null,
      model: model ?? "gpt-4o-mini",
    },
    {
      timeout: 60_000, //60초
    }
  );

  const { answer, meta } = response.data;
  return { answer, meta };
}