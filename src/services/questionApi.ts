import { normalizeQuestions } from "./questionFormat";
import type { Character, PokerScenario, Question } from "../types";

type QuestionApiResponse = {
  questions?: Question[];
  error?: string;
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

  const payload = (await response.json().catch(() => ({}))) as QuestionApiResponse;
  if (!response.ok) {
    throw new Error(payload.error || `服务端题库 API 请求失败：HTTP ${response.status}`);
  }

  const questions = normalizeQuestions(payload.questions);
  if (!questions.length) {
    throw new Error("服务端题库 API 没有返回可用题库。");
  }
  return questions;
}
