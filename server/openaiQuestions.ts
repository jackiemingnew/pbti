import { normalizeQuestions, parseModelJson, questionSchema, type OpenAIQuestionResponse } from "../src/services/questionFormat";
import type { Character, PokerScenario, Question } from "../src/types";

export type QuestionBankInput = {
  apiKey: string;
  model?: string;
  prompt: string;
  character: Character;
  scenario?: PokerScenario;
  questionCount?: number;
  destinyPrompt?: string;
};

type ErrorDetails = {
  provider?: string;
  providerStatus?: number;
  code?: string;
  type?: string;
  param?: string;
  requestId?: string;
};

export type QuestionBankErrorPayload = {
  error: string;
  details?: ErrorDetails;
};

export class QuestionBankError extends Error {
  details?: ErrorDetails;

  constructor(message: string, details?: ErrorDetails) {
    super(message);
    this.name = "QuestionBankError";
    this.details = details;
  }
}

let configuredProxyUrl = "";

export async function generateQuestionBankFromOpenAI({ apiKey, model, prompt, character, scenario, questionCount = 2, destinyPrompt }: QuestionBankInput): Promise<Question[]> {
  await configureOptionalProxy();
  const count = Math.max(1, Math.min(2, Math.round(questionCount)));

  const openAIResponse = await fetchOpenAI(apiKey, model, prompt, character, scenario, count, destinyPrompt);

  const payload = (await openAIResponse.json().catch(() => ({}))) as OpenAIQuestionResponse;
  if (!openAIResponse.ok) {
    throw buildOpenAIError(openAIResponse, payload);
  }

  const parsed = parseModelJson(payload);
  const questions = normalizeQuestions(parsed?.questions);
  if (!questions.length) {
    throw new Error("OpenAI 没有返回可用题库。");
  }

  return questions;
}

export function toQuestionBankErrorPayload(error: unknown): QuestionBankErrorPayload {
  if (error instanceof QuestionBankError) {
    return { error: error.message, details: error.details };
  }
  return { error: error instanceof Error ? error.message : "服务端题库生成失败。" };
}

async function fetchOpenAI(
  apiKey: string,
  model: string | undefined,
  prompt: string,
  character: Character,
  scenario: PokerScenario | undefined,
  count: number,
  destinyPrompt: string | undefined,
) {
  try {
    return await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || "gpt-4.1-mini",
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
                  questionCount: count,
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
            schema: questionSchema(count),
          },
        },
      }),
    });
  } catch (error) {
    throw new QuestionBankError(error instanceof Error ? `OpenAI 请求失败：${error.message}` : "OpenAI 请求失败。", {
      provider: "openai",
    });
  }
}

function buildOpenAIError(response: Response, payload: OpenAIQuestionResponse) {
  const requestId = response.headers.get("x-request-id") || undefined;
  const openAIError = payload.error;
  const details = {
    provider: "openai",
    providerStatus: response.status,
    code: openAIError?.code,
    type: openAIError?.type,
    param: openAIError?.param,
    requestId,
  };
  return new QuestionBankError(openAIError?.message || `OpenAI 题库生成失败：HTTP ${response.status}`, details);
}

async function configureOptionalProxy() {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY || "";
  if (!proxyUrl || configuredProxyUrl === proxyUrl) return;

  try {
    const { ProxyAgent, setGlobalDispatcher } = await import("undici");
    setGlobalDispatcher(new ProxyAgent(proxyUrl));
    configuredProxyUrl = proxyUrl;
  } catch {
    throw new Error("检测到代理环境变量，但缺少 undici 代理依赖。请重新安装依赖后再启动本地服务。");
  }
}
