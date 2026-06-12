import type { PokerScenario } from "../types";
import { PlayingCard } from "./PlayingCard";

const splitCards = (cards: string) => cards.split(/\s+/).filter(Boolean);

export function PokerTable({ scenario }: { scenario: PokerScenario }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-amber-500/50 bg-[radial-gradient(circle_at_50%_35%,rgba(16,185,129,0.26),rgba(24,24,27,0.94)_52%,rgba(10,10,10,1)_100%)] p-5 shadow-2xl">
      <div className="absolute inset-4 rounded-[2rem] border border-amber-400/25" />
      <div className="relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-400">Battlefield Hand</p>
            <h2 className="mt-1 text-2xl font-black text-amber-100">{scenario.title}</h2>
          </div>
          <div className="rounded-full border border-amber-500/60 bg-zinc-950/70 px-4 py-2 text-sm font-bold text-amber-100">
            Pot {scenario.pot}BB
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-2xl border border-amber-500/30 bg-zinc-950/70 p-4">
            <p className="text-sm text-zinc-400">Hero 手牌</p>
            <div className="mt-3 flex gap-2">{splitCards(scenario.heroHand).map((card) => <PlayingCard key={card} card={card} />)}</div>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-red-900/80 px-3 py-1 font-bold text-white">{scenario.position}</span>
              <span className="rounded-full bg-zinc-800 px-3 py-1 text-zinc-200">{scenario.opponentAction}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-zinc-950/70 p-4">
            <p className="text-sm text-zinc-400">公共牌</p>
            <div className="mt-3 flex flex-wrap gap-2">{splitCards(scenario.board).map((card) => <PlayingCard key={card} card={card} />)}</div>
            <p className="mt-4 text-sm leading-6 text-zinc-300">{scenario.situation}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
