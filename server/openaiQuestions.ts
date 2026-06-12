import { normalizeQuestions, parseModelJson, questionSchema, type OpenAIQuestionResponse } from "../src/services/questionFormat";
import type { Character, PokerScenario, Question } from "../src/types";

export type QuestionBankInput = {
  apiKey: string;
  model?: string;
  prompt: string;
  character: Character;
  scenario: PokerScenario;
};

export async function generateQuestionBankFromOpenAI({ apiKey, model, prompt, character, scenario }: QuestionBankInput): Promise<Question[]> {
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
