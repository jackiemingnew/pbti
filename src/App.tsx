import { useMemo, useState } from "react";
import { CharacterAvatar } from "./components/CharacterCard";
import { ResultCard } from "./components/ResultCard";
import { characters } from "./data/characters";
import { scenarios } from "./data/scenarios";
import { generateDecision } from "./logic/decisionEngine";
import type { Answer, Character, DecisionResult, PokerScenario, Question } from "./types";

declare const __OPENAI_KEY_SUFFIX__: string;

type Page = "home" | "result";

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

  function pickQuestions(char: Character) {
    const count = Math.random() < 0.8 ? 1 : 2;
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
      setPage("home");
      return;
    }
    setScenario(randomItem(scenarios));
    setDestinyRoll(character.decisionMode === "destiny" ? rollDestiny() : null);
    setSelectedAnswers([]);
    setResult(null);
    setActiveQuestionIndices(pickQuestions(character));
  }

  function switchToRandomCharacter() {
    const activeCharacters = characters.filter((c) => c.id !== "soul-reader" && c.id !== "gto-tank");
    chooseCharacter(randomItem(activeCharacters));
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
                <span className="block text-lg font-black text-amber-100">牌桌行为人格</span>
              </span>
            </button>
            {character && page === "result" && (
              <button
                onClick={switchToRandomCharacter}
                className="rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-sm font-bold text-amber-200 transition hover:bg-amber-400 hover:text-zinc-950"
              >
                随机人格
              </button>
            )}
          </header>

          <div className="flex flex-1 items-center py-8">
            {page === "home" && <HomePage onSelectCharacter={chooseCharacter} />}
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
                onChangeCharacter={switchToRandomCharacter}
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

function HomePage({ onSelectCharacter }: { onSelectCharacter: (character: Character) => void }) {
  const featuredCharacters = characters.filter((item) => item.avatarImage).slice(0, 4);

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
            选择角色，打一手牌，看看你的牌桌人格如何做决策。
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-xl rounded-2xl border border-amber-500/50 bg-zinc-950/80 p-3 shadow-2xl sm:rounded-3xl sm:p-5">
          <div className="absolute inset-0 rounded-[1.2rem] border border-amber-400/20 sm:inset-4 sm:rounded-[1.4rem]" />
          <div className="relative z-10">
            <p className="text-sm font-bold text-amber-400">PBTI Characters</p>
            <h2 className="mt-2 text-3xl font-black text-amber-100">人格样本</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:gap-4">
              {featuredCharacters.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectCharacter(item)}
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
      description: "从 6 种人格中选一个你的牌桌分身，或者点「随机角色」碰运气。每个人格都有独特的鸡/钱/术属性和决策偏向。",
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
                    <span className="text-lg font-black text-amber-100">{destinyRoll ?? "-"}</span>
                    <span className="text-xs text-zinc-500">/100</span>
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
              disabled={!answeredAllQuestions}
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
