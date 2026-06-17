import { normalizeQuestions, parseModelJson, questionSchema, type OpenAIQuestionResponse } from "../src/services/questionFormat.js";
import type { Character, PokerScenario, Question } from "../src/types.js";

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
  attempts?: number;
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
const DEFAULT_OPENAI_ATTEMPTS = process.env.VERCEL ? 1 : 3;
const DEFAULT_OPENAI_TIMEOUT_MS = process.env.VERCEL ? 25000 : 12000;

export async function generateQuestionBankFromOpenAI({ apiKey, model, prompt, character, scenario, questionCount = 2, destinyPrompt }: QuestionBankInput): Promise<Question[]> {
  await configureOptionalProxy();
  const count = Math.max(1, Math.min(2, Math.round(questionCount)));

  const { payload } = await requestOpenAIWithRetry(apiKey, model, prompt, character, scenario, count, destinyPrompt);

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

export function getQuestionBankErrorStatus(error: unknown) {
  if (!(error instanceof QuestionBankError)) return 500;
  const providerStatus = error.details?.providerStatus;
  if (!providerStatus) return 502;
  if (providerStatus === 429) return 429;
  if (providerStatus >= 500) return 502;
  if (providerStatus >= 400) return 400;
  return 500;
}

async function requestOpenAIWithRetry(
  apiKey: string,
  model: string | undefined,
  prompt: string,
  character: Character,
  scenario: PokerScenario | undefined,
  count: number,
  destinyPrompt: string | undefined,
) {
  let lastError: QuestionBankError | null = null;

  const maxAttempts = getPositiveIntegerEnv("OPENAI_MAX_ATTEMPTS", DEFAULT_OPENAI_ATTEMPTS, 1, 4);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchOpenAI(apiKey, model, prompt, character, scenario, count, destinyPrompt);
      const payload = (await response.json().catch(() => ({}))) as OpenAIQuestionResponse;
      if (response.ok) return { payload };

      const error = buildOpenAIError(response, payload, attempt);
      if (!isRetryableQuestionBankError(error) || attempt === maxAttempts) throw error;
      lastError = error;
    } catch (error) {
      const normalizedError = normalizeQuestionBankError(error, attempt);
      if (!isRetryableQuestionBankError(normalizedError) || attempt === maxAttempts) throw normalizedError;
      lastError = normalizedError;
    }

    await waitBeforeRetry(attempt);
  }

  throw lastError || new QuestionBankError("OpenAI 题库生成失败。", { provider: "openai", attempts: maxAttempts });
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
  const timeoutMs = getPositiveIntegerEnv("OPENAI_FETCH_TIMEOUT_MS", DEFAULT_OPENAI_TIMEOUT_MS, 1000, 25000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
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
    const isAbort = error instanceof Error && error.name === "AbortError";
    throw new QuestionBankError(isAbort ? `OpenAI 请求超时：超过 ${timeoutMs}ms 未返回。` : error instanceof Error ? `OpenAI 请求失败：${error.message}` : "OpenAI 请求失败。", {
      provider: "openai",
    });
  } finally {
    clearTimeout(timeout);
  }
}

function buildOpenAIError(response: Response, payload: OpenAIQuestionResponse, attempts: number) {
  const requestId = response.headers.get("x-request-id") || undefined;
  const openAIError = payload.error;
  const details = {
    provider: "openai",
    providerStatus: response.status,
    code: openAIError?.code,
    type: openAIError?.type,
    param: openAIError?.param,
    requestId,
    attempts,
  };
  return new QuestionBankError(openAIError?.message || `OpenAI 题库生成失败：HTTP ${response.status}`, details);
}

function normalizeQuestionBankError(error: unknown, attempts: number) {
  if (error instanceof QuestionBankError) {
    return new QuestionBankError(error.message, { ...error.details, attempts });
  }
  return new QuestionBankError(error instanceof Error ? error.message : "OpenAI 题库生成失败。", { provider: "openai", attempts });
}

function isRetryableQuestionBankError(error: QuestionBankError) {
  const status = error.details?.providerStatus;
  return !status || status === 408 || status === 409 || status === 429 || status >= 500;
}

function waitBeforeRetry(attempt: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, 250 * attempt);
  });
}

function getPositiveIntegerEnv(name: string, fallback: number, min: number, max: number) {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
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
