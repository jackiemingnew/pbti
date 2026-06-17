import type { Answer, Character, DecisionFeedback, DecisionHistoryEntry, DecisionResult, Question } from "../types";

const HISTORY_STORAGE_KEY = "pbti-decision-history";
const MAX_HISTORY_ITEMS = 200;

export function loadDecisionHistory(): DecisionHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HISTORY_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(isHistoryEntry) : [];
  } catch {
    return [];
  }
}

export function createDecisionHistoryEntry(character: Character, questions: Question[], answers: Answer[], result: DecisionResult): DecisionHistoryEntry {
  return {
    id: `decision-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    character: {
      id: character.id,
      name: character.name,
      archetype: character.archetype,
      stats: character.stats,
    },
    questions: questions.map((question, index) => {
      const answer = answers[index];
      return {
        id: question.id,
        text: question.text,
        answer: answer
          ? {
              id: answer.id,
              label: answer.label,
              modifiers: answer.modifiers,
            }
          : undefined,
      };
    }),
    result,
  };
}

export function saveDecisionEntry(entry: DecisionHistoryEntry) {
  const next = [entry, ...loadDecisionHistory().filter((item) => item.id !== entry.id)].slice(0, MAX_HISTORY_ITEMS);
  persistDecisionHistory(next);
  return next;
}

export function updateDecisionFeedback(id: string, feedback: DecisionFeedback) {
  const next = loadDecisionHistory().map((entry) => (entry.id === id ? { ...entry, feedback } : entry));
  persistDecisionHistory(next);
  return next;
}

export function clearDecisionHistory() {
  persistDecisionHistory([]);
  return [];
}

function persistDecisionHistory(entries: DecisionHistoryEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
}

function isHistoryEntry(value: unknown): value is DecisionHistoryEntry {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<DecisionHistoryEntry>;
  return Boolean(item.id && item.createdAt && item.character && item.result);
}
