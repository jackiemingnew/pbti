import type { Character, DecisionModifier, PokerScenario, Question } from "../types";

type OpenAIQuestionResponse = {
  output_text?: string;
  output?: Array<{ content?: Array<{ text?: string }> }>;
  error?: { message?: string };
};

const modifierKeys = [
  "handStrength",
  "drawPotential",
  "positionAdvantage",
  "opponentAggression",
  "foldEquity",
  "potOdds",
  "uncertainty",
  "showdownValue",
  "trapPotential",
  "courage",
  "technique",
  "bankroll",
  "read",
  "destinySeed",
  "raiseScoreBonus",
  "callScoreBonus",
  "checkScoreBonus",
] as const;

export async function generateQuestions(
  character: Character,
  scenario: PokerScenario,
  prompt: string,
  apiKey: string,
): Promise<Question[]> {
  if (!apiKey.trim()) {
    throw new Error("请输入 OpenAI API key 后再生成题库。");
  }

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
                scenario,
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
          schema: questionSchema(),
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

function questionSchema() {
  const modifierProperties = Object.fromEntries(modifierKeys.map((key) => [key, { type: ["number", "null"] }]));

  return {
    type: "object",
    additionalProperties: false,
    required: ["questions"],
    properties: {
      questions: {
        type: "array",
        minItems: 2,
        maxItems: 2,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "text", "answers"],
          properties: {
            id: { type: "string" },
            text: { type: "string" },
            answers: {
              type: "array",
              minItems: 4,
              maxItems: 4,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "label", "modifiers"],
                properties: {
                  id: { type: "string" },
                  label: { type: "string" },
                  modifiers: {
                    type: "object",
                    additionalProperties: false,
                    required: modifierKeys,
                    properties: modifierProperties,
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

function normalizeQuestions(value: unknown): Question[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 2)
    .map((question, questionIndex) => {
      const item = question as { id?: unknown; text?: unknown; answers?: unknown };
      const answers = Array.isArray(item.answers) ? item.answers : [];
      return {
        id: safeId(item.id, `ai-q-${questionIndex + 1}`),
        text: String(item.text || "").slice(0, 160),
        answers: answers.slice(0, 4).map((answer, answerIndex) => {
          const answerItem = answer as { id?: unknown; label?: unknown; modifiers?: unknown };
          return {
            id: safeId(answerItem.id, `ai-a-${questionIndex + 1}-${answerIndex + 1}`),
            label: String(answerItem.label || "").slice(0, 64),
            modifiers: normalizeModifiers(answerItem.modifiers),
          };
        }),
      };
    })
    .filter((question) => question.text && question.answers.length === 4);
}

function normalizeModifiers(value: unknown): DecisionModifier {
  const source = typeof value === "object" && value ? (value as Record<string, unknown>) : {};
  const normalized: DecisionModifier = {};
  for (const key of modifierKeys) {
    const raw = source[key];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      normalized[key] = key === "destinySeed" ? Math.max(1, Math.min(99, Math.round(raw))) : Math.max(-10, Math.min(10, Number(raw.toFixed(2))));
    }
  }
  return normalized;
}

function parseModelJson(result: OpenAIQuestionResponse) {
  const outputText = typeof result.output_text === "string" ? result.output_text : extractOutputText(result);
  if (!outputText) return null;
  try {
    return JSON.parse(outputText);
  } catch {
    const match = outputText.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function extractOutputText(result: OpenAIQuestionResponse) {
  const output = Array.isArray(result.output) ? result.output : [];
  for (const item of output) {
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (typeof part.text === "string") return part.text;
    }
  }
  return "";
}

function safeId(value: unknown, fallback: string) {
  return String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48) || fallback;
}
