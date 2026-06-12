const redSuits = ["♥", "♦"];

type PlayingCardProps = {
  card: string;
};

export function PlayingCard({ card }: PlayingCardProps) {
  const rank = card.slice(0, -1);
  const suit = card.slice(-1);
  const isRed = redSuits.includes(suit);

  return (
    <span className="inline-grid h-16 w-12 place-items-center rounded-md border border-zinc-300 bg-gradient-to-br from-white to-zinc-200 text-lg font-black shadow-md sm:h-20 sm:w-14 sm:text-xl">
      <span className={isRed ? "text-red-600" : "text-zinc-950"}>
        {rank}
        {suit}
      </span>
    </span>
  );
}
