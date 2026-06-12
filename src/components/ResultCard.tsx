import type { Character, DecisionResult, PokerScenario } from "../types";
import { ActionChip } from "./ActionChip";

type ResultCardProps = {
  character: Character;
  scenario: PokerScenario;
  result: DecisionResult;
  onAgain: () => void;
  onChangeCharacter: () => void;
  onHome: () => void;
};

const bars = [
  ["Check", "checkScore", "bg-emerald-500"],
  ["Call", "callScore", "bg-blue-500"],
  ["Raise", "raiseScore", "bg-red-500"],
] as const;

export function ResultCard({ character, scenario, result, onAgain, onChangeCharacter, onHome }: ResultCardProps) {
  const maxScore = Math.max(result.scoreBreakdown.checkScore, result.scoreBreakdown.callScore, result.scoreBreakdown.raiseScore, 1);

  return (
    <section className="rounded-3xl border border-amber-500/50 bg-zinc-950/90 p-5 shadow-2xl">
      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <div className="grid place-items-center gap-3">
          <ActionChip action={result.action} />
          <div className="rounded-full border border-amber-400/40 bg-zinc-900 px-4 py-2 text-center text-sm font-bold text-amber-100">
            {result.sizing}
          </div>
          {typeof result.destinyRoll === "number" && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-400/10 px-4 py-3 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500">天命随机数</p>
              <p className="text-3xl font-black text-amber-100">{result.destinyRoll}</p>
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-amber-500">Final Decision</p>
          <h2 className="mt-2 text-3xl font-black text-amber-100">{character.name}: {result.action}</h2>
          <p className="mt-2 text-zinc-400">{scenario.title} · {scenario.heroHand} · {scenario.board}</p>

          <blockquote className="mt-5 rounded-2xl border-l-4 border-amber-400 bg-amber-400/10 p-4 text-lg font-bold text-amber-100">
            “{result.voiceLine}”
          </blockquote>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Info title="决策理由" body={result.reasoning} />
            <Info title="风险提示" body={result.riskWarning} />
            <Info title="人格偏差" body={result.personalityBias} />
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <h3 className="font-black text-amber-100">分数拆解</h3>
            <div className="mt-3 space-y-3">
              {bars.map(([label, key, color]) => (
                <div key={key}>
                  <div className="mb-1 flex justify-between text-sm text-zinc-300">
                    <span>{label}</span>
                    <span>{result.scoreBreakdown[key]}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                    <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${(result.scoreBreakdown[key] / maxScore) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={onAgain} className="rounded-xl bg-amber-400 px-5 py-3 font-black text-zinc-950 transition hover:scale-105 hover:bg-amber-300">
              再来一手
            </button>
            <button onClick={onChangeCharacter} className="rounded-xl border border-amber-500/60 px-5 py-3 font-bold text-amber-100 transition hover:bg-amber-500/15">
              换个角色重打
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

function Info({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
      <h3 className="font-black text-amber-200">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-300">{body}</p>
    </div>
  );
}
