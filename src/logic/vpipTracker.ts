export type VpipPosition = "UTG" | "MP" | "HJ" | "CO" | "BTN" | "SB" | "BB";

export type VpipAction = "Fold" | "Check" | "Call" | "Raise";

export type VpipHandRecord = {
  id: string;
  sessionId: string;
  position: VpipPosition;
  action: VpipAction;
  timestamp: number;
};

export type PositionStats = {
  position: VpipPosition;
  totalHands: number;
  vpipHands: number;
  vpipPercent: number;
  pfrHands: number;
  pfrPercent: number;
  callHands: number;
  callPercent: number;
  raiseHands: number;
  raisePercent: number;
  foldHands: number;
  checkHands: number;
};

export type VpipStats = {
  totalHands: number;
  vpipHands: number;
  vpipPercent: number;
  pfrHands: number;
  pfrPercent: number;
  callHands: number;
  callPercent: number;
  raiseHands: number;
  raisePercent: number;
  foldHands: number;
  foldPercent: number;
  checkHands: number;
  checkPercent: number;
  byPosition: Record<VpipPosition, PositionStats>;
  mostPlayedPosition?: VpipPosition;
  loosestPosition?: VpipPosition;
  tightestPosition?: VpipPosition;
};

export const VPIP_POSITIONS: VpipPosition[] = ["UTG", "MP", "HJ", "CO", "BTN", "SB", "BB"];
export const VPIP_ACTIONS: VpipAction[] = ["Fold", "Check", "Call", "Raise"];

export function isVpipAction(action: VpipAction) {
  return action === "Call" || action === "Raise";
}

export function isPfrAction(action: VpipAction) {
  return action === "Raise";
}

function percent(value: number, total: number) {
  return total ? Math.round((value / total) * 1000) / 10 : 0;
}

function statsForPosition(position: VpipPosition, records: VpipHandRecord[]): PositionStats {
  const positionRecords = records.filter((record) => record.position === position);
  const totalHands = positionRecords.length;
  const vpipHands = positionRecords.filter((record) => isVpipAction(record.action)).length;
  const pfrHands = positionRecords.filter((record) => isPfrAction(record.action)).length;
  const callHands = positionRecords.filter((record) => record.action === "Call").length;
  const raiseHands = positionRecords.filter((record) => record.action === "Raise").length;
  const foldHands = positionRecords.filter((record) => record.action === "Fold").length;
  const checkHands = positionRecords.filter((record) => record.action === "Check").length;

  return {
    position,
    totalHands,
    vpipHands,
    vpipPercent: percent(vpipHands, totalHands),
    pfrHands,
    pfrPercent: percent(pfrHands, totalHands),
    callHands,
    callPercent: percent(callHands, totalHands),
    raiseHands,
    raisePercent: percent(raiseHands, totalHands),
    foldHands,
    checkHands,
  };
}

export function calculateVpipStats(records: VpipHandRecord[]): VpipStats {
  const totalHands = records.length;
  const vpipHands = records.filter((record) => isVpipAction(record.action)).length;
  const pfrHands = records.filter((record) => isPfrAction(record.action)).length;
  const callHands = records.filter((record) => record.action === "Call").length;
  const raiseHands = records.filter((record) => record.action === "Raise").length;
  const foldHands = records.filter((record) => record.action === "Fold").length;
  const checkHands = records.filter((record) => record.action === "Check").length;
  const byPosition = Object.fromEntries(
    VPIP_POSITIONS.map((position) => [position, statsForPosition(position, records)]),
  ) as Record<VpipPosition, PositionStats>;
  const playedPositions = VPIP_POSITIONS.map((position) => byPosition[position]).filter((item) => item.totalHands > 0);
  const mostPlayedPosition = [...playedPositions].sort((a, b) => b.totalHands - a.totalHands)[0]?.position;
  const loosestPosition = [...playedPositions].sort((a, b) => b.vpipPercent - a.vpipPercent || b.totalHands - a.totalHands)[0]?.position;
  const tightestPosition = [...playedPositions].sort((a, b) => a.vpipPercent - b.vpipPercent || b.totalHands - a.totalHands)[0]?.position;

  return {
    totalHands,
    vpipHands,
    vpipPercent: percent(vpipHands, totalHands),
    pfrHands,
    pfrPercent: percent(pfrHands, totalHands),
    callHands,
    callPercent: percent(callHands, totalHands),
    raiseHands,
    raisePercent: percent(raiseHands, totalHands),
    foldHands,
    foldPercent: percent(foldHands, totalHands),
    checkHands,
    checkPercent: percent(checkHands, totalHands),
    byPosition,
    mostPlayedPosition,
    loosestPosition,
    tightestPosition,
  };
}

export function getVpipAdvice(stats: VpipStats) {
  const advice: string[] = [];

  if (stats.totalHands < 20) {
    advice.push("样本还少，先记录到 50 手再判断趋势。");
  }
  if (stats.vpipPercent > 35) {
    advice.push("当前 VPIP 偏高。你可能正在用“技术优势”给边缘牌找入池理由。");
  } else if (stats.vpipPercent >= 22) {
    advice.push("当前 VPIP 中等偏松。注意区分后位进攻和前位乱入池。");
  } else if (stats.vpipPercent < 15 && stats.totalHands >= 20) {
    advice.push("当前 VPIP 偏紧。纪律很好，但也可能错过后位攻击弱玩家的机会。");
  }

  const earlyPositionLoose = (["UTG", "MP"] as const).some((position) => {
    const positionStats = stats.byPosition[position];
    return positionStats.totalHands >= 5 && positionStats.vpipPercent > 20;
  });
  if (earlyPositionLoose) {
    advice.push("前位入池偏高。多人桌前位应该更克制，不要用“我可以操作”解释边缘牌。");
  }

  const sbStats = stats.byPosition.SB;
  if (sbStats.totalHands >= 5 && sbStats.vpipPercent > 30) {
    advice.push("小盲位入池偏高。你可能在用差位置防守尊严。");
  }

  const latePositionLoose = (["BTN", "CO"] as const).some((position) => {
    const positionStats = stats.byPosition[position];
    return positionStats.totalHands >= 5 && positionStats.vpipPercent > 45;
  });
  if (latePositionLoose) {
    advice.push("后位 VPIP 偏高可以接受，但要确保目标是老板或娱乐玩家，而不是和 reg 互相折磨。");
  }

  if (stats.vpipPercent - stats.pfrPercent > 15) {
    advice.push("你可能跟注偏多、主动加注偏少。考虑减少被动入池，多用更强范围主动隔离弱玩家。");
  }
  if (stats.totalHands >= 20 && stats.vpipPercent >= 15 && stats.vpipPercent <= 35 && stats.raisePercent > stats.callPercent) {
    advice.push("你的主动性不错。继续确认加注对象是弱玩家，而不是在和高手打 ego war。");
  }

  return advice;
}
