import type { DecisionModifier, Question } from "../types.js";

export type OpenAIQuestionResponse = {
  output_text?: string;
  output?: Array<{ content?: Array<{ text?: string }> }>;
  error?: {
    message?: string;
    code?: string;
    type?: string;
    param?: string;
  };
};

export const modifierKeys = [
  "handStrength",
  "drawPotential",
  "positionAdvantage",
  "opponentAggression",
  "foldEquity",
  "potOdds",
  "uncertainty",
  "showdownValue",
  "trapPotential",
  "chicken",
  "money",
  "skill",
  "destinySeed",
  "raiseScoreBonus",
  "callScoreBonus",
  "checkScoreBonus",
  "foldScoreBonus",
] as const;

const answerIntents = [
  "raise_bluff",
  "raise_value",
  "call_pressure",
  "call_curiosity",
  "check_control",
  "check_trap",
  "fold_caution",
  "skill_theory",
  "money_story",
  "chicken_attack",
  "destiny_high",
  "destiny_middle",
  "destiny_low",
] as const;

export function questionSchema(questionCount = 2) {
  const count = Math.max(1, Math.min(2, Math.round(questionCount)));

  return {
    type: "object",
    additionalProperties: false,
    required: ["questions"],
    properties: {
      questions: {
        type: "array",
        minItems: count,
        maxItems: count,
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
                required: ["id", "label", "intent"],
                properties: {
                  id: { type: "string" },
                  label: { type: "string" },
                  intent: { type: "string", enum: answerIntents },
                },
              },
            },
          },
        },
      },
    },
  };
}

export function normalizeQuestions(value: unknown): Question[] {
  if (!Array.isArray(value)) return [];
  const usedQuestionIds = new Set<string>();
  return value
    .slice(0, 2)
    .map((question, questionIndex) => {
      const item = question as { id?: unknown; text?: unknown; answers?: unknown };
      const answers = Array.isArray(item.answers) ? item.answers : [];
      const usedAnswerIds = new Set<string>();
      const questionId = uniqueId(safeId(item.id, `ai-q-${questionIndex + 1}`), usedQuestionIds);
      return {
        id: questionId,
        text: String(item.text || "").slice(0, 160),
        answers: answers.slice(0, 4).map((answer, answerIndex) => {
          const answerItem = answer as { id?: unknown; label?: unknown; intent?: unknown; modifiers?: unknown };
          const id = uniqueId(safeId(answerItem.id, `ai-a-${questionIndex + 1}-${answerIndex + 1}`), usedAnswerIds);
          const label = String(answerItem.label || "").slice(0, 64);
          const intent = normalizeIntent(answerItem.intent, answerIndex);
          const modifiers = normalizeModifiers(answerItem.modifiers);
          return {
            id,
            label,
            modifiers: Object.keys(modifiers).length ? modifiers : modifiersFromIntent(intent, `${id}:${label}:${questionIndex}:${answerIndex}`),
          };
        }),
      };
    })
    .filter((question) => question.text && question.answers.length === 4);
}

export function ensureUniqueQuestionAnswerIds(questions: Question[]) {
  const usedQuestionIds = new Set<string>();
  return questions.map((question, questionIndex) => {
    const usedAnswerIds = new Set<string>();
    return {
      ...question,
      id: uniqueId(safeId(question.id, `q-${questionIndex + 1}`), usedQuestionIds),
      answers: question.answers.map((answer, answerIndex) => ({
        ...answer,
        id: uniqueId(safeId(answer.id, `a-${questionIndex + 1}-${answerIndex + 1}`), usedAnswerIds),
      })),
    };
  });
}

export function normalizeModifiers(value: unknown): DecisionModifier {
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

function normalizeIntent(value: unknown, answerIndex: number) {
  if (typeof value === "string" && (answerIntents as readonly string[]).includes(value)) {
    return value as (typeof answerIntents)[number];
  }
  return answerIntents[answerIndex % answerIntents.length];
}

function modifiersFromIntent(intent: (typeof answerIntents)[number], seedText: string): DecisionModifier {
  const destinySeed = seededNumber(seedText, 1, 99);
  const maps: Record<(typeof answerIntents)[number], DecisionModifier> = {
    raise_bluff: { chicken: 2.2, foldEquity: 2.1, uncertainty: 0.4, raiseScoreBonus: 2.1, callScoreBonus: -0.6 },
    raise_value: { handStrength: 1.7, skill: 1, trapPotential: 0.8, raiseScoreBonus: 2, callScoreBonus: -0.3 },
    call_pressure: { money: 1.5, opponentAggression: 1.1, potOdds: 1.2, callScoreBonus: 2, raiseScoreBonus: -0.5 },
    call_curiosity: { money: 1.8, showdownValue: 1.1, uncertainty: 0.5, callScoreBonus: 1.8, foldScoreBonus: -0.5 },
    check_control: { skill: 1, uncertainty: 1.4, showdownValue: 0.8, checkScoreBonus: 1.9, chicken: -0.8 },
    check_trap: { trapPotential: 1.7, handStrength: 1, checkScoreBonus: 1.9, chicken: -0.4 },
    fold_caution: { uncertainty: 2, opponentAggression: 1.1, potOdds: -1, showdownValue: -0.9, foldScoreBonus: 2.4, chicken: -1.5, money: -1.2 },
    skill_theory: { skill: 1.8, positionAdvantage: 1, potOdds: 0.8, raiseScoreBonus: 1.1, callScoreBonus: 0.8 },
    money_story: { money: 2.2, callScoreBonus: 2, uncertainty: 0.4, foldScoreBonus: -0.7 },
    chicken_attack: { chicken: 2.5, foldEquity: 1.8, raiseScoreBonus: 2.3, callScoreBonus: -0.5 },
    destiny_high: { destinySeed, chicken: 1.4, raiseScoreBonus: 1.6 },
    destiny_middle: { destinySeed, money: 1.2, callScoreBonus: 1.4 },
    destiny_low: { destinySeed, uncertainty: 1.4, checkScoreBonus: 1.3, foldScoreBonus: 1.1 },
  };
  return maps[intent];
}

function seededNumber(text: string, min: number, max: number) {
  const range = max - min + 1;
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return min + ((hash >>> 0) % range);
}

export function parseModelJson(result: OpenAIQuestionResponse) {
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
  return (
    String(value || fallback)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 48) || fallback
  );
}

function uniqueId(id: string, usedIds: Set<string>) {
  let nextId = id;
  let suffix = 2;
  while (usedIds.has(nextId)) {
    nextId = `${id}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(nextId);
  return nextId;
}
