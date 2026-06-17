import { normalizeQuestions } from "./questionFormat";
import type { Character, PokerScenario, Question } from "../types";

type QuestionApiResponse = {
  questions?: Question[];
  error?: string;
  details?: {
    provider?: string;
    providerStatus?: number;
    code?: string;
    type?: string;
    param?: string;
    requestId?: string;
  };
};

export async function generateQuestions(
  character: Character,
  prompt: string,
  questionCount: number,
  destinyPrompt?: string,
  scenario?: PokerScenario,
): Promise<Question[]> {
  return requestServerQuestions(character, prompt, questionCount, destinyPrompt, scenario);
}

async function requestServerQuestions(character: Character, prompt: string, questionCount: number, destinyPrompt?: string, scenario?: PokerScenario) {
  const response = await fetch("/api/generate-questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ character, scenario, prompt, questionCount, destinyPrompt }),
  });

  const rawBody = await response.text().catch(() => "");
  const payload = parseQuestionApiResponse(rawBody);
  if (!response.ok) {
    throw new Error(formatQuestionApiError(response.status, payload, rawBody));
  }

  const questions = normalizeQuestions(payload.questions);
  if (!questions.length) {
    throw new Error("服务端题库 API 没有返回可用题库。");
  }
  return questions;
}

function parseQuestionApiResponse(rawBody: string): QuestionApiResponse {
  if (!rawBody) return {};
  try {
    return JSON.parse(rawBody) as QuestionApiResponse;
  } catch {
    return {};
  }
}

function formatQuestionApiError(status: number, payload: QuestionApiResponse, rawBody: string) {
  const message = payload.error || rawBody.trim().slice(0, 240) || "服务端题库 API 请求失败。";
  const details = payload.details;
  const metadata = [
    details?.providerStatus ? `OpenAI HTTP ${details.providerStatus}` : "",
    details?.code ? `code=${details.code}` : "",
    details?.type ? `type=${details.type}` : "",
    details?.param ? `param=${details.param}` : "",
    details?.requestId ? `request_id=${details.requestId}` : "",
  ].filter(Boolean);

  return `服务端题库 API 请求失败：HTTP ${status}：${message}${metadata.length ? `（${metadata.join("，")}）` : ""}`;
}
