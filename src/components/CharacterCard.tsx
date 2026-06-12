import type { Character } from "../types";
import { StatBar } from "./StatBar";

type CharacterCardProps = {
  character: Character;
  selected?: boolean;
  onSelect: (character: Character) => void;
};

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

export function CharacterCard({ character, selected, onSelect }: CharacterCardProps) {
  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border bg-zinc-950/88 p-4 shadow-2xl transition duration-300 hover:-translate-y-1 hover:shadow-gold ${
        selected ? "border-amber-300" : "border-amber-700/45 hover:border-amber-400"
      }`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${character.avatarStyle}`} />
      <div className="flex gap-4">
        <div
          className={`grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-amber-300/50 bg-gradient-to-br ${character.avatarStyle} text-4xl shadow-gold`}
          aria-hidden="true"
        >
          {avatarGlyph(character.id)}
        </div>
        <div>
          <h3 className="text-xl font-black text-amber-100">{character.name}</h3>
          <p className="text-sm font-semibold text-amber-400">{character.archetype}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">{character.description}</p>
        </div>
      </div>

      {character.stats ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatBar label="胆" value={character.stats.courage} />
          <StatBar label="术" value={character.stats.technique} />
          <StatBar label="粮" value={character.stats.bankroll} />
          <StatBar label="眼" value={character.stats.read} />
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-amber-500/35 bg-zinc-900/80 p-4">
          <p className="text-sm font-black text-amber-200">无四维属性</p>
          <p className="mt-1 text-sm leading-6 text-zinc-400">只根据抽象问题和天命随机数行动。</p>
        </div>
      )}

      <button
        onClick={() => onSelect(character)}
        className="mt-5 w-full rounded-xl border border-amber-400/70 bg-amber-500/10 px-4 py-3 font-bold text-amber-100 transition hover:scale-[1.02] hover:bg-amber-400 hover:text-zinc-950"
      >
        选择人格
      </button>
    </article>
  );
}
