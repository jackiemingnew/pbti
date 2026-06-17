import { useMemo, type ReactNode } from "react";
import type { Answer, Character, DecisionFeedback, DecisionResult, Question } from "../types";
import { ActionChip, actionLabels } from "./ActionChip";
import { CharacterAvatar } from "./CharacterCard";

type ResultCardProps = {
  character: Character;
  questions: Question[];
  selectedAnswers: Answer[];
  result: DecisionResult;
  onAgain: () => void;
  onChangeCharacter: () => void;
  onHome: () => void;
  currentFeedback?: DecisionFeedback;
  onFeedback: (feedback: DecisionFeedback) => void;
};

const modifierLabels: Record<string, string> = {
  handStrength: "牌力",
  drawPotential: "听牌",
  positionAdvantage: "位置",
  opponentAggression: "对手攻",
  foldEquity: "弃牌率",
  potOdds: "赔率",
  uncertainty: "不确定",
  showdownValue: "摊牌值",
  trapPotential: "陷阱",
  chicken: "鸡",
  money: "钱",
  skill: "术",
  destinySeed: "命运",
  raiseScoreBonus: "加注+",
  callScoreBonus: "跟注+",
  checkScoreBonus: "过牌+",
  foldScoreBonus: "弃牌+",
};

const modifierKeys = Object.keys(modifierLabels);

type PersonaKey = "fa_ge" | "tom_dwan" | "tan_xuan" | "wukong" | "default";

const roastPool: Record<PersonaKey, Partial<Record<DecisionResult["action"], string[]>>> = {
  fa_ge: {
    Fold: ["发哥不是怂，是这桌暂时不配他出镜。", "他把牌一盖，像是在给对手留体面。"],
    Check: ["真正的控场者，连过牌都像在收管理费。", "这不是过牌，这是让牌桌先自我介绍。"],
    Call: ["他不是跟注，他是在审核对手故事有没有续集。", "这口跟注很轻，但对手心里已经开始重了。"],
    Raise: ["这不是加注，这是气场收费。", "筹码往前一推，像在说：这条街我包了。"],
  },
  tom_dwan: {
    Fold: ["小说家今天断更，读者先散场。", "他居然弃了，这桌空气牌暂时安全。"],
    Check: ["他一过牌，像是在给下一章憋大招。", "别被安静骗了，小说家可能正在埋伏笔。"],
    Call: ["他想看看对手是不是也会写小说。", "这一跟不是相信牌，是相信后面还有剧情反转。"],
    Raise: ["他没牌的时候，创作欲最强。", "这不是诈唬，这是三条街文学创作。"],
  },
  tan_xuan: {
    Fold: ["老板今天没续费，导演组很失望。", "老板一弃牌，说明这集真的不值票价。"],
    Check: ["老板先试看一集，暂时不充值。", "过牌不是控池，是老板等广告跳过。"],
    Call: ["老板不是在跟注，老板是在买票看大结局。", "这一跟注，主打一个来都来了。"],
    Raise: ["老板加注不是因为懂，是因为这集需要高潮。", "钞能力上线，牌理先靠边站。"],
  },
  wukong: {
    Fold: ["紧箍咒响了，猴哥今天先不闹天宫。", "他不是弃牌，是把这劫跳过去了。"],
    Check: ["天庭信号不好，先原地待机。", "悟空一过牌，像是等云加载出来。"],
    Call: ["随机数点头了，猴哥买票进下一难。", "这跟注不是赔率，是天命说还能看。"],
    Raise: ["三界之内你算牌，三界之外他改命。", "筹码不是下注，是筋斗云的尾气。"],
  },
  default: {
    Fold: ["这手不入戏，下一把再审判。"],
    Check: ["先让牌桌说两句。"],
    Call: ["继续看剧情，但别忘了票价。"],
    Raise: ["冲动已经穿上理论外套。"],
  },
};

const againButtonLabels: Record<PersonaKey, string> = {
  fa_ge: "再控一桌",
  tom_dwan: "再偷一只鸡",
  tan_xuan: "再买一集剧情",
  wukong: "再渡一劫",
  default: "再来一轮",
};

function activeModifiers(modifiers: Record<string, number | undefined>) {
  return modifierKeys
    .map((k) => ({ key: k, label: modifierLabels[k], value: modifiers[k] ?? 0 }))
    .filter((m) => m.value !== 0);
}

function randomChoice(items: string[]) {
  return items[Math.floor(Math.random() * items.length)] || "";
}

function personaKey(character: Character): PersonaKey {
  if (character.id === "king-chow" || character.id === "fa_ge") return "fa_ge";
  if (character.id === "bluff-assassin" || character.id === "tom_dwan") return "tom_dwan";
  if (character.id === "boss-whale" || character.id === "tan_xuan") return "tan_xuan";
  if (character.id === "destiny-fool" || character.id === "wukong") return "wukong";
  return "default";
}

function pickRoast(character: Character, action: DecisionResult["action"]) {
  const key = personaKey(character);
  return randomChoice(roastPool[key][action] || roastPool.default[action] || []);
}

function pickDeathPattern(character: Character, fallback: string) {
  return randomChoice(character.deathPatterns?.length ? character.deathPatterns : [fallback]);
}

function ResultSection({ title, children, tone = "neutral", compact = false }: { title: string; children: ReactNode; tone?: "neutral" | "amber" | "red"; compact?: boolean }) {
  const toneClass =
    tone === "amber"
      ? "border-amber-500/35 bg-amber-400/5"
      : tone === "red"
        ? "border-red-500/30 bg-red-500/5"
        : "border-zinc-800 bg-zinc-950/70";

  return (
    <div className={`rounded-2xl border ${toneClass} ${compact ? "p-3" : "p-4"}`}>
      <h3 className="text-xs font-black uppercase tracking-[0.22em] text-amber-400">{title}</h3>
      <div className="mt-2 text-sm leading-6 text-zinc-300">{children}</div>
    </div>
  );
}

function DetailDisclosure({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-black tracking-[0.12em] text-amber-300">
        <span>{title}</span>
        <span className="text-lg leading-none text-zinc-500 transition group-open:rotate-45 group-open:text-amber-300">+</span>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

export function ResultCard({ character, questions, selectedAnswers, result, onAgain, onChangeCharacter, onHome, currentFeedback, onFeedback }: ResultCardProps) {
  const passScore = Math.max(result.scoreBreakdown.checkScore, result.scoreBreakdown.foldScore);
  const scoreBars = [
    { label: "过牌/弃牌", score: passScore, color: "bg-emerald-500", isWinner: result.action === "Check" || result.action === "Fold" },
    { label: actionLabels.Call, score: result.scoreBreakdown.callScore, color: "bg-blue-500", isWinner: result.action === "Call" },
    { label: actionLabels.Raise, score: result.scoreBreakdown.raiseScore, color: "bg-red-500", isWinner: result.action === "Raise" },
  ];
  const maxScore = Math.max(...scoreBars.map((bar) => bar.score), 1);
  const destiny = result.destiny;
  const isDestiny = Boolean(destiny) || character.decisionMode === "destiny" || typeof result.destinyRoll === "number";
  const destinyRoll = destiny?.roll ?? result.destinyRoll;
  const destinyStatus = destiny?.status ?? result.destinyStatus;
  const destinyEffect = destiny?.effect ?? result.destinyEffect;
  const specialEventName = destiny?.specialEventName ?? result.specialEventName;
  const isExplosiveDestiny = destinyStatus === "天命爆发" || destinyStatus === "三界之外";
  const roast = useMemo(() => pickRoast(character, result.action), [character, result]);
  const deathPattern = useMemo(() => pickDeathPattern(character, result.commonDeath), [character, result]);
  const againLabel = againButtonLabels[personaKey(character)];

  return (
    <section className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-5">
      <div className="overflow-hidden rounded-3xl border border-amber-500/45 bg-zinc-950/92 shadow-2xl">
        <div className="border-b border-amber-500/20 bg-amber-400/5 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <CharacterAvatar character={character} size="small" />
            <div className="min-w-0">
              <p className="truncate text-lg font-black text-amber-100">{character.name}</p>
              <p className="truncate text-sm text-amber-400">{character.archetype}</p>
            </div>
          </div>

          <div className="mt-5 grid place-items-center gap-3 text-center">
            <ActionChip action={result.action} />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-500">最终行动</p>
              <h2 className="mt-1 text-4xl font-black text-amber-100 sm:text-5xl">{actionLabels[result.action]}</h2>
            </div>
            <div className="rounded-xl border border-amber-500/35 bg-amber-400/10 px-4 py-2">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-500">下注尺度</p>
              <p className="mt-1 text-xl font-black text-amber-100">{result.sizing}</p>
            </div>
          </div>

          <blockquote className="mt-5 border-l-4 border-amber-400 pl-4 text-lg font-black leading-7 text-amber-100 sm:text-xl sm:leading-8">
            “{result.voiceLine}”
          </blockquote>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          <ResultSection title="牌桌吐槽" tone="amber" compact>
            {roast}
          </ResultSection>

          <ResultSection title="常见死法" compact>
            {deathPattern}
          </ResultSection>
        </div>
      </div>

      {isDestiny && (
        <div
          className={`rounded-2xl border p-4 ${
            isExplosiveDestiny
              ? "border-lime-300 bg-lime-300/15 shadow-[0_0_28px_rgba(190,242,100,0.22)]"
              : "border-lime-500/35 bg-lime-500/5"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-black uppercase tracking-[0.22em] text-lime-300">Destiny System</h3>
            {typeof destinyRoll === "number" && <span className={`font-black text-lime-200 ${isExplosiveDestiny ? "text-4xl" : "text-2xl"}`}>{destinyRoll}</span>}
          </div>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {destinyStatus && (
              <p className="rounded-xl border border-lime-400/20 bg-zinc-950/50 p-3 text-lime-100">
                <span className="text-zinc-500">命运状态：</span>
                <span className="font-black">{destinyStatus}</span>
              </p>
            )}
            {specialEventName && (
              <p className="rounded-xl border border-lime-400/20 bg-zinc-950/50 p-3 text-lime-100">
                <span className="text-zinc-500">特殊事件：</span>
                <span className="font-black">{specialEventName}</span>
              </p>
            )}
          </div>
          {destinyEffect && <p className="mt-3 text-sm leading-6 text-lime-100/80">天命效果：{destinyEffect}</p>}
        </div>
      )}

      {result.easterEgg && (
        <div className="rounded-2xl border border-purple-500/40 bg-purple-500/10 p-4 text-sm leading-6 text-purple-100">
          你触发了隐藏彩蛋。今天宇宙让你弃牌，这不是严肃策略，只是小游戏的 5% 命运噪声。
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <ResultSection title="别上头" tone="red">
          <p>{result.riskWarning}</p>
          <p className="mt-2 text-zinc-400">{result.personalityBias}</p>
        </ResultSection>
        <ResultSection title="决策理由" tone="amber">
          {result.reasoning}
        </ResultSection>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <h3 className="mb-3 text-sm font-black tracking-[0.16em] text-amber-400">分数 breakdown</h3>
        <div className="space-y-3">
          {scoreBars.map((bar) => {
            const isWinner = bar.isWinner || bar.score >= maxScore;
            return (
              <div key={bar.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className={isWinner ? "font-bold text-amber-100" : "text-zinc-400"}>{bar.label}</span>
                  <span className={isWinner ? "font-bold text-amber-200" : "text-zinc-500"}>{bar.score.toFixed(1)}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className={`h-full ${bar.color} rounded-full transition-all duration-700 ${isWinner ? "shadow-[0_0_8px]" : "opacity-70"}`}
                    style={{ width: `${(bar.score / maxScore) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {questions.length > 0 && selectedAnswers.filter(Boolean).length > 0 && (
        <DetailDisclosure title="查看本轮依据">
          <div className="space-y-3">
            {questions.map((q, qi) => {
              const answer = selectedAnswers[qi];
              const mods = answer ? activeModifiers(answer.modifiers as Record<string, number>) : [];
              return (
                <div key={q.id} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                  <p className="text-sm leading-5 text-zinc-300">{q.text}</p>
                  {answer && (
                    <>
                      <p className="mt-1.5 text-sm font-bold text-amber-200">你选了：{answer.label}</p>
                      {mods.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {mods.map((m) => (
                            <span
                              key={m.key}
                              className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${
                                m.value > 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
                              }`}
                            >
                              {m.label} {m.value > 0 ? `+${m.value}` : m.value}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </DetailDisclosure>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black tracking-[0.16em] text-amber-400">本手反馈</h3>
            <p className="mt-1 text-sm text-zinc-400">简单记一笔，之后会进入你的牌桌画像统计。</p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
            <button
              onClick={() => onFeedback("win")}
              className={`rounded-xl border px-4 py-2 text-sm font-black transition ${
                currentFeedback === "win"
                  ? "border-emerald-300 bg-emerald-300 text-zinc-950"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-400 hover:text-zinc-950"
              }`}
            >
              赢了
            </button>
            <button
              onClick={() => onFeedback("loss")}
              className={`rounded-xl border px-4 py-2 text-sm font-black transition ${
                currentFeedback === "loss"
                  ? "border-red-300 bg-red-300 text-zinc-950"
                  : "border-red-500/40 bg-red-500/10 text-red-100 hover:bg-red-400 hover:text-zinc-950"
              }`}
            >
              输了
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <button onClick={onAgain} className="rounded-xl bg-amber-400 px-5 py-3 font-black text-zinc-950 transition hover:scale-[1.02] hover:bg-amber-300">
          {againLabel}
        </button>
        <button onClick={onChangeCharacter} className="rounded-xl border border-amber-500/60 px-5 py-3 font-bold text-amber-100 transition hover:bg-amber-500/15">
          随机人格
        </button>
        <button onClick={onHome} className="rounded-xl border border-zinc-700 px-5 py-3 font-bold text-zinc-200 transition hover:bg-zinc-800">
          回首页
        </button>
      </div>
    </section>
  );
}
