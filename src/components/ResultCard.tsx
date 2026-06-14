import type { Answer, Character, DecisionResult, Question } from "../types";
import { ActionChip } from "./ActionChip";

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
  raiseScoreBonus: "加注+",
  callScoreBonus: "跟注+",
  checkScoreBonus: "过牌+",
};

const modifierKeys = Object.keys(modifierLabels);

function activeModifiers(modifiers: Record<string, number | undefined>) {
  return modifierKeys
    .map((k) => ({ key: k, label: modifierLabels[k], value: modifiers[k] ?? 0 }))
    .filter((m) => m.value !== 0);
}

export function ResultCard({ character, questions, selectedAnswers, result, onAgain, onChangeCharacter, onHome }: ResultCardProps) {
  const maxScore = Math.max(result.scoreBreakdown.checkScore, result.scoreBreakdown.callScore, result.scoreBreakdown.raiseScore, result.scoreBreakdown.foldScore, 1);

  return (
    <section className="w-full rounded-3xl border border-amber-500/50 bg-zinc-950/90 p-5 shadow-2xl">
      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        {/* Left: Action */}
        <div className="grid place-items-center gap-3 lg:sticky lg:top-8 lg:self-start">
          <ActionChip action={result.action} />
          {typeof result.destinyRoll === "number" && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-400/10 px-4 py-3 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500">天命</p>
              <p className="text-3xl font-black text-amber-100">{result.destinyRoll}</p>
            </div>
          )}
        </div>

        {/* Right: Answers & Scoring */}
        <div className="space-y-5">
          {/* Questions & Selected Answers with Modifiers */}
          {questions.length > 0 && selectedAnswers.filter(Boolean).length > 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-amber-400">
                你的回答与分数影响
              </h3>
              <div className="space-y-3">
                {questions.map((q, qi) => {
                  const answer = selectedAnswers[qi];
                  const mods = answer ? activeModifiers(answer.modifiers as Record<string, number>) : [];
                  return (
                    <div key={q.id} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                      <p className="text-sm leading-5 text-zinc-300">{q.text}</p>
                      {answer && (
                        <>
                          <p className="mt-1.5 text-sm font-bold text-amber-200">
                            你选了: {answer.label}
                          </p>
                          {mods.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {mods.map((m) => (
                                <span
                                  key={m.key}
                                  className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${
                                    m.value > 0
                                      ? "bg-emerald-500/15 text-emerald-300"
                                      : "bg-red-500/15 text-red-300"
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

          {result.easterEgg && (
            <div className="overflow-hidden rounded-2xl border border-purple-500/40 bg-zinc-900/70">
              <div className="bg-gradient-to-r from-purple-600/30 via-fuchsia-600/20 to-indigo-600/30 px-4 py-5 text-center">
                <p className="text-3xl">🎉</p>
                <p className="mt-2 text-xl font-black text-purple-200">你触发了隐藏彩蛋！</p>
                <p className="mt-1 text-sm leading-6 text-purple-300/80">
                  今天宇宙让你弃牌——这不是懦弱，是命运的安排。
                  <br />
                  彩蛋触发概率为 5%，你已经击败了 95% 的玩家。
                </p>
              </div>
            </div>
          )}

          {/* Final Scores */}
          {result.easterEgg ? (
            <div className="rounded-2xl border border-purple-500/25 bg-purple-500/5 p-4">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-purple-400">最终打分</h3>
              <p className="text-sm leading-6 text-purple-300/70">
                彩蛋模式下，分数已被命运覆盖。你唯一的选择是：<span className="font-bold text-purple-200">弃牌</span>。
              </p>
            </div>
          ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-amber-400">最终打分</h3>
            <div className="space-y-3">
              {bars.map(([label, key, color]) => {
                const score = result.scoreBreakdown[key];
                const isWinner = score >= maxScore;
                return (
                  <div key={key}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className={isWinner ? "font-bold text-amber-100" : "text-zinc-400"}>{label}</span>
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
          )}

          {/* Character Quote & Decision */}
          {result.easterEgg ? (
            <div className="rounded-2xl border border-purple-500/35 bg-purple-500/5 p-4">
              <h3 className="text-lg font-black text-purple-200">命运裁决</h3>
              <blockquote className="mt-2 border-l-3 border-purple-400 pl-3 text-sm leading-6 text-purple-300/80">
                &ldquo;{result.voiceLine}&rdquo;
              </blockquote>
            </div>
          ) : (
          <div className="rounded-2xl border border-amber-500/35 bg-amber-400/5 p-4">
            <h3 className="text-lg font-black text-amber-100">
              {character.name}: <span className="text-amber-200">{result.action}</span>
            </h3>
            <blockquote className="mt-2 border-l-3 border-amber-400 pl-3 text-sm leading-6 text-zinc-300">
              “{result.voiceLine}”
            </blockquote>
            <p className="mt-3 text-xs leading-5 text-zinc-500">{result.personalityBias}</p>
          </div>
          )}

          {/* Decision Reasoning */}
          {result.easterEgg ? (
            <div className="rounded-2xl border border-purple-500/20 bg-zinc-950/70 p-4">
              <p className="text-sm leading-6 text-purple-300/80">{result.reasoning}</p>
              <p className="mt-2 text-sm leading-6 text-purple-300/60">{result.riskWarning}</p>
              <p className="mt-2 text-xs text-purple-400/50">
                彩蛋已消耗，下次决策恢复正常。
              </p>
            </div>
          ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-sm leading-6 text-zinc-300">{result.reasoning}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{result.riskWarning}</p>
          </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button onClick={onAgain} className="rounded-xl bg-amber-400 px-5 py-3 font-black text-zinc-950 transition hover:scale-105 hover:bg-amber-300">
              再来一轮
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
