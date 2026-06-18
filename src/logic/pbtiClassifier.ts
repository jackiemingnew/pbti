export type PbtiAxisCode = "鸡" | "稳" | "豪" | "谨" | "术" | "风";

export type PbtiProfileCode =
  | "鸡豪术"
  | "鸡豪风"
  | "鸡谨术"
  | "鸡谨风"
  | "稳豪术"
  | "稳豪风"
  | "稳谨术"
  | "稳谨风";

export type PbtiClassificationInput = {
  chicken: number;
  money: number;
  skill: number;
  actionCounts?: {
    fold?: number;
    check?: number;
    call?: number;
    raise?: number;
  };
  totalHands?: number;
};

export type PbtiClassification = {
  code: PbtiProfileCode;
  title: string;
  representative: string;
  diagnosis: string;
  warning: string;
  deathPattern: string;
  strengthLabel: string;
  confidenceLabel: string;
  axes: {
    chickenAxis: "鸡" | "稳";
    moneyAxis: "豪" | "谨";
    skillAxis: "术" | "风";
  };
};

const HIGH_THRESHOLD = 6.2;
const LOW_THRESHOLD = 4.8;

function ratio(value: number | undefined, total: number) {
  return total > 0 ? (value || 0) / total : 0;
}

function strengthLabel(input: PbtiClassificationInput) {
  const averageDeviation = (Math.abs(input.chicken - 5) + Math.abs(input.money - 5) + Math.abs(input.skill - 5)) / 3;
  if (averageDeviation < 0.8) return "轻微倾向";
  if (averageDeviation < 1.5) return "稳定倾向";
  if (averageDeviation < 2.5) return "重度感染";
  return "已经发病";
}

function confidenceLabel(totalHands: number) {
  if (totalHands < 5) return "样本太少，仅供娱乐";
  if (totalHands <= 15) return "初步画像";
  if (totalHands <= 40) return "稳定画像";
  return "长期画像";
}

export function classifyPbtiProfile(input: PbtiClassificationInput): PbtiClassification {
  const counts = input.actionCounts || {};
  const countedHands = (counts.fold || 0) + (counts.check || 0) + (counts.call || 0) + (counts.raise || 0);
  const totalHands = input.totalHands ?? countedHands;
  const actionTotal = countedHands || totalHands;

  const chickenAxis: "鸡" | "稳" =
    input.chicken >= HIGH_THRESHOLD
      ? "鸡"
      : input.chicken <= LOW_THRESHOLD
        ? "稳"
        : ratio(counts.raise, actionTotal) >= 0.45
          ? "鸡"
          : "稳";

  const moneyAxis: "豪" | "谨" =
    input.money >= HIGH_THRESHOLD
      ? "豪"
      : input.money <= LOW_THRESHOLD
        ? "谨"
        : ratio(counts.call, actionTotal) >= 0.4
          ? "豪"
          : "谨";

  const structuredActionRatio = ratio((counts.raise || 0) + (counts.check || 0), actionTotal);
  const skillAxis: "术" | "风" =
    input.skill >= HIGH_THRESHOLD
      ? "术"
      : input.skill <= LOW_THRESHOLD
        ? "风"
        : structuredActionRatio >= 0.5 && (input.skill >= input.chicken || input.skill >= input.money)
          ? "术"
          : "风";

  const code = `${chickenAxis}${moneyAxis}${skillAxis}` as PbtiProfileCode;
  const profile = pbtiProfileMap[code];

  return {
    code,
    title: profile.title,
    representative: profile.representative,
    diagnosis: profile.longDescription,
    warning: profile.warning,
    deathPattern: profile.deathPattern,
    strengthLabel: strengthLabel(input),
    confidenceLabel: confidenceLabel(totalHands),
    axes: {
      chickenAxis,
      moneyAxis,
      skillAxis,
    },
  };
}
import { pbtiProfileMap } from "../data/pbtiProfiles";
