import { normalizeQuestions, parseModelJson, questionSchema, type OpenAIQuestionResponse } from "./questionFormat";
import type { Character, PokerScenario, Question } from "../types";

type QuestionApiResponse = {
  questions?: Question[];
  error?: string;
};

export async function generateQuestions(
  character: Character,
  prompt: string,
  apiKey: string,
  questionCount: number,
  destinyPrompt?: string,
  scenario?: PokerScenario,
): Promise<Question[]> {
  const serverResult = await requestServerQuestions(character, prompt, questionCount, destinyPrompt, scenario).catch((error: unknown) => {
    if (apiKey.trim()) return null;
    throw error;
  });
  if (serverResult?.length) return serverResult;

  if (!apiKey.trim()) {
    throw new Error("服务端题库 API 不可用，且未填写浏览器兜底 API key。");
  }

  return requestOpenAIQuestions(character, prompt, apiKey, questionCount, destinyPrompt, scenario);
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

async function requestOpenAIQuestions(character: Character, prompt: string, apiKey: string, questionCount: number, destinyPrompt?: string, scenario?: PokerScenario) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: import.meta.env.VITE_OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: prompt }],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                task: "generate_poker_persona_questions",
                character: {
                  id: character.id,
                  name: character.name,
                  archetype: character.archetype,
                  decisionMode: character.decisionMode ?? "formula",
                  description: character.description,
                  bias: character.bias,
                  stats: character.stats ?? null,
                },
                scenario: scenario ?? null,
                offlineDecisionMode: true,
                questionCount,
                destinyPrompt: character.decisionMode === "destiny" ? destinyPrompt || null : null,
              }),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "question_bank",
          strict: true,
            schema: questionSchema(questionCount),
        },
      },
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as OpenAIQuestionResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message || "OpenAI 题库生成失败。");
  }

  const parsed = parseModelJson(payload);
  const questions = normalizeQuestions(parsed?.questions);
  if (!questions.length) {
    throw new Error("OpenAI 没有返回可用题库。");
  }

  return questions;
}
