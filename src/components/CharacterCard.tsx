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
        <CharacterAvatar character={character} size="card" />
        <div>
          <h3 className="text-xl font-black text-amber-100">{character.name}</h3>
          <p className="text-sm font-semibold text-amber-400">{character.archetype}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">{character.description}</p>
        </div>
      </div>

      {character.stats ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatBar label="鸡" value={character.stats.chicken} />
          <StatBar label="钱" value={character.stats.money} />
          <StatBar label="术" value={character.stats.skill} />
          <div className="rounded-xl border border-amber-500/25 bg-zinc-900/70 px-3 py-2 text-xs leading-5 text-zinc-400">
            PBTI 三维人格
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-amber-500/35 bg-zinc-900/80 p-4">
          <p className="text-sm font-black text-amber-200">三界之外</p>
          <p className="mt-1 text-sm leading-6 text-zinc-400">不显示鸡 / 钱 / 术，每手由 destinyRoll 驱动。</p>
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

export function CharacterAvatar({ character, size = "card" }: { character: Character; size?: "card" | "mini" | "small" | "large" }) {
  const sizeClass =
    size === "large"
      ? "h-32 w-32 text-5xl"
      : size === "small"
        ? "h-14 w-14 text-2xl"
        : size === "mini"
          ? "h-9 w-9 text-base"
          : "h-20 w-20 text-4xl";

  return (
    <div
      className={`grid ${sizeClass} shrink-0 place-items-center overflow-hidden rounded-2xl border border-amber-300/50 bg-gradient-to-br ${character.avatarStyle} shadow-gold`}
      aria-hidden="true"
    >
      {character.avatarImage ? (
        <img src={character.avatarImage} alt="" className="h-full w-full object-cover" />
      ) : (
        <span>{avatarGlyph(character.id)}</span>
      )}
    </div>
  );
}
