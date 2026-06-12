import { useMemo, useState } from "react";
import { CharacterAvatar, CharacterCard } from "./components/CharacterCard";
import { PokerTable } from "./components/PokerTable";
import { QuestionPanel } from "./components/QuestionPanel";
import { ResultCard } from "./components/ResultCard";
import { DEFAULT_QUESTION_PROMPT } from "./config/questionPrompt";
import { characters } from "./data/characters";
import { scenarios } from "./data/scenarios";
import { generateDecision } from "./logic/decisionEngine";
import { generateQuestions } from "./services/questionApi";
import type { Answer, Character, DecisionResult, PokerScenario, Question } from "./types";

type Page = "home" | "select" | "scenario" | "result" | "imageTest";

const randomItem = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const avatarGlyph = (id: string) =>
  id === "destiny-fool"
    ? "天"
    : id === "gto-tank"
      ? "♜"
      : id === "boss-whale"
        ? "♛"
        : id === "soul-reader"
          ? "☽"
          : id === "bluff-assassin"
            ? "♞"
            : "♚";

function App() {
  const [page, setPage] = useState<Page>("home");
  const [character, setCharacter] = useState<Character | null>(null);
  const [scenario, setScenario] = useState<PokerScenario | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Answer[]>([]);
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [reuseScenario, setReuseScenario] = useState(false);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [questionStatus, setQuestionStatus] = useState<"idle" | "loading" | "ready" | "fallback">("idle");
  const [questionError, setQuestionError] = useState("");
  const [questionPrompt, setQuestionPrompt] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_QUESTION_PROMPT;
    return window.localStorage.getItem("poker-persona-question-prompt") || DEFAULT_QUESTION_PROMPT;
  });
  const [openAiApiKey, setOpenAiApiKey] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.sessionStorage.getItem("poker-persona-openai-key") || "";
  });

  const answeredAllQuestions = useMemo(() => {
    return Boolean(activeQuestions.length && selectedAnswers.filter(Boolean).length === activeQuestions.length);
  }, [activeQuestions.length, selectedAnswers]);

  function startGame() {
    setReuseScenario(false);
    setPage("select");
  }

  function openImageTest() {
    setPage("imageTest");
  }

  function chooseCharacter(nextCharacter: Character) {
    const nextScenario = reuseScenario && scenario ? scenario : randomItem(scenarios);
    setCharacter(nextCharacter);
    setScenario(nextScenario);
    setSelectedAnswers([]);
    setResult(null);
    setReuseScenario(false);
    loadQuestionBank(nextCharacter, nextScenario, questionPrompt);
    setPage("scenario");
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
    setResult(generateDecision(character, scenario, selectedAnswers));
    setPage("result");
  }

  function playAnotherHand() {
    if (!character) {
      setPage("select");
      return;
    }
    const nextScenario = randomItem(scenarios);
    setScenario(nextScenario);
    setSelectedAnswers([]);
    setResult(null);
    loadQuestionBank(character, nextScenario, questionPrompt);
    setPage("scenario");
  }

  function changeCharacterSameHand() {
    setReuseScenario(Boolean(scenario));
    setSelectedAnswers([]);
    setResult(null);
    setPage("select");
  }

  function goHome() {
    setPage("home");
    setCharacter(null);
    setScenario(null);
    setSelectedAnswers([]);
    setResult(null);
    setReuseScenario(false);
    setActiveQuestions([]);
    setQuestionStatus("idle");
    setQuestionError("");
  }

  async function loadQuestionBank(nextCharacter: Character, nextScenario: PokerScenario, prompt: string) {
    setQuestionStatus("loading");
    setQuestionError("");
    setActiveQuestions([]);
    setSelectedAnswers([]);

    try {
      const questions = await generateQuestions(nextCharacter, nextScenario, prompt, openAiApiKey);
      setActiveQuestions(questions);
      setQuestionStatus("ready");
    } catch (error) {
      setActiveQuestions(nextCharacter.questions);
      setQuestionStatus("fallback");
      setQuestionError(`${error instanceof Error ? error.message : "题库生成失败"}；已临时使用本地 fallback 题库。`);
    }
  }

  function updateQuestionPrompt(nextPrompt: string) {
    setQuestionPrompt(nextPrompt);
    window.localStorage.setItem("poker-persona-question-prompt", nextPrompt);
  }

  function updateOpenAiApiKey(nextKey: string) {
    setOpenAiApiKey(nextKey);
    if (nextKey.trim()) window.sessionStorage.setItem("poker-persona-openai-key", nextKey.trim());
    else window.sessionStorage.removeItem("poker-persona-openai-key");
  }

  return (
    <div className="min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="casino-bg min-h-screen">
        <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-3 border-b border-amber-500/20 pb-4">
            <button onClick={goHome} className="flex items-center gap-3 text-left">
              <span className="grid h-11 w-11 place-items-center rounded-lg border border-amber-400/60 bg-zinc-950 text-xl text-amber-200 shadow-gold">♠</span>
              <span>
                <span className="block text-sm font-black tracking-[0.24em] text-amber-500">POKER PERSONA</span>
                <span className="block text-lg font-black text-amber-100">牌桌人格</span>
              </span>
            </button>
            <div className="hidden rounded-full border border-amber-500/30 bg-zinc-950/70 px-4 py-2 text-sm font-bold text-amber-100 sm:block">
              黑金战役局
            </div>
          </header>

          <div className="flex flex-1 items-center py-8">
            {page === "home" && <HomePage apiKey={openAiApiKey} onApiKeyChange={updateOpenAiApiKey} onStart={startGame} onImageTest={openImageTest} />}
            {page === "select" && (
              <CharacterSelectPage
                onSelect={chooseCharacter}
                onRandom={chooseRandomCharacter}
                reuseScenarioTitle={reuseScenario && scenario ? scenario.title : ""}
              />
            )}
            {page === "scenario" && character && scenario && (
              <ScenarioPage
                character={character}
                scenario={scenario}
                selectedAnswers={selectedAnswers}
                questions={activeQuestions}
                questionPrompt={questionPrompt}
                apiKey={openAiApiKey}
                questionStatus={questionStatus}
                questionError={questionError}
                answeredAllQuestions={answeredAllQuestions}
                onAnswer={answerQuestion}
                onReveal={revealDecision}
                onPromptChange={updateQuestionPrompt}
                onApiKeyChange={updateOpenAiApiKey}
                onRegenerateQuestions={() => loadQuestionBank(character, scenario, questionPrompt)}
                onChangeCharacter={changeCharacterSameHand}
              />
            )}
            {page === "result" && character && scenario && result && (
              <ResultCard
                character={character}
                scenario={scenario}
                result={result}
                onAgain={playAnotherHand}
                onChangeCharacter={changeCharacterSameHand}
                onHome={goHome}
              />
            )}
            {page === "imageTest" && <ImageTestPage onBack={goHome} />}
          </div>

          <footer className="border-t border-amber-500/20 pt-4 text-center text-xs text-zinc-500">
            本游戏仅用于娱乐与策略思维训练，不构成赌博建议。
          </footer>
        </main>
      </div>
    </div>
  );
}

function HomePage({
  apiKey,
  onApiKeyChange,
  onStart,
  onImageTest,
}: {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  onStart: () => void;
  onImageTest: () => void;
}) {
  const featuredCharacters = characters.filter((item) => item.avatarImage).slice(0, 4);

  return (
    <section className="grid w-full items-center gap-8 lg:grid-cols-[1fr_1fr]">
      <div className="max-w-3xl">
        <p className="text-sm font-black uppercase tracking-[0.32em] text-amber-500">Medieval Poker Decision Game</p>
        <h1 className="mt-4 text-4xl font-black leading-tight text-amber-100 sm:text-6xl lg:text-7xl">
          <span className="block">《牌桌人格：</span>
          <span className="block">一手入魂》</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-300">
          选择人格，让角色替你做出牌桌决策。这里没有真钱下注，也不是严肃求解器，只有胆量、读牌、筹码和一点牌桌戏剧性。
        </p>
        <div className="mt-6 max-w-2xl">
          <ApiKeyPanel apiKey={apiKey} onApiKeyChange={onApiKeyChange} compact />
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={onStart}
            className="rounded-xl border border-amber-200 bg-amber-400 px-7 py-4 text-lg font-black text-zinc-950 shadow-gold transition hover:scale-105 hover:bg-amber-300"
          >
            开始游戏
          </button>
          <button
            onClick={onImageTest}
            className="rounded-xl border border-amber-500/60 bg-zinc-950/80 px-7 py-4 text-lg font-black text-amber-100 transition hover:scale-105 hover:bg-amber-500/15"
          >
            测试识别
          </button>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-xl rounded-3xl border border-amber-500/50 bg-zinc-950/80 p-5 shadow-2xl">
        <div className="absolute inset-4 rounded-[1.4rem] border border-amber-400/20" />
        <div className="relative z-10">
          <p className="text-sm font-bold text-amber-400">PBTI Characters</p>
          <h2 className="mt-2 text-3xl font-black text-amber-100">四种牌桌人格</h2>
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
    </section>
  );
}

function CharacterSelectPage({
  onSelect,
  onRandom,
  reuseScenarioTitle,
}: {
  onSelect: (character: Character) => void;
  onRandom: () => void;
  reuseScenarioTitle: string;
}) {
  return (
    <section className="w-full">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.3em] text-amber-500">Choose Persona</p>
          <h1 className="mt-2 text-4xl font-black text-amber-100">选择你的牌桌人格</h1>
          {reuseScenarioTitle && <p className="mt-2 text-zinc-400">当前将用新角色重打：{reuseScenarioTitle}</p>}
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

function ScenarioPage({
  character,
  scenario,
  selectedAnswers,
  questions,
  questionPrompt,
  apiKey,
  questionStatus,
  questionError,
  answeredAllQuestions,
  onAnswer,
  onReveal,
  onPromptChange,
  onApiKeyChange,
  onRegenerateQuestions,
  onChangeCharacter,
}: {
  character: Character;
  scenario: PokerScenario;
  selectedAnswers: Answer[];
  questions: Question[];
  questionPrompt: string;
  apiKey: string;
  questionStatus: "idle" | "loading" | "ready" | "fallback";
  questionError: string;
  answeredAllQuestions: boolean;
  onAnswer: (questionIndex: number, answer: Answer) => void;
  onReveal: () => void;
  onPromptChange: (prompt: string) => void;
  onApiKeyChange: (key: string) => void;
  onRegenerateQuestions: () => void;
  onChangeCharacter: () => void;
}) {
  const isLoading = questionStatus === "loading";

  return (
    <section className="grid w-full gap-5 xl:grid-cols-[0.82fr_1.18fr]">
      <aside className="rounded-3xl border border-amber-500/45 bg-zinc-950/88 p-5 shadow-2xl">
        <CharacterAvatar character={character} size="large" />
        <p className="mt-5 text-sm font-bold text-amber-400">{character.archetype}</p>
        <h2 className="mt-1 text-3xl font-black text-amber-100">{character.name}</h2>
        <p className="mt-3 leading-7 text-zinc-300">{character.description}</p>
        <button
          onClick={onChangeCharacter}
          className="mt-6 w-full rounded-xl border border-zinc-700 px-4 py-3 font-bold text-zinc-200 transition hover:border-amber-500 hover:bg-amber-500/10 hover:text-amber-100"
        >
          换个角色重打这手
        </button>
      </aside>

      <div className="space-y-5">
        <PokerTable scenario={scenario} />
        <ApiKeyPanel apiKey={apiKey} onApiKeyChange={onApiKeyChange} />
        <PromptPanel prompt={questionPrompt} status={questionStatus} onPromptChange={onPromptChange} onRegenerate={onRegenerateQuestions} />
        <QuestionPanel
          character={character}
          questions={questions}
          selectedAnswers={selectedAnswers}
          isLoading={isLoading}
          error={questionError}
          onAnswer={onAnswer}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/35 bg-zinc-950/80 p-4">
          <p className="text-sm text-zinc-400">
            已回答 {selectedAnswers.filter(Boolean).length}/{questions.length || 2}
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
    </section>
  );
}

function PromptPanel({
  prompt,
  status,
  onPromptChange,
  onRegenerate,
}: {
  prompt: string;
  status: "idle" | "loading" | "ready" | "fallback";
  onPromptChange: (prompt: string) => void;
  onRegenerate: () => void;
}) {
  const statusText = status === "ready" ? "OpenAI 题库" : status === "fallback" ? "Fallback 题库" : status === "loading" ? "生成中" : "待生成";

  return (
    <section className="rounded-3xl border border-amber-500/35 bg-zinc-950/86 p-5 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-amber-400">题库 Prompt</p>
          <h2 className="text-xl font-black text-amber-100">{statusText}</h2>
        </div>
        <button
          onClick={onRegenerate}
          disabled={status === "loading"}
          className="rounded-xl border border-amber-400/70 px-4 py-2 font-bold text-amber-100 transition enabled:hover:bg-amber-400 enabled:hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-500"
        >
          重新生成题库
        </button>
      </div>
      <textarea
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        className="mt-4 min-h-40 w-full resize-y rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm leading-6 text-zinc-200 outline-none transition focus:border-amber-400"
      />
    </section>
  );
}

function ApiKeyPanel({
  apiKey,
  compact,
  onApiKeyChange,
}: {
  apiKey: string;
  compact?: boolean;
  onApiKeyChange: (key: string) => void;
}) {
  return (
    <section className={`rounded-3xl border border-amber-500/35 bg-zinc-950/86 ${compact ? "p-4" : "p-5"} shadow-2xl`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-amber-400">OpenAI 题库来源</p>
          <h2 className="text-xl font-black text-amber-100">{apiKey ? "浏览器兜底已填入" : "服务端环境变量优先"}</h2>
        </div>
        {apiKey && (
          <button
            onClick={() => onApiKeyChange("")}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 transition hover:border-red-400 hover:bg-red-500/10 hover:text-red-100"
          >
            清空
          </button>
        )}
      </div>
      <input
        value={apiKey}
        onChange={(event) => onApiKeyChange(event.target.value)}
        type="password"
        autoComplete="off"
        spellCheck={false}
        placeholder="可选：没有服务端 API 时填入个人 sk-..."
        className="mt-4 w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-200 outline-none transition focus:border-amber-400"
      />
      <p className="mt-3 text-xs leading-5 text-zinc-500">
        默认请求 /api/generate-questions，由 Vercel 或本地服务端读取 OPENAI_API_KEY。这里的输入只作为静态部署或服务端不可用时的兜底，且只保存在当前浏览器会话中。
      </p>
    </section>
  );
}

function ImageTestPage({ onBack }: { onBack: () => void }) {
  const [imagePreview, setImagePreview] = useState("");
  const [imageName, setImageName] = useState("");
  const [imageSize, setImageSize] = useState("");
  const [imageDimensions, setImageDimensions] = useState("");

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const nextUrl = URL.createObjectURL(file);
    setImagePreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return nextUrl;
    });
    setImageName(file.name);
    setImageSize(`${(file.size / 1024 / 1024).toFixed(2)} MB`);

    const image = new Image();
    image.onload = () => {
      setImageDimensions(`${image.naturalWidth} x ${image.naturalHeight}`);
    };
    image.src = nextUrl;
  }

  return (
    <section className="grid w-full gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-3xl border border-amber-500/45 bg-zinc-950/88 p-5 shadow-2xl">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-amber-500">Image Lab</p>
        <h1 className="mt-2 text-4xl font-black text-amber-100">图片读取测试</h1>
        <p className="mt-3 leading-7 text-zinc-300">
          这里先读取牌局图片和基础信息，后续可以接入视觉模型，把图片解析成手牌、公共牌、位置、底池和行动。
        </p>

        <label className="mt-6 block cursor-pointer rounded-2xl border border-dashed border-amber-500/50 bg-amber-400/10 p-5 text-center transition hover:border-amber-300 hover:bg-amber-400/15">
          <input type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
          <span className="block text-lg font-black text-amber-100">选择牌局图片</span>
          <span className="mt-1 block text-sm text-zinc-400">PNG / JPG / WebP</span>
        </label>

        <div className="mt-5 grid gap-3 text-sm">
          <InfoRow label="文件名" value={imageName || "未选择"} />
          <InfoRow label="文件大小" value={imageSize || "-"} />
          <InfoRow label="图片尺寸" value={imageDimensions || "-"} />
        </div>

        <button
          onClick={onBack}
          className="mt-6 rounded-xl border border-zinc-700 px-5 py-3 font-bold text-zinc-200 transition hover:border-amber-500 hover:bg-amber-500/10 hover:text-amber-100"
        >
          回首页
        </button>
      </div>

      <div className="rounded-3xl border border-amber-500/45 bg-zinc-950/88 p-5 shadow-2xl">
        <div className="grid min-h-[360px] place-items-center overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80">
          {imagePreview ? (
            <img src={imagePreview} alt="上传的牌局" className="max-h-[620px] w-full object-contain" />
          ) : (
            <div className="px-6 text-center">
              <p className="text-5xl text-amber-200">♠</p>
              <p className="mt-3 font-black text-amber-100">等待图片</p>
            </div>
          )}
        </div>

        <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
          <h2 className="font-black text-amber-100">牌局情况</h2>
          <div className="mt-3 grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
            <InfoRow label="Hero 手牌" value="待识别" />
            <InfoRow label="公共牌" value="待识别" />
            <InfoRow label="位置" value="待识别" />
            <InfoRow label="底池" value="待识别" />
            <InfoRow label="对手行动" value="待识别" />
            <InfoRow label="街道" value="待识别" />
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 font-bold text-zinc-100">{value}</p>
    </div>
  );
}

export default App;
