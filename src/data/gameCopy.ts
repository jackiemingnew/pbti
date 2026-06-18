import type { Character, DecisionResult } from "../types";

type PersonaKey = "fa_ge" | "tom_dwan" | "tan_xuan" | "wukong" | "default";
type RoastAction = Exclude<DecisionResult["action"], "Check">;

export const loadingQuotes: Record<PersonaKey, string[]> = {
  fa_ge: ["正在整理西装……", "正在收取气场费……", "正在判断对手怕不怕……"],
  tom_dwan: ["正在寻找 fold equity……", "正在编写三条街剧本……", "正在判断这只鸡熟没熟……"],
  tan_xuan: ["正在评估剧情价值……", "正在清点筹码……", "正在决定要不要买票看结局……"],
  wukong: ["正在掷天命骰子……", "正在查看三界之外……", "正在等待河牌显灵……"],
  default: ["正在进行人格审判……"],
};

export const tableRoasts: Record<RoastAction, string[]> = {
  Raise: ["这不是加注，这是气场收费。", "他没牌的时候，创作欲最强。", "这一棒，打穿你的范围。"],
  Call: ["这不是跟注，这是付费看真相。", "老板不是在跟注，老板是在买票看大结局。", "这一注不是 pot odds，是命运门票。"],
  Fold: ["今天不入劫，明天还有筹码。", "真正的纪律，是知道什么时候不演。", "弃牌不是认输，是拒绝参加事故。"],
};

export const homeQuotes = [
  "MBTI 告诉你你是谁，PBTI 告诉你你为什么这么打。",
  "你以为你在打牌，其实你在暴露行为模式。",
  "德州一分钟能学会，十年后你还在问自己为什么跟了那一注。",
];

export function randomCopy(items: string[]) {
  return items[Math.floor(Math.random() * items.length)] || "";
}

export function getPersonaKey(character: Character): PersonaKey {
  if (character.id === "king-chow" || character.id === "fa_ge") return "fa_ge";
  if (character.id === "bluff-assassin" || character.id === "tom_dwan") return "tom_dwan";
  if (character.id === "boss-whale" || character.id === "tan_xuan") return "tan_xuan";
  if (character.id === "destiny-fool" || character.id === "wukong") return "wukong";
  return "default";
}

export function pickLoadingQuote(character: Character) {
  return randomCopy(loadingQuotes[getPersonaKey(character)]);
}

export function pickTableRoast(action: DecisionResult["action"]) {
  return randomCopy(tableRoasts[action === "Check" ? "Fold" : action]);
}
