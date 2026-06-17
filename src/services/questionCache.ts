import type { Character, Question } from "../types";
import { ensureUniqueQuestionAnswerIds } from "./questionFormat";

type CachedQuestionSet = {
  createdAt: number;
  questionCount: number;
  questions: Question[];
  signature: string;
};

const CACHE_VERSION = "v2";
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const MAX_SETS_PER_COUNT = 4;
const RECENT_LIMIT = 10;

export function buildQuestionCacheKey(character: Character, prompt: string, destinyPrompt: string) {
  return `pbti-question-cache:${CACHE_VERSION}:${character.id}:${hashText(`${prompt}\n---destiny---\n${destinyPrompt}`)}`;
}

export function buildQuestionRequestKey(character: Character, prompt: string, destinyPrompt: string, questionCount: number) {
  return `${buildQuestionCacheKey(character, prompt, destinyPrompt)}:${questionCount}`;
}

export function getCachedQuestionSetCount(character: Character, prompt: string, destinyPrompt: string, questionCount: number) {
  const key = buildQuestionCacheKey(character, prompt, destinyPrompt);
  return readCache(key).filter((set) => set.questionCount === questionCount).length;
}

export function takeCachedQuestionSet(character: Character, prompt: string, destinyPrompt: string, questionCount: number) {
  const key = buildQuestionCacheKey(character, prompt, destinyPrompt);
  const recentKey = `${key}:recent`;
  const recent = readRecent(recentKey);
  const cache = readCache(key);
  const candidates = cache.filter((set) => set.questionCount === questionCount);
  const set = candidates.find((item) => !recent.includes(item.signature)) || candidates[0];
  if (!set) {
    writeCache(key, cache);
    return null;
  }

  writeCache(key, cache);
  rememberRecent(recentKey, set.signature);
  return ensureUniqueQuestionAnswerIds(set.questions);
}

export function storeQuestionSet(character: Character, prompt: string, destinyPrompt: string, questions: Question[]) {
  if (!questions.length) return;

  const key = buildQuestionCacheKey(character, prompt, destinyPrompt);
  const normalizedQuestions = ensureUniqueQuestionAnswerIds(questions);
  const signature = getQuestionSignature(normalizedQuestions);
  const existing = readCache(key).filter((set) => set.signature !== signature);
  const next = [
    {
      createdAt: Date.now(),
      questionCount: normalizedQuestions.length,
      questions: normalizedQuestions,
      signature,
    },
    ...existing,
  ];

  writeCache(key, capCache(next));
}

export function rememberQuestionSet(character: Character, prompt: string, destinyPrompt: string, questions: Question[]) {
  const key = buildQuestionCacheKey(character, prompt, destinyPrompt);
  rememberRecent(`${key}:recent`, getQuestionSignature(ensureUniqueQuestionAnswerIds(questions)));
}

function readCache(key: string): CachedQuestionSet[] {
  const now = Date.now();
  const raw = safeStorageGet(key);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as CachedQuestionSet[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((set) => {
        return (
          Array.isArray(set.questions) &&
          typeof set.signature === "string" &&
          typeof set.createdAt === "number" &&
          now - set.createdAt < CACHE_TTL_MS
        );
      })
      .map((set) => ({ ...set, questions: ensureUniqueQuestionAnswerIds(set.questions) }));
  } catch {
    return [];
  }
}

function writeCache(key: string, sets: CachedQuestionSet[]) {
  safeStorageSet(key, JSON.stringify(capCache(sets)));
}

function capCache(sets: CachedQuestionSet[]) {
  return [1, 2].flatMap((count) =>
    sets
      .filter((set) => set.questionCount === count)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MAX_SETS_PER_COUNT),
  );
}

function readRecent(key: string) {
  const raw = safeStorageGet(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string").slice(0, RECENT_LIMIT) : [];
  } catch {
    return [];
  }
}

function rememberRecent(key: string, signature: string) {
  const next = [signature, ...readRecent(key).filter((item) => item !== signature)].slice(0, RECENT_LIMIT);
  safeStorageSet(key, JSON.stringify(next));
}

function getQuestionSignature(questions: Question[]) {
  return hashText(
    questions
      .map((question) => `${question.text}::${question.answers.map((answer) => answer.label).join("|")}`)
      .join("##")
      .toLowerCase(),
  );
}

function hashText(text: string) {
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 33) ^ text.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function safeStorageGet(key: string) {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function safeStorageSet(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage pressure or private-mode failures; live generation still works.
  }
}
