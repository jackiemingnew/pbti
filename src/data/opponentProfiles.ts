import type { OpponentProfile } from "../types";

export const opponentProfiles: OpponentProfile[] = [
  {
    id: "boss",
    name: "老板型",
    shortName: "老板",
    description: "爱看牌，不太爱弃，愿意买票看到结局。",
    strategyHint: "降低诈唬收益，提高价值下注、摊牌价值和跟注权重。",
    resultBias: "你可能把“他会弃牌”想得太浪漫了。",
    modifiers: {
      foldEquity: -2,
      showdownValue: 1,
      callScoreBonus: 1,
      raiseScoreBonus: -0.5,
    },
  },
  {
    id: "tight-weak",
    name: "紧弱型",
    shortName: "紧弱",
    description: "怕大池，遇到持续压力容易退。",
    strategyHint: "提高 fold equity 和主动施压收益，但别把每次害怕都当成可剥削。",
    resultBias: "你可能把普通谨慎误读成已经崩了。",
    modifiers: {
      foldEquity: 2,
      opponentAggression: -1,
      raiseScoreBonus: 1.2,
    },
  },
  {
    id: "bluffy",
    name: "诈唬型",
    shortName: "诈唬",
    description: "喜欢讲故事，动作多，可能在演你。",
    strategyHint: "提高对手攻击性、摊牌价值和跟注权重，提醒你别被情绪带着抓。",
    resultBias: "你可能不是在抓诈唬，只是不想承认自己被欺负。",
    modifiers: {
      opponentAggression: 2,
      showdownValue: 1,
      callScoreBonus: 1.2,
      uncertainty: 0.8,
    },
  },
  {
    id: "regular",
    name: "规矩型",
    shortName: "规矩",
    description: "更按牌理、赔率、位置和下注尺度打。",
    strategyHint: "提高理论和赔率权重，减少纯感觉决策。",
    resultBias: "你可能用气场解释了一件本来该用范围解决的事。",
    modifiers: {
      skill: 1,
      potOdds: 1,
      uncertainty: -0.5,
      checkScoreBonus: 0.5,
    },
  },
  {
    id: "unknown",
    name: "看不懂型",
    shortName: "未知",
    description: "状态混沌，无法归类，信息质量很低。",
    strategyHint: "提高不确定性，略微提高过牌/弃牌权重，避免硬猜。",
    resultBias: "你可能只是在给信息不足找一个戏剧化解释。",
    modifiers: {
      uncertainty: 2,
      foldScoreBonus: 0.8,
      checkScoreBonus: 0.8,
    },
  },
];

export function opponentProfileToPrompt(profile: OpponentProfile | null) {
  if (!profile) return "";
  return [
    "",
    "当前对手读法：",
    `- 类型：${profile.name}`,
    `- 描述：${profile.description}`,
    `- 策略影响：${profile.strategyHint}`,
    `- 结果页偏差提醒：${profile.resultBias}`,
    "请让角色提出的问题围绕这个对手类型展开，但仍保持轻量、口语、朋友局吐槽感。",
  ].join("\n");
}

export function opponentProfileSnapshot(profile: OpponentProfile | null) {
  if (!profile) return undefined;
  return {
    id: profile.id,
    name: profile.name,
    shortName: profile.shortName,
    description: profile.description,
    strategyHint: profile.strategyHint,
    resultBias: profile.resultBias,
  };
}
