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

let configuredProxyUrl = "";

export async function generateQuestionBankFromOpenAI({ apiKey, model, prompt, character, scenario, questionCount = 2, destinyPrompt }: QuestionBankInput): Promise<Question[]> {
  await configureOptionalProxy();
  const count = Math.max(1, Math.min(2, Math.round(questionCount)));

  const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
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

  const payload = (await openAIResponse.json().catch(() => ({}))) as OpenAIQuestionResponse;
  if (!openAIResponse.ok) {
    throw new Error(payload.error?.message || "OpenAI 题库生成失败。");
  }

  const parsed = parseModelJson(payload);
  const questions = normalizeQuestions(parsed?.questions);
  if (!questions.length) {
    throw new Error("OpenAI 没有返回可用题库。");
  }

  return questions;
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
