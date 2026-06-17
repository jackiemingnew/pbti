import type { PokerGameMode, PokerGameType, RecognizedBoard, RecognizedPlayer } from "../types";

type ParsedCard = {
  rank: number;
  suit: string;
  code: string;
};

export type PlayerShowdownResult = {
  player: RecognizedPlayer;
  valid: boolean;
  error?: string;
  handName?: string;
  handRank?: number;
  bestCards?: string[];
  rankVector?: number[];
};

export type BoardShowdownResult = {
  board: RecognizedBoard;
  boardIndex: number;
  winners: PlayerShowdownResult[];
  players: PlayerShowdownResult[];
};

const rankValues: Record<string, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

const rankLabels: Record<number, string> = {
  14: "A",
  13: "K",
  12: "Q",
  11: "J",
  10: "T",
  9: "9",
  8: "8",
  7: "7",
  6: "6",
  5: "5",
  4: "4",
  3: "3",
  2: "2",
};

const suitMap: Record<string, string> = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣",
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
  "黑桃": "♠",
  "红桃": "♥",
  "方片": "♦",
  "方块": "♦",
  "梅花": "♣",
};

const categoryNames = ["高牌", "一对", "两对", "三条", "顺子", "同花", "葫芦", "四条", "同花顺"];

export function parseCards(input: string | string[]): string[] {
  const text = Array.isArray(input) ? input.join(" ") : input;
  const cards: string[] = [];
  const normalizedText = text.replace(/10/g, "T");
  const pattern = /(A|K|Q|J|T|[2-9])\s*(♠|♥|♦|♣|[shdcSHDC]|黑桃|红桃|方片|方块|梅花)/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(normalizedText)) !== null) {
    const rank = match[1].toUpperCase();
    const suit = suitMap[match[2]] || match[2];
    cards.push(`${rank}${suit}`);
  }

  return dedupeCards(cards);
}

export function cardsToText(cards: string[]) {
  return cards.join(" ");
}

export function inferGameType(mode: PokerGameMode, players: RecognizedPlayer[]): PokerGameType {
  if (mode === "holdem" || mode === "omaha") return mode;
  return players.some((player) => player.holeCards.length >= 4) ? "omaha" : "holdem";
}

export function analyzeShowdown(mode: PokerGameMode, players: RecognizedPlayer[], boards: RecognizedBoard[]): BoardShowdownResult[] {
  const gameType = inferGameType(mode, players);
  const normalizedPlayers = players.filter((player) => player.seat.trim() || player.holeCards.length > 0);
  const normalizedBoards = boards.length ? boards : [{ id: "board-1", label: "主牌面", cards: [] }];

  return normalizedBoards.map((board, boardIndex) => {
    const boardCards = parseCards(board.cards);
    const playerResults = normalizedPlayers.map((player) => evaluatePlayer(gameType, player, boardCards));
    const validResults = playerResults.filter((result) => result.valid);
    const best = validResults.reduce<PlayerShowdownResult | null>((current, next) => {
      if (!current) return next;
      return compareResult(next, current) > 0 ? next : current;
    }, null);
    const winners = best ? validResults.filter((result) => compareResult(result, best) === 0) : [];

    return {
      board: { ...board, cards: boardCards },
      boardIndex,
      winners,
      players: playerResults,
    };
  });
}

function evaluatePlayer(gameType: PokerGameType, player: RecognizedPlayer, boardCards: string[]): PlayerShowdownResult {
  const holeCards = parseCards(player.holeCards);
  if (gameType === "holdem" && holeCards.length < 2) {
    return { player: { ...player, holeCards }, valid: false, error: "德州至少需要 2 张手牌。" };
  }
  if (gameType === "omaha" && holeCards.length < 4) {
    return { player: { ...player, holeCards }, valid: false, error: "奥马哈需要 4 张手牌。" };
  }
  if (boardCards.length < 5) {
    return { player: { ...player, holeCards }, valid: false, error: "需要完整 5 张公共牌才能计算胜利牌型。" };
  }

  const combinations =
    gameType === "omaha"
      ? combine(holeCards, 2).flatMap((holeCombo) => combine(boardCards, 3).map((boardCombo) => [...holeCombo, ...boardCombo]))
      : combine([...holeCards, ...boardCards], 5);

  const best = combinations
    .map((cards) => evaluateFiveCards(cards))
    .reduce<FiveCardEvaluation | null>((current, next) => {
      if (!current) return next;
      return compareEvaluation(next, current) > 0 ? next : current;
    }, null);

  if (!best) {
    return { player: { ...player, holeCards }, valid: false, error: "无法计算该玩家牌型。" };
  }

  return {
    player: { ...player, holeCards },
    valid: true,
    handName: describeEvaluation(best),
    handRank: best.category,
    bestCards: best.cards,
    rankVector: best.rankVector,
  };
}

type FiveCardEvaluation = {
  category: number;
  rankVector: number[];
  cards: string[];
};

function evaluateFiveCards(cardCodes: string[]): FiveCardEvaluation {
  const cards = cardCodes.map(parseCard).filter(Boolean) as ParsedCard[];
  const suits = cards.map((card) => card.suit);
  const ranks = cards.map((card) => card.rank).sort((a, b) => b - a);
  const isFlush = suits.every((suit) => suit === suits[0]);
  const straightHigh = getStraightHigh(ranks);
  const counts = countRanks(ranks);
  const groups = [...counts.entries()]
    .map(([rank, count]) => ({ rank, count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  if (isFlush && straightHigh) {
    return buildEvaluation(8, [straightHigh], cards);
  }

  if (groups[0]?.count === 4) {
    const kicker = groups.find((group) => group.count === 1)?.rank || 0;
    return buildEvaluation(7, [groups[0].rank, kicker], cards);
  }

  if (groups[0]?.count === 3 && groups[1]?.count === 2) {
    return buildEvaluation(6, [groups[0].rank, groups[1].rank], cards);
  }

  if (isFlush) {
    return buildEvaluation(5, ranks, cards);
  }

  if (straightHigh) {
    return buildEvaluation(4, [straightHigh], cards);
  }

  if (groups[0]?.count === 3) {
    const kickers = groups.filter((group) => group.count === 1).map((group) => group.rank);
    return buildEvaluation(3, [groups[0].rank, ...kickers], cards);
  }

  if (groups[0]?.count === 2 && groups[1]?.count === 2) {
    const pairs = groups.filter((group) => group.count === 2).map((group) => group.rank);
    const kicker = groups.find((group) => group.count === 1)?.rank || 0;
    return buildEvaluation(2, [...pairs, kicker], cards);
  }

  if (groups[0]?.count === 2) {
    const kickers = groups.filter((group) => group.count === 1).map((group) => group.rank);
    return buildEvaluation(1, [groups[0].rank, ...kickers], cards);
  }

  return buildEvaluation(0, ranks, cards);
}

function parseCard(code: string): ParsedCard | null {
  const parsed = parseCards(code)[0];
  if (!parsed) return null;
  const rank = rankValues[parsed.slice(0, -1)];
  const suit = parsed.slice(-1);
  if (!rank || !suit) return null;
  return { rank, suit, code: parsed };
}

function buildEvaluation(category: number, rankVector: number[], cards: ParsedCard[]): FiveCardEvaluation {
  return {
    category,
    rankVector,
    cards: cards
      .slice()
      .sort((a, b) => b.rank - a.rank)
      .map((card) => card.code),
  };
}

function describeEvaluation(evaluation: FiveCardEvaluation) {
  const mainRank = evaluation.rankVector[0] ? rankLabels[evaluation.rankVector[0]] : "";
  if (evaluation.category === 4 || evaluation.category === 8) {
    return `${mainRank} 高 ${categoryNames[evaluation.category]}`;
  }
  if (evaluation.category >= 1 && evaluation.category <= 7) {
    return `${mainRank} ${categoryNames[evaluation.category]}`;
  }
  return `${mainRank} 高牌`;
}

function getStraightHigh(ranks: number[]) {
  const unique = [...new Set(ranks)];
  if (unique.includes(14)) unique.push(1);
  const sorted = unique.sort((a, b) => b - a);
  for (let index = 0; index <= sorted.length - 5; index += 1) {
    const window = sorted.slice(index, index + 5);
    if (window.every((rank, offset) => offset === 0 || rank === window[offset - 1] - 1)) {
      return window[0] === 1 ? 5 : window[0];
    }
  }
  return 0;
}

function countRanks(ranks: number[]) {
  return ranks.reduce((map, rank) => {
    map.set(rank, (map.get(rank) || 0) + 1);
    return map;
  }, new Map<number, number>());
}

function compareResult(a: PlayerShowdownResult, b: PlayerShowdownResult) {
  if (!a.valid || !b.valid) return 0;
  return compareRankVectors([a.handRank || 0, ...(a.rankVector || [])], [b.handRank || 0, ...(b.rankVector || [])]);
}

function compareEvaluation(a: FiveCardEvaluation, b: FiveCardEvaluation) {
  return compareRankVectors([a.category, ...a.rankVector], [b.category, ...b.rankVector]);
}

function compareRankVectors(a: number[], b: number[]) {
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (a[index] || 0) - (b[index] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function combine<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];
  const [first, ...rest] = items;
  return [...combine(rest, size - 1).map((combo) => [first, ...combo]), ...combine(rest, size)];
}

function dedupeCards(cards: string[]) {
  return [...new Set(cards)];
}
