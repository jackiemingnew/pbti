import { useMemo, useState } from "react";
import { CharacterAvatar, CharacterCard } from "./components/CharacterCard";
import { QuestionPanel } from "./components/QuestionPanel";
import { ResultCard } from "./components/ResultCard";
import { characters } from "./data/characters";
import { scenarios } from "./data/scenarios";
import { generateDecision } from "./logic/decisionEngine";
import type { Answer, Character, DecisionResult, PokerScenario, Question } from "./types";

declare const __OPENAI_KEY_SUFFIX__: string;

type Page = "home" | "select" | "result";

const randomItem = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
const rollDestiny = () => Math.floor(Math.random() * 100) + 1;

function App() {
  const [page, setPage] = useState<Page>("home");
  const [character, setCharacter] = useState<Character | null>(null);
  const [scenario, setScenario] = useState<PokerScenario | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Answer[]>([]);
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [destinyRoll, setDestinyRoll] = useState<number | null>(null);
  const [activeQuestionIndices, setActiveQuestionIndices] = useState<number[]>([]);

  const activeQuestions = useMemo(() => {
    if (!character) return [];
    return activeQuestionIndices.map((i) => character.questions[i]).filter(Boolean);
  }, [character, activeQuestionIndices]);

  const answeredAllQuestions = useMemo(() => {
    return Boolean(activeQuestions.length && selectedAnswers.filter(Boolean).length === activeQuestions.length);
  }, [activeQuestions.length, selectedAnswers]);

  function startGame() {
    setPage("select");
  }

  function pickQuestions(char: Character) {
    const count = Math.random() < 0.5 ? 1 : 2;
    const offsets: number[] = [];
    const qLen = char.questions.length;
    if (count === 1) {
      offsets.push(Math.floor(Math.random() * qLen));
    } else {
      for (let i = 0; i < Math.min(2, qLen); i++) offsets.push(i);
    }
    return offsets;
  }

  function chooseCharacter(nextCharacter: Character) {
    setCharacter(nextCharacter);
    setScenario(randomItem(scenarios));
    setDestinyRoll(nextCharacter.decisionMode === "destiny" ? rollDestiny() : null);
    setSelectedAnswers([]);
    setResult(null);
    setActiveQuestionIndices(pickQuestions(nextCharacter));
    setPage("result");
  }

  function chooseRandomCharacter() {
    chooseCharacter(randomItem(characters));
  }

  function answerQuestion(questionIndex: number, answer: Answer) {
    setSelectedAnswers((current) => {
      const next = [...current];
      next[questionIndex] = answer;
      return next;
    });
  }

  function revealDecision() {
    if (!character || !scenario || !answeredAllQuestions) return;
    setResult(generateDecision(character, scenario, selectedAnswers, destinyRoll ?? undefined));
  }

  function playAnotherHand() {
    if (!character) {
      setPage("select");
      return;
    }
    setScenario(randomItem(scenarios));
    setDestinyRoll(character.decisionMode === "destiny" ? rollDestiny() : null);
    setSelectedAnswers([]);
    setResult(null);
    setActiveQuestionIndices(pickQuestions(character));
  }

  function changeCharacter() {
    setSelectedAnswers([]);
    setResult(null);
    setDestinyRoll(null);
    setPage("select");
  }

  function goHome() {
    setPage("home");
    setCharacter(null);
    setScenario(null);
    setSelectedAnswers([]);
    setResult(null);
    setDestinyRoll(null);
    setActiveQuestionIndices([]);
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
                <span className="block text-lg font-black text-amber-100">牌桌脑腐人格</span>
              </span>
            </button>
            {character && page === "result" && (
              <button
                onClick={changeCharacter}
                className="rounded-full border border-amber-500/30 bg-zinc-950/70 px-4 py-2 text-sm font-bold text-amber-100 transition hover:bg-amber-500/20"
              >
                换角色
              </button>
            )}
          </header>

          <div className="flex flex-1 items-center py-8">
            {page === "home" && <HomePage onStart={startGame} />}
            {page === "select" && <CharacterSelectPage onSelect={chooseCharacter} onRandom={chooseRandomCharacter} />}
            {page === "result" && character && scenario && (
              <ResultFlow
                character={character}
                scenario={scenario}
                questions={activeQuestions}
                selectedAnswers={selectedAnswers}
                result={result}
                destinyRoll={destinyRoll}
                answeredAllQuestions={answeredAllQuestions}
                onAnswer={answerQuestion}
                onReveal={revealDecision}
                onAgain={playAnotherHand}
                onChangeCharacter={changeCharacter}
                onHome={goHome}
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

function HomePage({ onStart }: { onStart: () => void }) {
  const featuredCharacters = characters.filter((item) => item.avatarImage).slice(0, 4);

  return (
    <section className="w-full space-y-10">
      <div className="grid items-center gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.32em] text-amber-500">Poker Brainrot Type Indicator</p>
          <h1 className="mt-4 text-4xl font-black leading-tight text-amber-100 sm:text-6xl lg:text-7xl">
            <span className="block">《PBTI：</span>
            <span className="block">牌桌脑腐人格测试》</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-300">
            用鸡、钱、术三维测试你的牌桌脑回路。这里没有真钱下注，也不是严肃求解器，只有偷鸡欲、钞能力、技术流和一点命运玄学。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={onStart}
              className="rounded-xl border border-amber-200 bg-amber-400 px-7 py-4 text-lg font-black text-zinc-950 shadow-gold transition hover:scale-105 hover:bg-amber-300"
            >
              开始游戏
            </button>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl rounded-3xl border border-amber-500/50 bg-zinc-950/80 p-5 shadow-2xl">
          <div className="absolute inset-4 rounded-[1.4rem] border border-amber-400/20" />
          <div className="relative z-10">
            <p className="text-sm font-bold text-amber-400">PBTI Characters</p>
            <h2 className="mt-2 text-3xl font-black text-amber-100">脑腐人格样本</h2>
            <div className="mt-5 grid grid-cols-2 gap-4">
              {featuredCharacters.map((item) => (
                <button
                  key={item.id}
                  onClick={onStart}
                  className="group overflow-hidden rounded-2xl border border-amber-500/35 bg-zinc-900/80 text-left transition hover:-translate-y-1 hover:border-amber-300"
                >
                  <img src={item.avatarImage} alt={item.name} className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105" />
                  <div className="p-3">
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
      description: "特殊角色不显示三维，每手由随机数驱动。答案会给命运一点离谱解释，纯属娱乐。",
      color: "border-lime-500/40",
    },
  ];

  return (
    <section className="rounded-3xl border border-amber-500/30 bg-zinc-950/80 p-6 shadow-2xl sm:p-8">
      <p className="text-sm font-black uppercase tracking-[0.3em] text-amber-500">Core Concepts</p>
      <h2 className="mt-2 text-3xl font-black text-amber-100">核心概念</h2>
      <p className="mt-3 max-w-2xl text-zinc-400">
        PBTI 不评估真实牌技，而是用三种脑腐维度描述你面对决策时的本能倾向。
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
      description: "从 6 种脑腐人格中选一个你的牌桌分身，或者点「随机角色」碰运气。每个人格都有独特的鸡/钱/术属性和决策偏向。",
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
    <section className="rounded-3xl border border-amber-500/30 bg-zinc-950/80 p-6 shadow-2xl sm:p-8">
      <p className="text-sm font-black uppercase tracking-[0.3em] text-amber-500">How To Play</p>
      <h2 className="mt-2 text-3xl font-black text-amber-100">玩法说明</h2>
      <p className="mt-3 max-w-2xl text-zinc-400">
        三步搞定，不用记牌、不用算 pot odds，跟着脑腐人格走就行。
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

// ====================== CharacterSelectPage ======================

function CharacterSelectPage({
  onSelect,
  onRandom,
}: {
  onSelect: (character: Character) => void;
  onRandom: () => void;
}) {
  return (
    <section className="w-full">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.3em] text-amber-500">Choose PBTI</p>
          <h1 className="mt-2 text-4xl font-black text-amber-100">选择你的脑腐人格</h1>
        </div>
        <button
          onClick={onRandom}
          className="rounded-xl border border-amber-300 bg-zinc-950/80 px-5 py-3 font-black text-amber-100 shadow-gold transition hover:scale-105 hover:bg-amber-400 hover:text-zinc-950"
        >
          随机角色
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {characters.map((item) => (
          <CharacterCard key={item.id} character={item} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}

// ====================== ResultFlow (Questions → Result) ======================

function ResultFlow({
  character,
  scenario,
  questions,
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
  scenario: PokerScenario;
  questions: Question[];
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

  return (
    <section className="w-full">
      {questionPhase ? (
        <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
          <aside className="rounded-3xl border border-amber-500/45 bg-zinc-950/88 p-5 shadow-2xl">
            <CharacterAvatar character={character} size="large" />
            <p className="mt-5 text-sm font-bold text-amber-400">{character.archetype}</p>
            <h2 className="mt-1 text-3xl font-black text-amber-100">{character.name}</h2>
            <p className="mt-3 leading-7 text-zinc-300">{character.description}</p>
            {character.stats ? (
              <div className="mt-5 grid grid-cols-3 gap-3">
                <MiniStat label="鸡" value={character.stats.chicken} />
                <MiniStat label="钱" value={character.stats.money} />
                <MiniStat label="术" value={character.stats.skill} />
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-amber-500/35 bg-amber-400/10 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500">Destiny System</p>
                <p className="mt-1 text-3xl font-black text-amber-100">
                  {destinyRoll ?? "-"}<span className="ml-1 text-sm text-zinc-400">/100</span>
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">本手随机驱动，不属于 PBTI 基础三维。</p>
              </div>
            )}
            <button
              onClick={onChangeCharacter}
              className="mt-6 w-full rounded-xl border border-zinc-700 px-4 py-3 font-bold text-zinc-200 transition hover:border-amber-500 hover:bg-amber-500/10 hover:text-amber-100"
            >
              换个人格
            </button>
          </aside>

          <div className="space-y-5">
            <QuestionPanel
              character={character}
              questions={questions}
              selectedAnswers={selectedAnswers}
              isLoading={false}
              onAnswer={onAnswer}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/35 bg-zinc-950/80 p-4">
              <p className="text-sm text-zinc-400">
                已回答 {selectedAnswers.filter(Boolean).length}/{questions.length}
              </p>
              <button
                onClick={onReveal}
                disabled={!answeredAllQuestions}
                className="rounded-xl bg-amber-400 px-5 py-3 font-black text-zinc-950 transition enabled:hover:scale-105 enabled:hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
              >
                揭晓人格 Action
              </button>
            </div>
          </div>
        </div>
      ) : (
        <ResultCard
          character={character}
          scenario={scenario}
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
