import { useEffect, useMemo, useRef, useState } from "react";
import { CharacterAvatar } from "./components/CharacterCard";
import { PbtiProfileDetail } from "./components/PbtiProfileDetail";
import { PbtiProfileGrid } from "./components/PbtiProfileGrid";
import { PlayingCard } from "./components/PlayingCard";
import { ResultCard } from "./components/ResultCard";
import { DEFAULT_DESTINY_QUESTION_PROMPT, DEFAULT_QUESTION_PROMPT } from "./config/questionPrompt";
import { characters } from "./data/characters";
import { homeQuotes, pickLoadingQuote, randomCopy } from "./data/gameCopy";
import { getPbtiProfile, pbtiProfiles, type PbtiProfile } from "./data/pbtiProfiles";
import { generateDecision } from "./logic/decisionEngine";
import { classifyPbtiProfile } from "./logic/pbtiClassifier";
import { analyzeShowdown, cardsToText, inferGameType, parseCards } from "./logic/pokerHandEvaluator";
import {
  buildQuestionRequestKey,
  getCachedQuestionSetCount,
  rememberQuestionSet,
  storeQuestionSet,
  takeCachedQuestionSet,
} from "./services/questionCache";
import { generateQuestions } from "./services/questionApi";
import {
  clearDecisionHistory,
  createDecisionHistoryEntry,
  loadDecisionHistory,
  saveDecisionEntry,
  updateDecisionFeedback,
} from "./services/decisionHistory";
import { recognizePokerPhoto } from "./services/photoRecognitionApi";
import type {
  Answer,
  Character,
  DecisionFeedback,
  DecisionHistoryEntry,
  DecisionResult,
  PokerGameMode,
  PokerGameType,
  PokerPhotoRecognition,
  PokerScenario,
  Question,
  RecognizedBoard,
  RecognizedPlayer,
} from "./types";

type Page = "home" | "result" | "promptAdmin" | "photoAnalyzer" | "summary" | "profiles" | "profileDetail";

const randomItem = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
const rollDestiny = () => Math.floor(Math.random() * 100) + 1;
const randomQuestionCount = () => (Math.random() < 0.72 ? 1 : 2);
const PROMPT_STORAGE_KEY = "pbti-question-prompt";
const DESTINY_PROMPT_STORAGE_KEY = "pbti-destiny-question-prompt";
const APP_ENV = import.meta.env.VITE_APP_ENV || import.meta.env.MODE || "development";
const SHOW_PROMPT_ADMIN = APP_ENV !== "production";

const OFFLINE_DECISION_CONTEXT: PokerScenario = {
  id: "offline-pbti-decision",
  title: "线下即时决策",
  heroHand: "",
  position: "Live",
  board: "",
  pot: 0,
  opponentAction: "table decision",
  situation: "线下打牌时的娱乐辅助决策，不绑定具体手牌或公共牌。",
  params: {
    handStrength: 5,
    drawPotential: 4.5,
    positionAdvantage: 5,
    opponentAggression: 5,
    foldEquity: 5,
    potOdds: 5,
    uncertainty: 5,
    showdownValue: 5,
    trapPotential: 4,
  },
};

function buildDecisionResult(character: Character, selectedAnswers: Answer[], destinyRoll: number | null, forceEasterEgg: boolean): DecisionResult {
  if (forceEasterEgg || Math.random() < 0.05) {
    const destiny = {
      status: "宇宙改判",
      effect: "本轮所有分数被彩蛋覆盖，强制弃牌。",
      specialEventName: "隐藏彩蛋：宇宙弃牌令",
    };

    return {
      action: "Fold",
      sizing: "弃牌",
      scoreBreakdown: { checkScore: 0, callScore: 0, raiseScore: 0, foldScore: 12 },
      voiceLine: `宇宙给你递了一张牌：弃牌。${forceEasterEgg ? "彩蛋模式已确认。" : "这不是懦弱，是命运。"}`,
      reasoning: `你触发了隐藏彩蛋（5% 概率${forceEasterEgg ? "，本次为强制触发" : ""}）！无论你的答案是什么，${character.name} 选择了弃牌。`,
      riskWarning: "彩蛋仅用于娱乐，与真实牌技无关。",
      personalityBias: "彩蛋模式：今天宇宙不让你入池。",
      commonDeath: "把 5% 彩蛋当成长期策略，下次还真以为宇宙在发短信。",
      destiny,
      destinyStatus: destiny.status,
      destinyEffect: destiny.effect,
      specialEventName: destiny.specialEventName,
      easterEgg: true,
    };
  }

  return generateDecision(character, OFFLINE_DECISION_CONTEXT, selectedAnswers, destinyRoll ?? undefined);
}

function App() {
  const [page, setPage] = useState<Page>("home");
  const [character, setCharacter] = useState<Character | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Answer[]>([]);
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [currentDecisionId, setCurrentDecisionId] = useState<string | null>(null);
  const [historyEntries, setHistoryEntries] = useState<DecisionHistoryEntry[]>(() => loadDecisionHistory());
  const [destinyRoll, setDestinyRoll] = useState<number | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [questionStatus, setQuestionStatus] = useState<"idle" | "loading" | "ready" | "fallback">("idle");
  const [questionError, setQuestionError] = useState("");
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealQuote, setRevealQuote] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<PbtiProfile | null>(null);
  const [forceEasterEgg, setForceEasterEgg] = useState(false);
  const [questionPrompt, setQuestionPrompt] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_QUESTION_PROMPT;
    return window.localStorage.getItem(PROMPT_STORAGE_KEY) || DEFAULT_QUESTION_PROMPT;
  });
  const [promptDraft, setPromptDraft] = useState(questionPrompt);
  const [destinyPrompt, setDestinyPrompt] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_DESTINY_QUESTION_PROMPT;
    return window.localStorage.getItem(DESTINY_PROMPT_STORAGE_KEY) || DEFAULT_DESTINY_QUESTION_PROMPT;
  });
  const [destinyPromptDraft, setDestinyPromptDraft] = useState(destinyPrompt);
  const inflightQuestionsRef = useRef(new Map<string, Promise<Question[]>>());
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const answeredAllQuestions = useMemo(() => {
    return Boolean(activeQuestions.length && selectedAnswers.filter(Boolean).length === activeQuestions.length);
  }, [activeQuestions.length, selectedAnswers]);

  function pickFallbackQuestions(char: Character, count: number) {
    return [...char.questions]
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(count, char.questions.length));
  }

  function hasWarmQuestions(char: Character, count: number) {
    return (
      getCachedQuestionSetCount(char, questionPrompt, destinyPrompt, count) > 0 ||
      inflightQuestionsRef.current.has(buildQuestionRequestKey(char, questionPrompt, destinyPrompt, count))
    );
  }

  function pickQuestionCountForCharacter(char: Character) {
    const preferred = randomQuestionCount();
    const alternate = preferred === 1 ? 2 : 1;
    if (hasWarmQuestions(char, preferred)) return preferred;
    if (hasWarmQuestions(char, alternate)) return alternate;
    return preferred;
  }

  useEffect(() => {
    if (page !== "home") return;
    let canceled = false;
    const queue = characters
      .filter((item) => getCachedQuestionSetCount(item, questionPrompt, destinyPrompt, 1) < 1)
      .map((character) => ({ character, count: 1 }));

    async function worker() {
      while (!canceled && queue.length) {
        const task = queue.shift();
        if (!task) return;
        try {
          await generateAndCacheQuestions(task.character, task.count, questionPrompt, destinyPrompt);
        } catch {
          // Preloading is opportunistic. The visible flow will still fall back safely.
        }
      }
    }

    void worker();

    return () => {
      canceled = true;
    };
  }, [page, questionPrompt, destinyPrompt]);

  useEffect(() => {
    return () => {
      clearRevealTimer();
    };
  }, []);

  function clearRevealTimer() {
    if (!revealTimerRef.current) return;
    clearTimeout(revealTimerRef.current);
    revealTimerRef.current = null;
  }

  function chooseCharacter(nextCharacter: Character) {
    clearRevealTimer();
    const count = pickQuestionCountForCharacter(nextCharacter);
    setCharacter(nextCharacter);
    setDestinyRoll(nextCharacter.decisionMode === "destiny" ? rollDestiny() : null);
    setSelectedAnswers([]);
    setResult(null);
    setCurrentDecisionId(null);
    setIsRevealing(false);
    setRevealQuote("");
    setActiveQuestions([]);
    setQuestionError("");
    loadQuestionBank(nextCharacter, count);
    setPage("result");
  }

  async function loadQuestionBank(nextCharacter: Character, count: number) {
    const cachedQuestions = takeCachedQuestionSet(nextCharacter, questionPrompt, destinyPrompt, count);
    if (cachedQuestions) {
      setActiveQuestions(cachedQuestions);
      setQuestionStatus("ready");
      setQuestionError("");
      void generateAndCacheQuestions(nextCharacter, count, questionPrompt, destinyPrompt).catch(() => undefined);
      return;
    }

    setQuestionStatus("loading");
    try {
      const questions = await generateAndCacheQuestions(nextCharacter, count, questionPrompt, destinyPrompt);
      rememberQuestionSet(nextCharacter, questionPrompt, destinyPrompt, questions);
      setActiveQuestions(questions.slice(0, count));
      setQuestionStatus("ready");
      setQuestionError("");
    } catch (error) {
      const fallbackQuestions = pickFallbackQuestions(nextCharacter, count);
      storeQuestionSet(nextCharacter, questionPrompt, destinyPrompt, fallbackQuestions);
      rememberQuestionSet(nextCharacter, questionPrompt, destinyPrompt, fallbackQuestions);
      setActiveQuestions(fallbackQuestions);
      setQuestionStatus("fallback");
      setQuestionError(`${error instanceof Error ? error.message : "题库生成失败"}；已临时使用本地随机题库。`);
    }
  }

  function generateAndCacheQuestions(nextCharacter: Character, count: number, prompt: string, destinyStylePrompt: string) {
    const requestKey = buildQuestionRequestKey(nextCharacter, prompt, destinyStylePrompt, count);
    const existing = inflightQuestionsRef.current.get(requestKey);
    if (existing) return existing;

    const request = generateQuestions(nextCharacter, prompt, count, destinyStylePrompt).then((questions) => {
      const normalizedQuestions = questions.slice(0, count);
      storeQuestionSet(nextCharacter, prompt, destinyStylePrompt, normalizedQuestions);
      return normalizedQuestions;
    });

    inflightQuestionsRef.current.set(requestKey, request);
    request.then(
      () => {
        inflightQuestionsRef.current.delete(requestKey);
      },
      () => {
        inflightQuestionsRef.current.delete(requestKey);
      },
    );
    return request;
  }

  function answerQuestion(questionIndex: number, answer: Answer) {
    setSelectedAnswers((current) => {
      const next = [...current];
      next[questionIndex] = answer;
      if (activeQuestions.length === 1) {
        window.setTimeout(() => revealDecision(next), 0);
      }
      return next;
    });
  }

  function revealDecision(answers = selectedAnswers) {
    const hasAnsweredAll = Boolean(activeQuestions.length && answers.filter(Boolean).length === activeQuestions.length);
    if (!character || !hasAnsweredAll || isRevealing) return;

    setIsRevealing(true);
    setRevealQuote(pickLoadingQuote(character));
    clearRevealTimer();
    const delay = 1200 + Math.round(Math.random() * 600);
    const nextResult = buildDecisionResult(character, answers, destinyRoll, forceEasterEgg);
    const entry = createDecisionHistoryEntry(character, activeQuestions, answers, nextResult);
    revealTimerRef.current = setTimeout(() => {
      setResult(nextResult);
      setCurrentDecisionId(entry.id);
      setHistoryEntries(saveDecisionEntry(entry));
      setIsRevealing(false);
      revealTimerRef.current = null;
    }, delay);
  }

  function playAnotherHand() {
    clearRevealTimer();
    if (!character) {
      setPage("home");
      return;
    }
    const count = pickQuestionCountForCharacter(character);
    setDestinyRoll(character.decisionMode === "destiny" ? rollDestiny() : null);
    setSelectedAnswers([]);
    setResult(null);
    setCurrentDecisionId(null);
    setIsRevealing(false);
    setRevealQuote("");
    setActiveQuestions([]);
    setQuestionError("");
    loadQuestionBank(character, count);
  }

  function toggleEasterEgg() {
    setForceEasterEgg((prev) => !prev);
  }

  function openPromptAdmin() {
    clearRevealTimer();
    setIsRevealing(false);
    setPromptDraft(questionPrompt);
    setDestinyPromptDraft(destinyPrompt);
    setPage("promptAdmin");
  }

  function openPhotoAnalyzer() {
    clearRevealTimer();
    setIsRevealing(false);
    setPage("photoAnalyzer");
  }

  function openSummary() {
    clearRevealTimer();
    setIsRevealing(false);
    setHistoryEntries(loadDecisionHistory());
    setPage("summary");
  }

  function openProfiles() {
    clearRevealTimer();
    setIsRevealing(false);
    setSelectedProfile(null);
    setPage("profiles");
  }

  function openProfileDetail(profile: PbtiProfile) {
    clearRevealTimer();
    setIsRevealing(false);
    setSelectedProfile(profile);
    setPage("profileDetail");
  }

  function setDecisionFeedback(feedback: DecisionFeedback) {
    if (!currentDecisionId) return;
    setHistoryEntries(updateDecisionFeedback(currentDecisionId, feedback));
  }

  function clearHistory() {
    setHistoryEntries(clearDecisionHistory());
  }

  function savePromptConfig() {
    const nextPrompt = promptDraft.trim() || DEFAULT_QUESTION_PROMPT;
    const nextDestinyPrompt = destinyPromptDraft.trim() || DEFAULT_DESTINY_QUESTION_PROMPT;
    setQuestionPrompt(nextPrompt);
    setPromptDraft(nextPrompt);
    setDestinyPrompt(nextDestinyPrompt);
    setDestinyPromptDraft(nextDestinyPrompt);
    window.localStorage.setItem(PROMPT_STORAGE_KEY, nextPrompt);
    window.localStorage.setItem(DESTINY_PROMPT_STORAGE_KEY, nextDestinyPrompt);
  }

  function resetPromptConfig() {
    setQuestionPrompt(DEFAULT_QUESTION_PROMPT);
    setPromptDraft(DEFAULT_QUESTION_PROMPT);
    setDestinyPrompt(DEFAULT_DESTINY_QUESTION_PROMPT);
    setDestinyPromptDraft(DEFAULT_DESTINY_QUESTION_PROMPT);
    window.localStorage.removeItem(PROMPT_STORAGE_KEY);
    window.localStorage.removeItem(DESTINY_PROMPT_STORAGE_KEY);
  }

  function switchToRandomCharacter() {
    chooseCharacter(randomItem(characters));
  }

  function goHome() {
    clearRevealTimer();
    setPage("home");
    setCharacter(null);
    setSelectedAnswers([]);
    setResult(null);
    setCurrentDecisionId(null);
    setIsRevealing(false);
    setDestinyRoll(null);
    setActiveQuestions([]);
    setQuestionStatus("idle");
    setQuestionError("");
  }

  return (
    <div className="min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="casino-bg min-h-screen">
        <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/20 pb-4">
            <button onClick={goHome} className="flex min-w-0 items-center gap-3 text-left">
              <span className="grid h-11 w-11 place-items-center rounded-lg border border-amber-400/60 bg-zinc-950 text-xl text-amber-200 shadow-gold">
                ♠
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black tracking-[0.24em] text-amber-500">PBTI TEST</span>
                <span className="block truncate text-lg font-black text-amber-100">PBTI：牌桌行为人格测试</span>
              </span>
            </button>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={openSummary}
                className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                  page === "summary"
                    ? "border-amber-300 bg-amber-300 text-zinc-950"
                    : "border-amber-400/40 bg-amber-500/10 text-amber-100 hover:bg-amber-300 hover:text-zinc-950"
                }`}
              >
                战绩总结
              </button>
              <button
                onClick={openProfiles}
                className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                  page === "profiles" || page === "profileDetail"
                    ? "border-fuchsia-300 bg-fuchsia-300 text-zinc-950"
                    : "border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-100 hover:bg-fuchsia-300 hover:text-zinc-950"
                }`}
              >
                人格图鉴
              </button>
              <button
                onClick={openPhotoAnalyzer}
                className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                  page === "photoAnalyzer"
                    ? "border-cyan-300 bg-cyan-300 text-zinc-950"
                    : "border-cyan-400/40 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-300 hover:text-zinc-950"
                }`}
              >
                拍照识别
              </button>
              {SHOW_PROMPT_ADMIN && (
                <button
                  onClick={openPromptAdmin}
                  className="rounded-full border border-zinc-800 bg-zinc-950/50 px-3 py-1.5 text-xs font-semibold text-zinc-500 transition hover:border-amber-500/60 hover:text-amber-200"
                >
                  Dev Prompt
                </button>
              )}
              {character && page === "result" && (
                <button
                  onClick={switchToRandomCharacter}
                  className="rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-sm font-bold text-amber-200 transition hover:bg-amber-400 hover:text-zinc-950"
                >
                  随机人格
                </button>
              )}
            </div>
          </header>

          <div className="flex flex-1 items-center py-8">
            {page === "home" && (
              <HomePage
                onSelectCharacter={chooseCharacter}
                onRandomCharacter={switchToRandomCharacter}
                onOpenPromptAdmin={openPromptAdmin}
                easterEggActive={forceEasterEgg}
                onToggleEasterEgg={toggleEasterEgg}
              />
            )}
            {page === "result" && character && (
              <ResultFlow
                character={character}
                questions={activeQuestions}
                questionStatus={questionStatus}
                questionError={questionError}
                selectedAnswers={selectedAnswers}
                result={result}
                isRevealing={isRevealing}
                revealQuote={revealQuote}
                destinyRoll={destinyRoll}
                answeredAllQuestions={answeredAllQuestions}
                onAnswer={answerQuestion}
                onReveal={revealDecision}
                onAgain={playAnotherHand}
                onChangeCharacter={switchToRandomCharacter}
                onHome={goHome}
                onSummary={openSummary}
                currentFeedback={historyEntries.find((entry) => entry.id === currentDecisionId)?.feedback}
                onFeedback={setDecisionFeedback}
              />
            )}
            {page === "promptAdmin" && (
              <PromptAdminPage
                prompt={promptDraft}
                destinyPrompt={destinyPromptDraft}
                savedPrompt={questionPrompt}
                savedDestinyPrompt={destinyPrompt}
                onPromptChange={setPromptDraft}
                onDestinyPromptChange={setDestinyPromptDraft}
                onSave={savePromptConfig}
                onReset={resetPromptConfig}
                onBack={goHome}
              />
            )}
            {page === "photoAnalyzer" && <PhotoAnalyzerPage onHome={goHome} />}
            {page === "summary" && <SummaryPage entries={historyEntries} onBack={goHome} onClear={clearHistory} onOpenProfiles={openProfiles} />}
            {page === "profiles" && <ProfilesPage onSelect={openProfileDetail} onBack={goHome} />}
            {page === "profileDetail" && selectedProfile && (
              <ProfileDetailPage profile={selectedProfile} onBack={openProfiles} />
            )}
          </div>

          <footer className="border-t border-amber-500/20 pt-4 text-center text-xs text-zinc-500">
            本工具仅用于娱乐与策略思维训练，不构成赌博建议。
          </footer>
        </main>
      </div>
    </div>
  );
}

// ====================== HomePage ======================

function HomePage({
  onSelectCharacter,
  onRandomCharacter,
  onOpenPromptAdmin,
  easterEggActive,
  onToggleEasterEgg,
}: {
  onSelectCharacter: (character: Character) => void;
  onRandomCharacter: () => void;
  onOpenPromptAdmin: () => void;
  easterEggActive: boolean;
  onToggleEasterEgg: () => void;
}) {
  const homeQuote = useMemo(() => randomCopy(homeQuotes), []);

  return (
    <section className="w-full space-y-6 sm:space-y-10">
      <div className="grid items-center gap-6 lg:gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="max-w-3xl">
          <p className="text-sm font-black tracking-[0.18em] text-amber-500">Poker Behavior Type Indicator</p>
          <h1 className="mt-4 text-4xl font-black leading-tight text-amber-100 sm:text-6xl lg:text-7xl">PBTI：牌桌行为人格测试</h1>
          <p className="mt-4 text-lg leading-8 text-zinc-300">鸡 / 钱 / 术，三维一测，看看你在牌桌上到底是哪种人。</p>
          <blockquote className="mt-5 max-w-2xl border-l-2 border-amber-400/70 pl-4 text-sm font-bold leading-6 text-amber-100/85 sm:text-base">
            “{homeQuote}”
          </blockquote>
          <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
            鸡：你有多想偷。
            <br />
            钱：你有多敢看。
            <br />
            术：你有多会把冲动包装成理论。
            <br />
            选择角色，回答几个问题，系统会生成你的牌桌行动：过牌/弃牌 / 跟注 / 加注。
          </p>
          <button
            onClick={onRandomCharacter}
            className="mt-6 rounded-xl border border-amber-200 bg-amber-400 px-6 py-3 font-black text-zinc-950 shadow-gold transition hover:scale-105 hover:bg-amber-300"
          >
            随机人格开局
          </button>
        </div>

        <div className="relative mx-auto w-full max-w-xl rounded-2xl border border-amber-500/50 bg-zinc-950/80 p-3 shadow-2xl sm:rounded-3xl sm:p-5">
          <div className="absolute inset-0 rounded-[1.2rem] border border-amber-400/20 sm:inset-4 sm:rounded-[1.4rem]" />
          <div className="relative z-10">
            <p className="text-sm font-bold text-amber-400">PBTI Characters</p>
            <h2 className="mt-2 text-3xl font-black text-amber-100">选择人格</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 lg:grid-cols-3">
              {characters.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectCharacter(item)}
                  className="group rounded-2xl border border-amber-500/35 bg-zinc-900/80 p-3 text-left transition hover:-translate-y-1 hover:border-amber-300"
                >
                  <CharacterAvatar character={item} size="small" />
                  <div className="mt-3">
                    <p className="font-black text-amber-100">{item.name}</p>
                    <p className="text-xs text-amber-400">{item.archetype}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <CoreConceptsSection />

      <HowToPlaySection />

      <div className="flex flex-wrap items-center justify-center gap-4">
        <label
          className="inline-flex cursor-pointer items-center gap-2 text-xs transition hover:text-purple-400"
          style={{ color: easterEggActive ? "#a855f7" : "#52525b" }}
        >
          <input
            type="checkbox"
            checked={easterEggActive}
            onChange={onToggleEasterEgg}
            className="h-3.5 w-3.5 accent-purple-500"
          />
          <span>🥚 彩蛋模式（强制弃牌）</span>
        </label>
        <button
          onClick={onOpenPromptAdmin}
          className="rounded-full border border-zinc-800 bg-zinc-950/50 px-3 py-1.5 text-xs font-semibold text-zinc-500 transition hover:border-amber-500/60 hover:text-amber-200"
        >
          修改题库 Prompt
        </button>
      </div>
    </section>
  );
}

function CoreConceptsSection() {
  const concepts = [
    {
      emoji: "🐔",
      label: "鸡",
      title: "偷鸡欲 (Chicken)",
      description: "你有多想偷。鸡瘾值越高，越容易主动施压、讲故事、把空气牌演成长篇小说。",
      color: "border-red-500/40",
    },
    {
      emoji: "💰",
      label: "钱",
      title: "钞能力 (Money)",
      description: "你有多敢看。钱值越高，越能承受波动、跟注压力、用筹码买下一幕剧情。",
      color: "border-amber-500/40",
    },
    {
      emoji: "🧠",
      label: "术",
      title: "技术流 (Skill)",
      description: "你有多会把冲动包装成理论。术越高，越擅长用范围、赔率和尺度解释自己的选择。",
      color: "border-cyan-500/40",
    },
    {
      emoji: "🎲",
      label: "命",
      title: "天命人 (Destiny)",
      description: "特殊角色不显示三维，每轮由随机数驱动。答案会给命运一点离谱解释，纯属娱乐。",
      color: "border-lime-500/40",
    },
  ];

  return (
    <section className="rounded-2xl border border-amber-500/30 bg-zinc-950/80 p-4 shadow-2xl sm:rounded-3xl sm:p-6">
      <p className="text-sm font-black uppercase tracking-[0.3em] text-amber-500">Core Concepts</p>
      <h2 className="mt-2 text-3xl font-black text-amber-100">核心概念</h2>
      <p className="mt-3 max-w-2xl text-zinc-400">
        PBTI 不评估真实牌技，而是用三种维度描述你面对决策时的本能倾向。
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {concepts.map((c) => (
          <div
            key={c.label}
            className={`rounded-2xl border ${c.color} bg-zinc-900/80 p-4 transition hover:-translate-y-1`}
          >
            <span className="text-2xl">{c.emoji}</span>
            <h3 className="mt-2 font-black text-amber-100">{c.title}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-300">{c.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowToPlaySection() {
  const steps = [
    {
      step: 1,
      title: "选择 PBTI 人格",
      description: "从当前人格中选一个你的牌桌分身，或者点「随机人格」碰运气。每个人格都有独特的鸡/钱/术属性和决策偏向。",
    },
    {
      step: 2,
      title: "回答 1～2 个人格问题",
      description: "每个问题对应角色的内心独白和牌桌信念。你的选择会影响后续决策的加权偏向。每次玩的题目数量随机。",
    },
    {
      step: 3,
      title: "获得行动建议",
      description: "系统综合角色属性、你的回答和 PBTI 决策引擎，给出过牌/弃牌 / 跟注 / 加注建议，附分数拆解和风险提示。",
    },
  ];

  return (
    <section className="rounded-2xl border border-amber-500/30 bg-zinc-950/80 p-4 shadow-2xl sm:rounded-3xl sm:p-6">
      <p className="text-sm font-black uppercase tracking-[0.3em] text-amber-500">How To Play</p>
      <h2 className="mt-2 text-3xl font-black text-amber-100">玩法说明</h2>
      <p className="mt-3 max-w-2xl text-zinc-400">
        三步搞定，不用记牌、不用算 pot odds，跟着人格走就行。
      </p>
      <div className="mt-8 grid gap-6">
        {steps.map((s) => (
          <div key={s.step} className="flex items-start gap-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-400 text-lg font-black text-zinc-950">
              {s.step}
            </span>
            <div>
              <h3 className="text-xl font-black text-amber-100">{s.title}</h3>
              <p className="mt-1 text-sm leading-6 text-zinc-300">{s.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ====================== Summary Page ======================

function SummaryPage({
  entries,
  onBack,
  onClear,
  onOpenProfiles,
}: {
  entries: DecisionHistoryEntry[];
  onBack: () => void;
  onClear: () => void;
  onOpenProfiles: () => void;
}) {
  const stats = useMemo(() => summarizeHistory(entries), [entries]);
  const classification = useMemo(
    () =>
      classifyPbtiProfile({
        ...stats.profile,
        actionCounts: stats.actionCounts,
        totalHands: stats.total,
      }),
    [stats],
  );
  const hasEntries = entries.length > 0;

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5">
      <div className="rounded-3xl border border-amber-500/35 bg-zinc-950/90 p-5 shadow-2xl sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.28em] text-amber-500">Local Record</p>
            <h1 className="mt-2 text-3xl font-black text-amber-100 sm:text-5xl">牌桌画像总结</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              每次抉择都会记录在当前浏览器本地。赢/输反馈会进入胜率、角色偏好和 PBTI 画像统计。
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onOpenProfiles}
              className="rounded-xl border border-fuchsia-500/45 px-4 py-2 text-sm font-bold text-fuchsia-100 transition hover:bg-fuchsia-500/10"
            >
              全部人格
            </button>
            <button
              onClick={onBack}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 transition hover:border-amber-500 hover:text-amber-100"
            >
              回首页
            </button>
            {hasEntries && (
              <button
                onClick={onClear}
                className="rounded-xl border border-red-500/50 px-4 py-2 text-sm font-bold text-red-100 transition hover:bg-red-500/10"
              >
                清空记录
              </button>
            )}
          </div>
        </div>
      </div>

      {!hasEntries ? (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/85 p-8 text-center">
          <p className="text-xl font-black text-amber-100">还没有战绩</p>
          <p className="mt-2 text-sm text-zinc-400">完成一次人格决策，并在结果页标记赢/输后，这里就会开始长出你的牌桌画像。</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryMetric label="总抉择" value={String(stats.total)} helper="本地记录局数" />
            <SummaryMetric label="已反馈" value={String(stats.feedbackTotal)} helper={`${stats.pendingTotal} 局未标记输赢`} />
            <SummaryMetric label="胜率" value={`${stats.winRate}%`} helper={`${stats.winTotal} 赢 / ${stats.lossTotal} 输`} />
            <SummaryMetric label="最常行动" value={stats.favoriteAction} helper="按最终建议统计" />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-3xl border border-amber-500/25 bg-zinc-950/85 p-5">
              <h2 className="text-xl font-black text-amber-100">PBTI 画像打分</h2>
              <p className="mt-1 text-sm text-zinc-500">基于角色基础值和你的答案 modifiers 汇总，仅用于娱乐画像。</p>
              <div className="mt-5 space-y-4">
                <ProfileBar label="鸡" value={stats.profile.chicken} description="偷鸡、主动下注、讲故事欲望" />
                <ProfileBar label="钱" value={stats.profile.money} description="看牌、抗压、用筹码买剧情" />
                <ProfileBar label="术" value={stats.profile.skill} description="范围、赔率、理论包装能力" />
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/85 p-5">
              <h2 className="text-xl font-black text-amber-100">行动分布</h2>
              <div className="mt-5 space-y-3">
                {stats.actionBars.map((bar) => (
                  <DistributionBar key={bar.label} label={bar.label} count={bar.count} total={stats.total} color={bar.color} />
                ))}
              </div>
            </div>
          </div>

          <PbtiProfileDetail profile={getPbtiProfile(classification.code)} classification={classification} totalHands={stats.total} />

          <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/85 p-5">
              <h2 className="text-xl font-black text-amber-100">常用人格</h2>
              <div className="mt-4 space-y-3">
                {stats.characterBars.map((bar) => (
                  <DistributionBar key={bar.label} label={bar.label} count={bar.count} total={stats.total} color="bg-amber-400" />
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/85 p-5">
              <h2 className="text-xl font-black text-amber-100">最近抉择</h2>
              <div className="mt-4 space-y-3">
                {entries.slice(0, 8).map((entry) => (
                  <HistoryRow key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function ProfilesPage({ onSelect, onBack }: { onSelect: (profile: PbtiProfile) => void; onBack: () => void }) {
  return (
    <section className="w-full space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-fuchsia-400">Personality Collection</p>
          <h1 className="mt-2 text-3xl font-black text-amber-100 sm:text-5xl">PBTI 全部人格档案</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">鸡 / 稳，豪 / 谨，术 / 风，组合出 8 种牌桌人格。</p>
        </div>
        <button onClick={onBack} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 transition hover:border-amber-400">
          回首页
        </button>
      </div>
      <PbtiProfileGrid profiles={pbtiProfiles} onSelect={onSelect} />
    </section>
  );
}

function ProfileDetailPage({ profile, onBack }: { profile: PbtiProfile; onBack: () => void }) {
  return (
    <section className="mx-auto w-full max-w-6xl space-y-4">
      <button onClick={onBack} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 transition hover:border-amber-400">
        返回全部人格
      </button>
      <PbtiProfileDetail profile={profile} />
    </section>
  );
}

function SummaryMetric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/85 p-4">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-amber-100">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{helper}</p>
    </div>
  );
}

function ProfileBar({ label, value, description }: { label: string; value: number; description: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="font-black text-amber-100">{label}</span>
        <span className="text-sm font-bold text-amber-300">{value.toFixed(1)}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-200" style={{ width: `${Math.max(0, Math.min(100, value * 10))}%` }} />
      </div>
      <p className="mt-1 text-xs text-zinc-500">{description}</p>
    </div>
  );
}

function DistributionBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percent = total ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-bold text-zinc-200">{label}</span>
        <span className="text-zinc-500">
          {count} · {percent}%
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function HistoryRow({ entry }: { entry: DecisionHistoryEntry }) {
  const feedbackLabel = entry.feedback === "win" ? "赢" : entry.feedback === "loss" ? "输" : "未反馈";
  const feedbackClass = entry.feedback === "win" ? "text-emerald-300" : entry.feedback === "loss" ? "text-red-300" : "text-zinc-500";
  const firstQuestion = entry.questions[0];
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-black text-amber-100">{entry.character.name}</p>
          <p className="text-xs text-zinc-500">{new Date(entry.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold">
          <span className="text-zinc-300">{displayAction(entry.result.action)}</span>
          <span className={feedbackClass}>{feedbackLabel}</span>
        </div>
      </div>
      {firstQuestion && (
        <p className="mt-2 line-clamp-2 text-sm leading-5 text-zinc-400">
          {firstQuestion.text}
          {firstQuestion.answer ? ` · ${firstQuestion.answer.label}` : ""}
        </p>
      )}
    </div>
  );
}

function summarizeHistory(entries: DecisionHistoryEntry[]) {
  const total = entries.length;
  const winTotal = entries.filter((entry) => entry.feedback === "win").length;
  const lossTotal = entries.filter((entry) => entry.feedback === "loss").length;
  const feedbackTotal = winTotal + lossTotal;
  const pendingTotal = total - feedbackTotal;
  const winRate = feedbackTotal ? Math.round((winTotal / feedbackTotal) * 100) : 0;

  const actionCounts = countBy(entries, (entry) => displayAction(entry.result.action));
  const rawActionCounts = entries.reduce(
    (counts, entry) => {
      const action = entry.result.action.toLowerCase() as "fold" | "check" | "call" | "raise";
      counts[action] += 1;
      return counts;
    },
    { fold: 0, check: 0, call: 0, raise: 0 },
  );
  const characterCounts = countBy(entries, (entry) => entry.character.name);
  const profileTotals = entries.reduce(
    (acc, entry) => {
      const base = entry.character.stats || { chicken: 5, money: 5, skill: 5 };
      const answerBoost = entry.questions.reduce(
        (boost, question) => ({
          chicken: boost.chicken + (question.answer?.modifiers.chicken || 0),
          money: boost.money + (question.answer?.modifiers.money || 0),
          skill: boost.skill + (question.answer?.modifiers.skill || 0),
        }),
        { chicken: 0, money: 0, skill: 0 },
      );
      acc.chicken += clampProfile(base.chicken + answerBoost.chicken);
      acc.money += clampProfile(base.money + answerBoost.money);
      acc.skill += clampProfile(base.skill + answerBoost.skill);
      return acc;
    },
    { chicken: 0, money: 0, skill: 0 },
  );

  const actionBars = [
    { label: "过牌/弃牌", count: actionCounts["过牌/弃牌"] || 0, color: "bg-emerald-500" },
    { label: "跟注", count: actionCounts["跟注"] || 0, color: "bg-blue-500" },
    { label: "加注", count: actionCounts["加注"] || 0, color: "bg-red-500" },
  ];
  const favoriteAction = [...actionBars].sort((a, b) => b.count - a.count)[0]?.label || "暂无";
  const characterBars = Object.entries(characterCounts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    total,
    winTotal,
    lossTotal,
    feedbackTotal,
    pendingTotal,
    winRate,
    favoriteAction,
    actionBars,
    actionCounts: rawActionCounts,
    characterBars,
    profile: {
      chicken: total ? profileTotals.chicken / total : 0,
      money: total ? profileTotals.money / total : 0,
      skill: total ? profileTotals.skill / total : 0,
    },
  };
}

function displayAction(action: DecisionResult["action"]) {
  if (action === "Check" || action === "Fold") return "过牌/弃牌";
  if (action === "Call") return "跟注";
  return "加注";
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = getKey(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function clampProfile(value: number) {
  return Math.max(0, Math.min(10, value));
}

// ====================== Photo Analyzer ======================

function PhotoAnalyzerPage({ onHome }: { onHome: () => void }) {
  const [mode, setMode] = useState<PokerGameMode>("auto");
  const [imagePreview, setImagePreview] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [players, setPlayers] = useState<RecognizedPlayer[]>(defaultPlayers);
  const [boards, setBoards] = useState<RecognizedBoard[]>(defaultBoards);
  const [recognition, setRecognition] = useState<PokerPhotoRecognition | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState("");

  const gameType: PokerGameType = useMemo(() => {
    if (mode === "auto" && recognition?.gameType && recognition.gameType !== "unknown") return recognition.gameType;
    return inferGameType(mode, players);
  }, [mode, players, recognition]);

  const showdownResults = useMemo(() => analyzeShowdown(gameType, players, boards), [gameType, players, boards]);

  function handleImageChange(file: File | undefined) {
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setStatus("idle");
    setError("");
  }

  async function runRecognition() {
    if (!imageFile) {
      setError("请先上传一张牌局照片。");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError("");
    try {
      const nextRecognition = await recognizePokerPhoto(imageFile, mode);
      const normalizedPlayers = nextRecognition.players.length ? nextRecognition.players : defaultPlayers;
      const normalizedBoards = nextRecognition.boards.length ? nextRecognition.boards : defaultBoards;
      setRecognition(nextRecognition);
      setPlayers(normalizedPlayers.map((player, index) => ({ ...player, id: player.id || `player-${index + 1}` })));
      setBoards(normalizedBoards.map((board, index) => ({ ...board, id: board.id || `board-${index + 1}` })));
      setStatus("ready");
    } catch (recognitionError) {
      setError(recognitionError instanceof Error ? recognitionError.message : "照片识别失败。");
      setStatus("error");
    }
  }

  function loadExample() {
    setMode("holdem");
    setRecognition({
      gameType: "holdem",
      confidence: 1,
      players: samplePlayers,
      boards: sampleBoards,
      pot: "示例牌面",
      notes: ["这是本地示例，方便验证胜负计算。"],
      warnings: [],
    });
    setPlayers(samplePlayers);
    setBoards(sampleBoards);
    setStatus("ready");
    setError("");
  }

  function updatePlayer(index: number, patch: Partial<RecognizedPlayer>) {
    setPlayers((current) => current.map((player, itemIndex) => (itemIndex === index ? { ...player, ...patch } : player)));
  }

  function updateBoard(index: number, patch: Partial<RecognizedBoard>) {
    setBoards((current) => current.map((board, itemIndex) => (itemIndex === index ? { ...board, ...patch } : board)));
  }

  function addPlayer() {
    setPlayers((current) => [...current, { id: `player-${Date.now()}`, seat: `玩家 ${current.length + 1}`, holeCards: [] }]);
  }

  function removePlayer(index: number) {
    setPlayers((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function addBoard() {
    setBoards((current) => [...current, { id: `board-${Date.now()}`, label: `第 ${current.length + 1} 路`, cards: [] }]);
  }

  function removeBoard(index: number) {
    setBoards((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <section className="w-full space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-cyan-500/30 bg-zinc-950/90 p-5 shadow-2xl sm:p-6">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.3em] text-cyan-400">Photo Hand Reader</p>
          <h1 className="mt-2 text-3xl font-black text-amber-100 sm:text-5xl">拍照识别牌型</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            上传牌局照片，先由视觉模型读取可见手牌和公共牌，再在本地按德州或奥马哈规则计算每一路胜利牌型。识别结果可以手动校准。
          </p>
        </div>
        <button
          onClick={onHome}
          className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 transition hover:border-amber-500 hover:text-amber-100"
        >
          回首页
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <aside className="space-y-5">
          <div className="rounded-2xl border border-cyan-500/30 bg-zinc-950/90 p-4 shadow-2xl">
            <h2 className="text-xl font-black text-amber-100">照片输入</h2>
            <label className="mt-4 flex min-h-64 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-cyan-500/40 bg-zinc-900/80 text-center transition hover:border-cyan-300">
              {imagePreview ? (
                <img src={imagePreview} alt="牌局照片预览" className="h-full max-h-80 w-full object-cover" />
              ) : (
                <span className="px-6 text-sm leading-6 text-zinc-400">点击上传牌局照片，建议让所有牌面完整入镜且尽量减少反光。</span>
              )}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => handleImageChange(event.target.files?.[0])}
              />
            </label>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {(["auto", "holdem", "omaha"] as PokerGameMode[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setMode(item)}
                  className={`rounded-xl border px-3 py-2 text-sm font-black transition ${
                    mode === item
                      ? "border-cyan-300 bg-cyan-300 text-zinc-950"
                      : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-cyan-400 hover:text-cyan-100"
                  }`}
                >
                  {modeLabel(item)}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={runRecognition}
                disabled={status === "loading"}
                className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-zinc-950 transition enabled:hover:scale-105 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
              >
                {status === "loading" ? "识别中..." : "识别照片"}
              </button>
              <button
                onClick={loadExample}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 transition hover:border-amber-500 hover:text-amber-100"
              >
                套用示例
              </button>
            </div>

            {error && <p className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-sm leading-6 text-red-100">{error}</p>}
            {recognition && (
              <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 text-sm leading-6 text-zinc-300">
                <p>
                  识别模式：<span className="font-bold text-cyan-200">{gameTypeLabel(recognition.gameType)}</span>
                </p>
                <p>
                  置信度：<span className="font-bold text-amber-200">{Math.round(recognition.confidence * 100)}%</span>
                </p>
                {recognition.pot && <p>底池/筹码：{recognition.pot}</p>}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-amber-500/25 bg-zinc-950/90 p-4">
            <h2 className="font-black text-amber-100">识别说明</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              视觉模型只负责读牌，本页会重新计算胜负。德州会从手牌和公共牌里选最佳 5 张；奥马哈会强制使用 2 张手牌 + 3 张公共牌。
            </p>
          </div>
        </aside>

        <div className="space-y-5">
          <div className="rounded-2xl border border-amber-500/30 bg-zinc-950/90 p-4 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.24em] text-amber-500">Calibration</p>
                <h2 className="mt-1 text-2xl font-black text-amber-100">牌面校准</h2>
              </div>
              <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-sm font-bold text-cyan-100">
                当前按 {gameTypeLabel(gameType)} 计算
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-black text-zinc-100">玩家手牌</h3>
                  <button
                    onClick={addPlayer}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-300 transition hover:border-amber-500 hover:text-amber-100"
                  >
                    添加玩家
                  </button>
                </div>
                <div className="mt-3 grid gap-3">
                  {players.map((player, index) => (
                    <div key={player.id || index} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
                      <div className="grid gap-3 sm:grid-cols-[140px_1fr_auto]">
                        <input
                          value={player.seat}
                          onChange={(event) => updatePlayer(index, { seat: event.target.value })}
                          placeholder="座位/玩家"
                          className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400"
                        />
                        <input
                          value={cardsToText(player.holeCards)}
                          onChange={(event) => updatePlayer(index, { holeCards: parseCards(event.target.value) })}
                          placeholder={gameType === "omaha" ? "A♠ K♠ Q♥ J♥" : "A♠ J♠"}
                          className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400"
                        />
                        <button
                          onClick={() => removePlayer(index)}
                          className="rounded-xl border border-red-500/40 px-3 py-2 text-xs font-bold text-red-100 transition hover:bg-red-500/10"
                        >
                          删除
                        </button>
                      </div>
                      <CardStrip cards={player.holeCards} />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-black text-zinc-100">公共牌 / 两路发牌</h3>
                  <button
                    onClick={addBoard}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-300 transition hover:border-amber-500 hover:text-amber-100"
                  >
                    添加一路
                  </button>
                </div>
                <div className="mt-3 grid gap-3">
                  {boards.map((board, index) => (
                    <div key={board.id || index} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
                      <div className="grid gap-3 sm:grid-cols-[140px_1fr_auto]">
                        <input
                          value={board.label}
                          onChange={(event) => updateBoard(index, { label: event.target.value })}
                          placeholder="第一路"
                          className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400"
                        />
                        <input
                          value={cardsToText(board.cards)}
                          onChange={(event) => updateBoard(index, { cards: parseCards(event.target.value) })}
                          placeholder="J♦ 8♣ 3♠ 2♥ A♣"
                          className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400"
                        />
                        <button
                          onClick={() => removeBoard(index)}
                          className="rounded-xl border border-red-500/40 px-3 py-2 text-xs font-bold text-red-100 transition hover:bg-red-500/10"
                        >
                          删除
                        </button>
                      </div>
                      <CardStrip cards={board.cards} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <ShowdownPanel results={showdownResults} />

          {(recognition?.notes?.length || recognition?.warnings?.length) && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/90 p-4">
              <h2 className="font-black text-amber-100">模型备注</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <InfoList title="Notes" items={recognition.notes || []} tone="text-zinc-300" />
                <InfoList title="Warnings" items={recognition.warnings || []} tone="text-red-100" />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CardStrip({ cards }: { cards: string[] }) {
  const parsedCards = parseCards(cards);
  if (!parsedCards.length) return <p className="mt-3 text-xs text-zinc-500">暂无有效牌面</p>;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {parsedCards.map((card) => (
        <PlayingCard key={card} card={card} />
      ))}
    </div>
  );
}

function ShowdownPanel({ results }: { results: ReturnType<typeof analyzeShowdown> }) {
  return (
    <section className="rounded-2xl border border-cyan-500/30 bg-zinc-950/90 p-4 shadow-2xl">
      <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-400">Showdown</p>
      <h2 className="mt-1 text-2xl font-black text-amber-100">胜利牌型</h2>
      <div className="mt-4 grid gap-4">
        {results.map((result) => (
          <div key={result.board.id || result.boardIndex} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-black text-amber-100">{result.board.label || `第 ${result.boardIndex + 1} 路`}</h3>
                <CardStrip cards={result.board.cards} />
              </div>
              <div className="rounded-xl border border-amber-500/40 bg-amber-400/10 px-4 py-2 text-right">
                <p className="text-xs font-bold text-amber-400">赢家</p>
                <p className="text-lg font-black text-amber-100">
                  {result.winners.length ? result.winners.map((winner) => winner.player.seat || "未命名玩家").join(" / ") : "待补全牌面"}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {result.players.map((playerResult) => {
                const isWinner = result.winners.some((winner) => winner.player === playerResult.player);
                return (
                  <div
                    key={playerResult.player.id || playerResult.player.seat}
                    className={`rounded-xl border p-3 ${
                      isWinner ? "border-amber-400 bg-amber-400/10" : "border-zinc-800 bg-zinc-950/70"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-black text-zinc-100">{playerResult.player.seat || "未命名玩家"}</p>
                        <p className={`mt-1 text-sm ${playerResult.valid ? "text-cyan-100" : "text-red-100"}`}>
                          {playerResult.valid ? playerResult.handName : playerResult.error}
                        </p>
                      </div>
                      {playerResult.bestCards && <CardStrip cards={playerResult.bestCards} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function InfoList({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  if (!items.length) return null;
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3">
      <p className="text-sm font-black text-amber-100">{title}</p>
      <ul className={`mt-2 space-y-1 text-sm leading-6 ${tone}`}>
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function modeLabel(mode: PokerGameMode) {
  if (mode === "holdem") return "德州";
  if (mode === "omaha") return "奥马哈";
  return "自动";
}

function gameTypeLabel(gameType: PokerGameType | "unknown") {
  if (gameType === "holdem") return "德州扑克";
  if (gameType === "omaha") return "奥马哈";
  return "未确定";
}

const defaultPlayers: RecognizedPlayer[] = [
  { id: "player-1", seat: "Hero", holeCards: [] },
  { id: "player-2", seat: "Villain", holeCards: [] },
];

const defaultBoards: RecognizedBoard[] = [{ id: "board-1", label: "第一路", cards: [] }];

const samplePlayers: RecognizedPlayer[] = [
  { id: "sample-hero", seat: "Hero", holeCards: ["J♣", "J♠"], isHero: true },
  { id: "sample-villain", seat: "Villain", holeCards: ["A♣", "A♦"] },
];

const sampleBoards: RecognizedBoard[] = [
  { id: "sample-board-1", label: "第一路", cards: ["T♣", "T♥", "J♦", "2♠", "A♣"] },
  { id: "sample-board-2", label: "第二路", cards: ["A♠", "K♦", "9♥", "4♣", "2♦"] },
];

function PromptAdminPage({
  prompt,
  destinyPrompt,
  savedPrompt,
  savedDestinyPrompt,
  onPromptChange,
  onDestinyPromptChange,
  onSave,
  onReset,
  onBack,
}: {
  prompt: string;
  destinyPrompt: string;
  savedPrompt: string;
  savedDestinyPrompt: string;
  onPromptChange: (prompt: string) => void;
  onDestinyPromptChange: (prompt: string) => void;
  onSave: () => void;
  onReset: () => void;
  onBack: () => void;
}) {
  const hasUnsavedChanges = prompt !== savedPrompt || destinyPrompt !== savedDestinyPrompt;

  return (
    <section className="mx-auto w-full max-w-5xl">
      <div className="rounded-3xl border border-amber-500/40 bg-zinc-950/90 p-5 shadow-2xl sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-amber-500/20 pb-5">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-amber-500">Question Prompt Admin</p>
            <h1 className="mt-2 text-3xl font-black text-amber-100 sm:text-4xl">题库 Prompt 配置</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              这里控制 OpenAI 生成题目的风格、约束和输出格式。保存后，下一次选择人格生成题目时会使用这些配置。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onBack}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 transition hover:border-amber-500 hover:text-amber-100"
            >
              回首页
            </button>
            <button
              onClick={onReset}
              className="rounded-xl border border-red-500/50 px-4 py-2 text-sm font-bold text-red-100 transition hover:bg-red-500/10"
            >
              恢复默认
            </button>
            <button
              onClick={onSave}
              className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-zinc-950 transition hover:scale-105 hover:bg-amber-300"
            >
              保存配置
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_280px]">
          <div>
            <label htmlFor="question-prompt" className="text-sm font-bold text-amber-200">
              全局题库 Prompt
            </label>
            <textarea
              id="question-prompt"
              value={prompt}
              onChange={(event) => onPromptChange(event.target.value)}
              className="mt-3 min-h-[520px] w-full resize-y rounded-2xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-sm leading-6 text-zinc-200 outline-none transition focus:border-amber-400"
              spellCheck={false}
            />

            <label htmlFor="destiny-question-prompt" className="mt-5 block text-sm font-bold text-lime-200">
              天命人荒诞题 Prompt
            </label>
            <textarea
              id="destiny-question-prompt"
              value={destinyPrompt}
              onChange={(event) => onDestinyPromptChange(event.target.value)}
              className="mt-3 min-h-[260px] w-full resize-y rounded-2xl border border-lime-700/40 bg-zinc-950 p-4 font-mono text-sm leading-6 text-zinc-200 outline-none transition focus:border-lime-400"
              spellCheck={false}
            />
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
              <h2 className="font-black text-amber-100">状态</h2>
              <p className={`mt-2 text-sm font-bold ${hasUnsavedChanges ? "text-amber-300" : "text-emerald-300"}`}>
                {hasUnsavedChanges ? "有未保存修改" : "当前配置已保存"}
              </p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                配置保存在当前浏览器的 localStorage，不会提交到 GitHub，也不会覆盖默认源码。
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
              <h2 className="font-black text-amber-100">建议保留</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-300">
                <li>只返回 JSON，不要 Markdown。</li>
                <li>严格遵守 questionCount。</li>
                <li>每题固定 4 个答案。</li>
                <li>modifiers 使用鸡、钱、术和分数 bonus。</li>
                <li>天命人题目用单独的荒诞题 prompt。</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-amber-500/25 bg-amber-400/10 p-4">
              <h2 className="font-black text-amber-100">变量说明</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                服务端会额外传入当前角色、questionCount、是否线下决策模式。你可以在 prompt 里要求模型根据这些上下文调整问题风格。
                天命人模式下，还会额外传入这里配置的 destinyPrompt。
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

// ====================== ResultFlow (Questions → Result) ======================

function ResultFlow({
  character,
  questions,
  questionStatus,
  questionError,
  selectedAnswers,
  result,
  isRevealing,
  revealQuote,
  destinyRoll,
  answeredAllQuestions,
  onAnswer,
  onReveal,
  onAgain,
  onChangeCharacter,
  onHome,
  onSummary,
  currentFeedback,
  onFeedback,
}: {
  character: Character;
  questions: Question[];
  questionStatus: "idle" | "loading" | "ready" | "fallback";
  questionError: string;
  selectedAnswers: Answer[];
  result: DecisionResult | null;
  isRevealing: boolean;
  revealQuote: string;
  destinyRoll: number | null;
  answeredAllQuestions: boolean;
  onAnswer: (questionIndex: number, answer: Answer) => void;
  onReveal: () => void;
  onAgain: () => void;
  onChangeCharacter: () => void;
  onHome: () => void;
  onSummary: () => void;
  currentFeedback?: DecisionFeedback;
  onFeedback: (feedback: DecisionFeedback) => void;
}) {
  const questionPhase = result === null;
  const isLoading = questionStatus === "loading";

  return (
    <section className="w-full">
      {questionPhase ? (
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-amber-500/35 bg-zinc-950/90 p-4 sm:items-center sm:flex-nowrap">
            <div className="flex items-center gap-4">
              <CharacterAvatar character={character} size="small" />
              <div>
                <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-baseline sm:gap-2">
                  <h2 className="text-xl font-black text-amber-100">{character.name}</h2>
                  <span className="text-sm text-amber-400">{character.archetype}</span>
                </div>
                <p className="mt-0.5 text-sm leading-5 text-zinc-400">{character.description}</p>
                {character.stats ? (
                  <div className="mt-2 flex flex-wrap gap-4">
                    <CompactStat label="鸡" value={character.stats.chicken} />
                    <CompactStat label="钱" value={character.stats.money} />
                    <CompactStat label="术" value={character.stats.skill} />
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
                    <span className="font-bold text-lime-400">天命</span>
                    <span className="text-zinc-500">· 随机驱动</span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onChangeCharacter}
              className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-300 transition hover:border-amber-500 hover:text-amber-100"
            >
              随机人格
            </button>
          </div>

          <div className="space-y-4">
            {isLoading && (
              <div className="rounded-2xl border border-amber-500/35 bg-amber-400/10 p-5 text-sm font-bold text-amber-100">
                正在生成本轮随机题目...
              </div>
            )}

            {questionError && (
              <div className="rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-sm leading-6 text-red-100">
                {questionError}
              </div>
            )}

            {isRevealing && (
              <div className="rounded-2xl border border-amber-400/50 bg-amber-400/10 p-5 text-center shadow-gold">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-400">Personality Judgement</p>
                <p className="mt-3 text-xl font-black text-amber-100">{revealQuote || "正在进行人格审判……"}</p>
                <div className="mx-auto mt-4 h-2 max-w-xs overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-amber-500 via-yellow-200 to-amber-500" />
                </div>
              </div>
            )}

            {questions.map((q, qi) => {
              const selectedAnswer = selectedAnswers[qi];
              return (
                <div key={q.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                  <p className="font-bold text-zinc-100">{q.text}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {q.answers.map((a, answerIndex) => {
                      const sel = selectedAnswer === a || (selectedAnswer?.id === a.id && selectedAnswer?.label === a.label);
                      return (
                        <button
                          key={`${a.id}-${answerIndex}`}
                          onClick={() => onAnswer(qi, a)}
                          disabled={isRevealing}
                          className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold transition hover:scale-[1.01] ${
                            sel
                              ? "border-amber-300 bg-amber-400 text-zinc-950"
                              : "border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-amber-500 hover:text-amber-100"
                          }`}
                        >
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/35 bg-zinc-950/80 p-4">
            <p className="text-sm text-zinc-400">
              已回答 {selectedAnswers.filter(Boolean).length}/{questions.length}
              {questions.length === 1 && !isLoading && !isRevealing ? " · 选择后自动进入审判" : ""}
            </p>
            {questions.length > 1 && (
              <button
                onClick={onReveal}
                disabled={!answeredAllQuestions || isLoading || isRevealing}
                className="rounded-xl bg-amber-400 px-5 py-3 font-black text-zinc-950 transition enabled:hover:scale-105 enabled:hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
              >
                {isRevealing ? "人格审判中..." : "揭晓牌桌行动"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <ResultCard
          character={character}
          questions={questions}
          selectedAnswers={selectedAnswers}
          result={result}
          onAgain={onAgain}
          onChangeCharacter={onChangeCharacter}
          onHome={onHome}
          onSummary={onSummary}
          currentFeedback={currentFeedback}
          onFeedback={onFeedback}
        />
      )}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-zinc-900/80 p-3">
      <p className="text-xs font-black text-amber-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-amber-100">{value}</p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-200" style={{ width: `${value * 10}%` }} />
      </div>
    </div>
  );
}

export default App;
function CompactStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-bold text-amber-400">{label}</span>
      <div className="h-2 w-16 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-200" style={{ width: `${value * 10}%` }} />
      </div>
      <span className="text-zinc-400">{value}</span>
    </div>
  );
}
