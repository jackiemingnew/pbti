import { getPbtiProfile } from "../data/pbtiProfiles";
import { classifyPbtiProfile, type PbtiClassification } from "./pbtiClassifier";
import { type VpipHandRecord, type VpipStats, type VpipPosition } from "./vpipTracker";

export type VpipProfileScores = {
  chicken: number;
  money: number;
  skill: number;
};

export type VpipAchievement = {
  id: string;
  title: string;
  description: string;
  tone: "gold" | "red" | "blue" | "green" | "purple";
};

export type VpipTableStatus = {
  label: string;
  title: string;
  description: string;
  tone: VpipAchievement["tone"];
};

export type VpipSessionReport = {
  scores: VpipProfileScores;
  classification: PbtiClassification;
  sessionTitle: string;
  tableStatus: VpipTableStatus;
  verdict: string;
  achievements: VpipAchievement[];
  shareLine: string;
};

const latePositions = new Set<VpipPosition>(["CO", "BTN"]);
const earlyPositions = new Set<VpipPosition>(["UTG", "MP"]);

export function buildVpipSessionReport(records: VpipHandRecord[], stats: VpipStats): VpipSessionReport {
  const scores = derivePbtiScoresFromVpip(records, stats);
  const classification = classifyPbtiProfile({
    ...scores,
    totalHands: stats.totalHands,
    actionCounts: {
      fold: stats.foldHands,
      check: stats.checkHands,
      call: stats.callHands,
      raise: stats.raiseHands,
    },
  });
  const profile = getPbtiProfile(classification.code);
  const achievements = getVpipAchievements(records, stats);
  const tableStatus = pickTableStatus(classification, stats, achievements);
  const sessionTitle = tableStatus.title;
  const verdict = buildVerdict(classification, stats);

  return {
    scores,
    classification,
    sessionTitle,
    tableStatus,
    verdict,
    achievements,
    shareLine: `今晚我是 ${profile.alias} ${classification.code}｜${classification.title}，VPIP ${stats.vpipPercent.toFixed(1)}%，PFR ${stats.pfrPercent.toFixed(1)}%。`,
  };
}

export function filterVpipRecordsForLocalDay(records: VpipHandRecord[], date = new Date()) {
  const targetKey = localDayKey(date);
  return records.filter((record) => localDayKey(new Date(record.timestamp)) === targetKey);
}

export function derivePbtiScoresFromVpip(records: VpipHandRecord[], stats: VpipStats): VpipProfileScores {
  const lateRaiseHands = records.filter((record) => latePositions.has(record.position) && record.action === "Raise").length;
  const earlyVpipHands = records.filter((record) => earlyPositions.has(record.position) && (record.action === "Call" || record.action === "Raise")).length;
  const earlyHands = records.filter((record) => earlyPositions.has(record.position)).length;
  const lateHands = records.filter((record) => latePositions.has(record.position)).length;
  const lateVpipHands = records.filter((record) => latePositions.has(record.position) && (record.action === "Call" || record.action === "Raise")).length;
  const consecutiveLossIntoVpip = countLossChaseSpots(records);

  const chicken = clampScore(
    3.2 +
      stats.raisePercent * 0.08 +
      stats.pfrPercent * 0.08 +
      lateRaiseHands * 0.18 +
      longestActionStreak(records, "Raise") * 0.25,
  );
  const money = clampScore(
    3.4 +
      stats.vpipPercent * 0.065 +
      stats.callPercent * 0.06 +
      stats.winRate * 0.012 +
      consecutiveLossIntoVpip * 0.35,
  );
  const skill = clampScore(
    4.4 +
      Math.max(0, stats.pfrPercent - stats.callPercent) * 0.045 +
      (lateHands ? (lateVpipHands / lateHands) * 1.8 : 0) -
      (earlyHands ? (earlyVpipHands / earlyHands) * 1.2 : 0) -
      Math.max(0, stats.vpipPercent - stats.pfrPercent - 18) * 0.04,
  );

  return { chicken, money, skill };
}

export function getVpipAchievements(records: VpipHandRecord[], stats: VpipStats): VpipAchievement[] {
  const achievements: VpipAchievement[] = [];
  const lateRaiseHands = records.filter((record) => latePositions.has(record.position) && record.action === "Raise").length;
  const blindVpipHands = records.filter((record) => (record.position === "SB" || record.position === "BB") && (record.action === "Call" || record.action === "Raise")).length;
  const blindHands = records.filter((record) => record.position === "SB" || record.position === "BB").length;

  if (stats.totalHands >= 8 && stats.vpipPercent >= 45) {
    achievements.push({
      id: "vpip-maniac",
      title: "入池狂热者",
      description: "你今晚不是在等牌，是在等一个入池理由。",
      tone: "red",
    });
  }
  if (stats.totalHands >= 12 && stats.vpipPercent < 18) {
    achievements.push({
      id: "discipline-monk",
      title: "冷面修士",
      description: "牌桌很吵，你的弃牌键很安静。",
      tone: "green",
    });
  }
  if (stats.totalHands >= 8 && stats.callPercent >= 35) {
    achievements.push({
      id: "plot-investor",
      title: "剧情投资人",
      description: "你不是跟注，你是在续费大结局。",
      tone: "blue",
    });
  }
  if (stats.totalHands >= 8 && stats.raisePercent >= 30) {
    achievements.push({
      id: "three-street-director",
      title: "三街导演",
      description: "只要你开火，对手就得读剧本。",
      tone: "red",
    });
  }
  if (countLossChaseSpots(records) >= 2) {
    achievements.push({
      id: "boss-rebuy-energy",
      title: "老板验资",
      description: "输完下一手继续入池，钱包说它尊重你的表达。",
      tone: "gold",
    });
  }
  if (blindHands >= 4 && blindVpipHands / blindHands >= 0.45) {
    achievements.push({
      id: "blind-defender",
      title: "盲注保卫者",
      description: "小盲大盲不是你的家，但你今晚很想装修。",
      tone: "purple",
    });
  }
  if (stats.totalHands >= 8 && lateRaiseHands >= 3) {
    achievements.push({
      id: "late-position-knife",
      title: "后位刺客",
      description: "CO / BTN 一到你手里，就像开了许可。",
      tone: "gold",
    });
  }
  if (longestPassiveStreak(records) >= 6) {
    achievements.push({
      id: "no-disaster-tonight",
      title: "今天不渡劫",
      description: "连续克制，事故从你身边经过但没有上车。",
      tone: "green",
    });
  }

  if (!achievements.length && stats.totalHands > 0) {
    achievements.push({
      id: "sample-growing",
      title: "样本培养中",
      description: "再记录几手，牌桌人格会开始露出马脚。",
      tone: "gold",
    });
  }

  return achievements.slice(0, 4);
}

function pickTableStatus(classification: PbtiClassification, stats: VpipStats, achievements: VpipAchievement[]): VpipTableStatus {
  const firstAchievement = achievements[0]?.title;
  if (stats.totalHands < 5) {
    return {
      label: "今日状态",
      title: "牌桌人格采样中",
      description: "样本还少，先别急着给自己判刑。再记录几手，今日状态会更像你。",
      tone: "gold",
    };
  }
  if (stats.raisePercent >= 35 || (firstAchievement && firstAchievement === "三街导演")) {
    return {
      label: "今晚状态",
      title: "上头火山",
      description: "你的进攻按钮今天有点烫。能赢很多小池，也可能把一手普通牌写成灾难片。",
      tone: "red",
    };
  }
  if (stats.callPercent >= 35 || (firstAchievement && firstAchievement === "剧情投资人")) {
    return {
      label: "今晚状态",
      title: "老板模式",
      description: "你今天很想知道答案。不是每个真相都贵，但河牌上的真相通常不便宜。",
      tone: "blue",
    };
  }
  if (stats.lossHands >= 3 && stats.winRate <= 35 && stats.resolvedHands >= 5) {
    return {
      label: "今晚状态",
      title: "河牌受害者",
      description: "今天的反馈偏苦，适合提醒自己：输赢结果会骗人，行动频率才会留下证据。",
      tone: "purple",
    };
  }
  if (stats.raiseHands >= 2 && stats.winHands === 0 && stats.resolvedHands >= 3) {
    return {
      label: "今晚状态",
      title: "偷鸡未遂犯",
      description: "你不是没想法，只是今天对手比较不配合。下次开火前，先问一句他会不会真的弃。",
      tone: "purple",
    };
  }
  if (stats.vpipPercent < 18 || (firstAchievement && firstAchievement === "冷面修士")) {
    return {
      label: "今晚状态",
      title: "冷静修士",
      description: "今天你把很多事故挡在了弃牌键外面。稳是优点，但也别让好机会一直路过。",
      tone: "green",
    };
  }
  if (firstAchievement && firstAchievement !== "样本培养中") {
    return {
      label: "今晚状态",
      title: firstAchievement,
      description: `${classification.title} 的底色很明显，今天最突出的标签是：${firstAchievement}。`,
      tone: achievements[0]?.tone || "gold",
    };
  }
  return {
    label: "今晚状态",
    title: `${classification.title} 上桌`,
    description: "今天没有特别离谱的单项倾向，属于正常显形。继续记录，状态会越来越有戏。",
    tone: "gold",
  };
}

function buildVerdict(classification: PbtiClassification, stats: VpipStats) {
  if (stats.totalHands < 5) {
    return "样本还少，但牌桌人格已经开始偷看你怎么点按钮了。";
  }
  if (stats.raisePercent >= 30) {
    return `你今晚的进攻欲很明显，系统暂判为 ${classification.code}｜${classification.title}。这不是每次都错，但每次开火都得有人买单。`;
  }
  if (stats.callPercent >= 35) {
    return `你今晚很愿意看结局，系统暂判为 ${classification.code}｜${classification.title}。好奇心很贵，尤其是在河牌。`;
  }
  if (stats.vpipPercent < 18) {
    return `你今晚偏克制，系统暂判为 ${classification.code}｜${classification.title}。纪律很好，但别让好 spot 从门口溜走。`;
  }
  return `你今晚的牌桌节奏比较均衡，系统暂判为 ${classification.code}｜${classification.title}。继续记录，画像会更像你。`;
}

function countLossChaseSpots(records: VpipHandRecord[]) {
  return records.reduce((count, record, index) => {
    const previous = records[index - 1];
    if (!previous || previous.outcome !== "loss") return count;
    return record.action === "Call" || record.action === "Raise" ? count + 1 : count;
  }, 0);
}

function longestActionStreak(records: VpipHandRecord[], action: VpipHandRecord["action"]) {
  let current = 0;
  let longest = 0;
  records.forEach((record) => {
    current = record.action === action ? current + 1 : 0;
    longest = Math.max(longest, current);
  });
  return longest;
}

function longestPassiveStreak(records: VpipHandRecord[]) {
  let current = 0;
  let longest = 0;
  records.forEach((record) => {
    current = record.action === "Fold" || record.action === "Check" ? current + 1 : 0;
    longest = Math.max(longest, current);
  });
  return longest;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(10, Math.round(value * 10) / 10));
}

function localDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
