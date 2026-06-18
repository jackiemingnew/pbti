import { useMemo, type ReactNode } from "react";
import { getPersonaKey, pickTableRoast, randomCopy } from "../data/gameCopy";
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
  onSummary: () => void;
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

const againButtonLabels = {
  fa_ge: "再控一桌",
  tom_dwan: "再偷一只鸡",
  tan_xuan: "再买一集剧情",
  wukong: "再渡一劫",
  default: "再来一轮",
} as const;

function activeModifiers(modifiers: Record<string, number | undefined>) {
  return modifierKeys
    .map((k) => ({ key: k, label: modifierLabels[k], value: modifiers[k] ?? 0 }))
    .filter((m) => m.value !== 0);
}

function pickDeathPattern(character: Character, fallback: string) {
  return randomCopy(character.deathPatterns?.length ? character.deathPatterns : [fallback]);
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

export function ResultCard({
  character,
  questions,
  selectedAnswers,
  result,
  onAgain,
  onChangeCharacter,
  onHome,
  onSummary,
  currentFeedback,
  onFeedback,
}: ResultCardProps) {
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
  const roast = useMemo(() => pickTableRoast(result.action), [result]);
  const deathPattern = useMemo(() => pickDeathPattern(character, result.commonDeath), [character, result]);
  const againLabel = againButtonLabels[getPersonaKey(character)];

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
          </div>

          <blockquote className="mt-5 border-l-4 border-amber-400 pl-4 text-lg font-black leading-7 text-amber-100 sm:text-xl sm:leading-8">
            “{result.voiceLine}”
          </blockquote>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          <ResultSection title="牌桌吐槽" tone="amber" compact>
            {roast}
          </ResultSection>

          {result.opponentRead && (
            <ResultSection title="对手读法" tone="amber" compact>
              <p className="font-black text-amber-100">
                {result.opponentRead.name}｜{result.opponentRead.description}
              </p>
              <p className="mt-2 text-zinc-300">策略影响：{result.opponentRead.strategyHint}</p>
              <p className="mt-2 text-zinc-400">本次偏差：{result.opponentRead.resultBias}</p>
            </ResultSection>
          )}

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
            <h3 className="text-sm font-black tracking-[0.16em] text-amber-400">{currentFeedback ? "反馈已记录" : "本手反馈"}</h3>
            <p className="mt-1 text-sm text-zinc-400">
              {currentFeedback ? `本手已标记为${currentFeedback === "win" ? "赢了" : "输了"}，已进入你的牌桌画像统计。` : "简单记一笔，之后会进入你的牌桌画像统计。"}
            </p>
          </div>
          {currentFeedback ? (
            <button
              onClick={onSummary}
              className="w-full rounded-xl border border-amber-400/60 bg-amber-400/10 px-4 py-2 text-sm font-black text-amber-100 transition hover:bg-amber-300 hover:text-zinc-950 sm:w-auto"
            >
              查看结果统计
            </button>
          ) : (
            <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
              <button
                onClick={() => onFeedback("win")}
                className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-black text-emerald-100 transition hover:bg-emerald-400 hover:text-zinc-950"
              >
                赢了
              </button>
              <button
                onClick={() => onFeedback("loss")}
                className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-black text-red-100 transition hover:bg-red-400 hover:text-zinc-950"
              >
                输了
              </button>
            </div>
          )}
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
