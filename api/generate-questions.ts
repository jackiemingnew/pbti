import { generateQuestionBankFromOpenAI, getQuestionBankErrorStatus, toQuestionBankErrorPayload } from "../server/openaiQuestions.js";
import type { Character, PokerScenario } from "../src/types.js";

export const config = {
  maxDuration: 30,
};

type ApiRequest = {
  method?: string;
  body?: unknown;
};

type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => {
    json: (body: unknown) => void;
    end?: () => void;
  };
};

type QuestionRequestBody = {
  character?: Character;
  scenario?: PokerScenario;
  prompt?: string;
  questionCount?: number;
  destinyPrompt?: string;
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method === "OPTIONS") {
    response.status(204).end?.();
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ error: "只支持 POST 请求。" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    response.status(500).json({ error: "服务端缺少 OPENAI_API_KEY 环境变量。" });
    return;
  }

  const body = parseBody(request.body);
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt || !body.character) {
    response.status(400).json({ error: "请求缺少 prompt 或 character。" });
    return;
  }

  try {
    const questions = await generateQuestionBankFromOpenAI({
      apiKey,
      model: process.env.OPENAI_MODEL || process.env.VITE_OPENAI_MODEL,
      prompt,
      character: body.character,
      scenario: body.scenario,
      questionCount: body.questionCount,
      destinyPrompt: body.destinyPrompt,
    });
    response.status(200).json({ questions });
  } catch (error) {
    response.status(getQuestionBankErrorStatus(error)).json(toQuestionBankErrorPayload(error));
  }
}

function parseBody(body: unknown): QuestionRequestBody {
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as QuestionRequestBody;
    } catch {
      return {};
    }
  }
  if (typeof body === "object" && body) return body as QuestionRequestBody;
  return {};
}
