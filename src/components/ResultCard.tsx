import { useMemo, type ReactNode } from "react";
import type { Answer, Character, DecisionResult, Question } from "../types";
import { ActionChip, actionLabels } from "./ActionChip";

type ResultCardProps = {
  character: Character;
  questions: Question[];
  selectedAnswers: Answer[];
  result: DecisionResult;
  onAgain: () => void;
  onChangeCharacter: () => void;
  onHome: () => void;
};

const bars = [
  ["Check", "checkScore", "bg-emerald-500"],
  ["Call", "callScore", "bg-blue-500"],
  ["Raise", "raiseScore", "bg-red-500"],
  ["Fold", "foldScore", "bg-purple-500"],
] as const;

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

function ResultSection({ title, children, tone = "neutral" }: { title: string; children: ReactNode; tone?: "neutral" | "amber" | "red" }) {
  const toneClass =
    tone === "amber"
      ? "border-amber-500/35 bg-amber-400/5"
      : tone === "red"
        ? "border-red-500/30 bg-red-500/5"
        : "border-zinc-800 bg-zinc-950/70";

  return (
    <div className={`rounded-2xl border ${toneClass} p-4`}>
      <h3 className="text-xs font-black uppercase tracking-[0.22em] text-amber-400">{title}</h3>
      <div className="mt-2 text-sm leading-6 text-zinc-300">{children}</div>
    </div>
  );
}

export function ResultCard({ character, questions, selectedAnswers, result, onAgain, onChangeCharacter, onHome }: ResultCardProps) {
  const maxScore = Math.max(result.scoreBreakdown.checkScore, result.scoreBreakdown.callScore, result.scoreBreakdown.raiseScore, result.scoreBreakdown.foldScore, 1);
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
    <section className="w-full rounded-3xl border border-amber-500/50 bg-zinc-950/90 p-5 shadow-2xl">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <div className="grid place-items-center gap-4 rounded-3xl border border-amber-500/35 bg-zinc-900/70 p-5 text-center">
            <ActionChip action={result.action} />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-500">最终行动</p>
              <h2 className="mt-2 text-4xl font-black text-amber-100">{actionLabels[result.action]}</h2>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/35 bg-amber-400/10 p-4 text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-500">下注尺度</p>
            <p className="mt-2 text-2xl font-black text-amber-100">{result.sizing}</p>
          </div>

          {isDestiny && (
            <div
              className={`space-y-3 rounded-2xl border p-4 ${
                isExplosiveDestiny
                  ? "border-lime-300 bg-lime-300/15 shadow-[0_0_28px_rgba(190,242,100,0.22)]"
                  : "border-lime-500/35 bg-lime-500/5"
              }`}
            >
              <h3 className="text-xs font-black uppercase tracking-[0.22em] text-lime-300">Destiny System</h3>
              {typeof destinyRoll === "number" && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-zinc-400">命运掷骰</span>
                  <span className={`font-black text-lime-200 ${isExplosiveDestiny ? "text-5xl" : "text-3xl"}`}>{destinyRoll}</span>
                </div>
              )}
              {destinyStatus && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-zinc-400">命运状态</span>
                  <span className={`font-black ${isExplosiveDestiny ? "text-xl text-lime-100" : "text-lime-200"}`}>{destinyStatus}</span>
                </div>
              )}
              {specialEventName && (
                <div className={`rounded-xl border p-3 ${isExplosiveDestiny ? "border-lime-200/60 bg-lime-300/10" : "border-lime-400/25 bg-zinc-950/60"}`}>
                  <p className="text-xs text-zinc-500">特殊事件名称</p>
                  <p className="mt-1 font-black text-lime-100">{specialEventName}</p>
                </div>
              )}
              {destinyEffect && <p className="text-sm leading-6 text-lime-100/80">天命效果：{destinyEffect}</p>}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-amber-500/35 bg-amber-400/5 p-5">
            <p className="text-sm font-black text-amber-400">{character.name}</p>
            <blockquote className="mt-2 border-l-4 border-amber-400 pl-4 text-xl font-black leading-8 text-amber-100">
              “{result.voiceLine}”
            </blockquote>
          </div>

          <ResultSection title="牌桌吐槽" tone="amber">
            {roast}
          </ResultSection>

          {result.easterEgg && (
            <div className="rounded-2xl border border-purple-500/40 bg-purple-500/10 p-4 text-sm leading-6 text-purple-100">
              你触发了隐藏彩蛋。今天宇宙让你弃牌，这不是严肃策略，只是小游戏的 5% 命运噪声。
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <ResultSection title="决策理由" tone="amber">
              {result.reasoning}
            </ResultSection>
            <ResultSection title="风险提示" tone="red">
              {result.riskWarning}
            </ResultSection>
            <ResultSection title="人格偏差">
              {result.personalityBias}
            </ResultSection>
            <ResultSection title="常见死法">
              {deathPattern}
            </ResultSection>
          </div>

          {questions.length > 0 && selectedAnswers.filter(Boolean).length > 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-amber-400">你的回答与分数影响</h3>
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
            </div>
          )}

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <h3 className="mb-3 text-sm font-bold tracking-[0.2em] text-amber-400">分数 breakdown</h3>
            <div className="space-y-3">
              {bars.map(([action, key, color]) => {
                const score = result.scoreBreakdown[key];
                const isWinner = score >= maxScore;
                return (
                  <div key={key}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className={isWinner ? "font-bold text-amber-100" : "text-zinc-400"}>{actionLabels[action]}</span>
                      <span className={isWinner ? "font-bold text-amber-200" : "text-zinc-500"}>{score.toFixed(1)}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-700 ${isWinner ? "shadow-[0_0_8px]" : "opacity-70"}`}
                        style={{ width: `${(score / maxScore) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={onAgain} className="rounded-xl bg-amber-400 px-5 py-3 font-black text-zinc-950 transition hover:scale-105 hover:bg-amber-300">
              {againLabel}
            </button>
            <button onClick={onChangeCharacter} className="rounded-xl border border-amber-500/60 px-5 py-3 font-bold text-amber-100 transition hover:bg-amber-500/15">
              随机人格
            </button>
            <button onClick={onHome} className="rounded-xl border border-zinc-700 px-5 py-3 font-bold text-zinc-200 transition hover:bg-zinc-800">
              回首页
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
