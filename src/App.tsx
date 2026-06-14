import { useEffect, useMemo, useRef, useState } from "react";
import { CharacterAvatar } from "./components/CharacterCard";
import { ResultCard } from "./components/ResultCard";
import { DEFAULT_DESTINY_QUESTION_PROMPT, DEFAULT_QUESTION_PROMPT } from "./config/questionPrompt";
import { characters } from "./data/characters";
import { generateDecision } from "./logic/decisionEngine";
import {
  buildQuestionRequestKey,
  getCachedQuestionSetCount,
  rememberQuestionSet,
  storeQuestionSet,
  takeCachedQuestionSet,
} from "./services/questionCache";
import { generateQuestions } from "./services/questionApi";
import type { Answer, Character, DecisionResult, PokerScenario, Question } from "./types";

declare const __OPENAI_KEY_SUFFIX__: string;

type Page = "home" | "result" | "promptAdmin";

const randomItem = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
const rollDestiny = () => Math.floor(Math.random() * 100) + 1;
const randomQuestionCount = () => (Math.random() < 0.72 ? 1 : 2);
const PROMPT_STORAGE_KEY = "pbti-question-prompt";
const DESTINY_PROMPT_STORAGE_KEY = "pbti-destiny-question-prompt";

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

function App() {
  const [page, setPage] = useState<Page>("home");
  const [character, setCharacter] = useState<Character | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Answer[]>([]);
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [destinyRoll, setDestinyRoll] = useState<number | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [questionStatus, setQuestionStatus] = useState<"idle" | "loading" | "ready" | "fallback">("idle");
  const [questionError, setQuestionError] = useState("");
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
    const queue = ([1, 2] as const).flatMap((count) =>
      characters
        .filter((item) => getCachedQuestionSetCount(item, questionPrompt, destinyPrompt, count) < 1)
        .map((character) => ({ character, count })),
    );

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
    void worker();

    return () => {
      canceled = true;
    };
  }, [page, questionPrompt, destinyPrompt]);

  function chooseCharacter(nextCharacter: Character) {
    const count = pickQuestionCountForCharacter(nextCharacter);
    setCharacter(nextCharacter);
    setDestinyRoll(nextCharacter.decisionMode === "destiny" ? rollDestiny() : null);
    setSelectedAnswers([]);
    setResult(null);
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

    const request = generateQuestions(nextCharacter, prompt, "", count, destinyStylePrompt).then((questions) => {
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
      return next;
    });
  }

  function revealDecision() {
    if (!character || !answeredAllQuestions) return;

    if (forceEasterEgg || Math.random() < 0.05) {
      setResult({
        action: "Fold",
        sizing: "Fold",
        scoreBreakdown: { checkScore: 0, callScore: 0, raiseScore: 0, foldScore: 12 },
        voiceLine: `宇宙给你递了一张牌：弃牌。${forceEasterEgg ? "彩蛋模式已确认。" : "这不是懦弱，是命运。"}`,
        reasoning: `你触发了隐藏彩蛋（5% 概率${forceEasterEgg ? "，本次为强制触发" : ""}）！无论你的答案是什么，${character.name} 选择了弃牌。`,
        riskWarning: "彩蛋仅用于娱乐，与真实牌技无关。",
        personalityBias: "彩蛋模式：今天宇宙不让你入池。",
        easterEgg: true,
      });
      return;
    }

    setResult(generateDecision(character, OFFLINE_DECISION_CONTEXT, selectedAnswers, destinyRoll ?? undefined));
  }

  function playAnotherHand() {
    if (!character) {
      setPage("home");
      return;
    }
    const count = pickQuestionCountForCharacter(character);
    setDestinyRoll(character.decisionMode === "destiny" ? rollDestiny() : null);
    setSelectedAnswers([]);
    setResult(null);
    setActiveQuestions([]);
    setQuestionError("");
    loadQuestionBank(character, count);
  }

  function toggleEasterEgg() {
    setForceEasterEgg((prev) => !prev);
  }

  function openPromptAdmin() {
    setPromptDraft(questionPrompt);
    setDestinyPromptDraft(destinyPrompt);
    setPage("promptAdmin");
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
    setPage("home");
    setCharacter(null);
    setSelectedAnswers([]);
    setResult(null);
    setDestinyRoll(null);
    setActiveQuestions([]);
    setQuestionStatus("idle");
    setQuestionError("");
  }

  return (
    <div className="min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="casino-bg min-h-screen">
        <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-3 border-b border-amber-500/20 pb-4">
            <button onClick={goHome} className="flex items-center gap-3 text-left">
              <span className="grid h-11 w-11 place-items-center rounded-lg border border-amber-400/60 bg-zinc-950 text-xl text-amber-200 shadow-gold">
                ♠
              </span>
              <span>
                <span className="block text-sm font-black tracking-[0.24em] text-amber-500">PBTI TEST</span>
                <span className="block text-lg font-black text-amber-100">牌桌行为人格</span>
              </span>
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={openPromptAdmin}
                className="rounded-full border border-zinc-700 bg-zinc-950/70 px-4 py-2 text-sm font-bold text-zinc-300 transition hover:border-amber-500 hover:text-amber-100"
              >
                Prompt 配置
              </button>
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
                destinyRoll={destinyRoll}
                answeredAllQuestions={answeredAllQuestions}
                onAnswer={answerQuestion}
                onReveal={revealDecision}
                onAgain={playAnotherHand}
                onChangeCharacter={switchToRandomCharacter}
                onHome={goHome}
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
  easterEggActive,
  onToggleEasterEgg,
}: {
  onSelectCharacter: (character: Character) => void;
  onRandomCharacter: () => void;
  easterEggActive: boolean;
  onToggleEasterEgg: () => void;
}) {
  return (
    <section className="w-full space-y-6 sm:space-y-10">
      <div className="grid items-center gap-6 lg:gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.32em] text-amber-500">Poker Behavior Type Indicator</p>
          <h1 className="mt-4 text-4xl font-black leading-tight text-amber-100 sm:text-6xl lg:text-7xl">PBTI：牌桌行为人格测试</h1>
          <p className="mt-4 text-lg leading-8 text-zinc-300">鸡 / 钱 / 术，三维一测，看看你在牌桌上到底是哪种人。</p>
          <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
            你以为你在打牌，其实你在暴露行为模式。
            <br />
            有人靠气场，有人靠技术，有人靠钞能力，有人靠天命。
            <br />
            选择角色，回答 1～2 个即时问题，看看你的牌桌人格如何做决策。
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

      {__OPENAI_KEY_SUFFIX__ && (
        <div className="flex justify-center">
          <ApiKeyIndicator suffix={__OPENAI_KEY_SUFFIX__} />
        </div>
      )}
      <div className="flex justify-center">
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
      description: "决定你有多倾向于主动施压、诈唬、偷池。鸡瘾值越高，越容易把空气牌演成长篇小说。",
      color: "border-red-500/40",
    },
    {
      emoji: "💰",
      label: "钱",
      title: "钞能力 (Money)",
      description: "筹码承受力和娱乐预算。钱值越高，越能淡定跟注大注、买剧情、扛波动。",
      color: "border-amber-500/40",
    },
    {
      emoji: "🧠",
      label: "术",
      title: "技术流 (Skill)",
      description: "对范围、赔率、下注尺度和 GTO / exploit 的理解。术越高，越能在复杂局面找到合理路径。",
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
      title: "获得 Action 建议",
      description: "系统综合角色属性、你的回答和 PBTI 决策引擎，给出 Check / Call / Raise 建议，附分数拆解和风险提示。",
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
  destinyRoll,
  answeredAllQuestions,
  onAnswer,
  onReveal,
  onAgain,
  onChangeCharacter,
  onHome,
}: {
  character: Character;
  questions: Question[];
  questionStatus: "idle" | "loading" | "ready" | "fallback";
  questionError: string;
  selectedAnswers: Answer[];
  result: DecisionResult | null;
  destinyRoll: number | null;
  answeredAllQuestions: boolean;
  onAnswer: (questionIndex: number, answer: Answer) => void;
  onReveal: () => void;
  onAgain: () => void;
  onChangeCharacter: () => void;
  onHome: () => void;
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
                正在用 OpenAI 生成本轮随机题目...
              </div>
            )}

            {questionError && (
              <div className="rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-sm leading-6 text-red-100">
                {questionError}
              </div>
            )}

            {questions.map((q, qi) => {
              const selectedId = selectedAnswers[qi]?.id;
              return (
                <div key={q.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                  <p className="font-bold text-zinc-100">{q.text}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {q.answers.map((a) => {
                      const sel = selectedId === a.id;
                      return (
                        <button
                          key={a.id}
                          onClick={() => onAnswer(qi, a)}
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
            </p>
            <button
              onClick={onReveal}
              disabled={!answeredAllQuestions || isLoading}
              className="rounded-xl bg-amber-400 px-5 py-3 font-black text-zinc-950 transition enabled:hover:scale-105 enabled:hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              揭晓人格 Action
            </button>
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
function ApiKeyIndicator({ suffix }: { suffix: string }) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 shadow-inner">
      <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
        <span>OPENAI_API_KEY</span>
        <span className="tracking-[0.1em] text-zinc-600">···{suffix}</span>
      </div>
    </section>
  );
}
