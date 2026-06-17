import type { Answer, Character, DecisionModifier, DecisionParams, DecisionResult, PokerScenario } from "../types";

const clampScore = (score: number) => Math.max(0, Math.min(12, Number(score.toFixed(2))));
const clampStat = (score: number) => Math.max(0, Math.min(10, Number(score.toFixed(2))));

function mergeModifiers(params: DecisionParams, selectedAnswers: Answer[]) {
  const modified: DecisionParams = { ...params };
  const paramDeltas = Object.keys(params).reduce((acc, key) => {
    acc[key as keyof DecisionParams] = 0;
    return acc;
  }, {} as DecisionParams);
  const bonuses = {
    foldScoreBonus: 0,
    raiseScoreBonus: 0,
    callScoreBonus: 0,
    checkScoreBonus: 0,
    chicken: 0,
    money: 0,
    skill: 0,
  };

  for (const answer of selectedAnswers) {
    const modifiers = answer.modifiers as DecisionModifier;
    for (const key of Object.keys(params) as Array<keyof DecisionParams>) {
      const delta = modifiers[key] ?? 0;
      paramDeltas[key] += delta;
      modified[key] = Math.max(0, Math.min(10, modified[key] + delta));
    }
    bonuses.raiseScoreBonus += modifiers.raiseScoreBonus ?? 0;
    bonuses.callScoreBonus += modifiers.callScoreBonus ?? 0;
    bonuses.checkScoreBonus += modifiers.checkScoreBonus ?? 0;
    bonuses.foldScoreBonus += modifiers.foldScoreBonus ?? 0;
    bonuses.chicken += modifiers.chicken ?? 0;
    bonuses.money += modifiers.money ?? 0;
    bonuses.skill += modifiers.skill ?? 0;
  }

  return { params: modified, bonuses, paramDeltas };
}

function chooseSizing(action: DecisionResult["action"], scenario: PokerScenario, params: DecisionParams, character: Character) {
  if (action === "Fold") return "弃牌";
  if (action === "Check") return "0";
  if (action === "Call") {
    if (scenario.opponentAction.toLowerCase().includes("2/3")) return "跟注 2/3 Pot";
    if (scenario.opponentAction.toLowerCase().includes("1/2")) return "跟注 1/2 Pot";
    return "跟注";
  }

  if (character.id === "boss-whale" && character.stats && character.stats.money > 9) return params.handStrength > 8 ? "Pot" : "1/2 Pot";
  if (params.drawPotential > 8 && params.foldEquity > 5) return "2.5x";
  if (params.handStrength > 8.5 || params.trapPotential > 7.5) return "2.5x";
  if (params.foldEquity > 7) return "1/2 Pot";
  return "1/3 Pot";
}

function commonDeathText(action: DecisionResult["action"], character: Character) {
  if (character.deathPatterns?.length) return character.deathPatterns[0];
  if (character.id === "bluff-assassin") return "三街小说写太长，对手却是自动跟注机。";
  if (character.id === "boss-whale") return "把每一手都当节目投资，最后发现自己赞助了全桌。";
  if (action === "Raise") return "把普通冲动包装成读牌灵感，结果被人用强牌收租。";
  if (action === "Call") return "嘴上说买信息，实际一路买到河牌还没计划。";
  if (action === "Fold") return "过度避险，把能争取的小底池也让给别人。";
  return "控池控到失去主动权，免费牌把局面变复杂。";
}

function riskText(action: DecisionResult["action"], scenario: PokerScenario, params: DecisionParams, character: Character) {
  if (action === "Raise") {
    return `${character.name} 的鸡瘾会放大波动；如果对手不是会弃牌的人，${scenario.title} 可能变成高方差脑腐局。`;
  }
  if (action === "Call") {
    return `跟注保留剧情，但钞能力不是免死金牌。注意 pot odds、后续街压力和自己是否真的有计划。`;
  }
  return `过牌能控池，但可能错过 fold equity 或价值下注机会。别让免费牌反噬你的术流判断。`;
}

function destinySeedFromAnswers(selectedAnswers: Answer[]) {
  return selectedAnswers.reduce((seed, answer, index) => {
    const modifierSeed = answer.modifiers.destinySeed ?? 0;
    const textSeed = Array.from(answer.id + answer.label).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return seed + modifierSeed + textSeed * (index + 1);
  }, 0);
}

function destinySizing(action: DecisionResult["action"], scenario: PokerScenario, roll: number) {
  if (action === "Check") return "0";
  if (action === "Call") {
    if (scenario.opponentAction.toLowerCase().includes("2/3")) return "跟注 2/3 Pot";
    if (scenario.opponentAction.toLowerCase().includes("1/2")) return "跟注 1/2 Pot";
    return roll % 2 === 0 ? "跟注命运底池" : "跟注一袋风";
  }
  if (action === "Fold") return "弃牌";
  if (roll >= 98) return "All-in";
  if (roll >= 90) return "Pot";
  if (roll >= 76) return "1/2 Pot";
  return "1/3 Pot";
}

function destinyStatus(roll: number) {
  if (roll >= 98) return "三界之外";
  if (roll >= 90) return "天命爆发";
  if (roll >= 67) return "筋斗云起飞";
  if (roll >= 34) return "猴毛试探";
  if (roll >= 17) return "原地画圈";
  return "紧箍咒收紧";
}

function destinyEffect(action: DecisionResult["action"], roll: number) {
  if (action === "Raise") return roll >= 90 ? "命运把下注尺度推高，本轮明显偏躁。" : "命运鼓励主动施压，用离谱答案给加注找理由。";
  if (action === "Call") return "命运选择继续看剧情，随机数允许你付费围观下一幕。";
  if (action === "Check") return "命运暂时按住筹码，让牌桌自己先说话。";
  return "命运让你退出本轮，不解释，解释就是玄学。";
}

function destinySpecialEvent(roll: number) {
  if (roll >= 98) return "齐天大圣 All-in 幻觉";
  if (roll === 66) return "六六大顺但不保证顺";
  if (roll <= 5) return "紧箍咒强制冷静";
  return undefined;
}

function generateDestinyDecision(character: Character, scenario: PokerScenario, selectedAnswers: Answer[], destinyRoll?: number): DecisionResult {
  const baseRoll = destinyRoll ?? Math.floor(Math.random() * 100) + 1;
  const answerSeed = destinySeedFromAnswers(selectedAnswers);
  const roll = ((baseRoll + answerSeed - 1) % 100) + 1;
  const facingBet = scenario.opponentAction.toLowerCase().includes("bet");
  const action: DecisionResult["action"] = roll >= 67 ? "Raise" : roll >= 34 || facingBet ? "Call" : roll >= 17 ? "Check" : "Fold";

  const scoreBreakdown =
    action === "Raise"
      ? { checkScore: facingBet ? 0 : clampScore(2 + (100 - roll) / 30), callScore: clampScore(4 + (100 - roll) / 22), raiseScore: clampScore(7 + roll / 20), foldScore: 0 }
      : action === "Call"
        ? { checkScore: facingBet ? 0 : clampScore(4 + Math.abs(50 - roll) / 30), callScore: clampScore(8 + Math.abs(50 - roll) / 40), raiseScore: clampScore(3 + roll / 30), foldScore: 0 }
        : action === "Check"
          ? { checkScore: clampScore(8 + (34 - roll) / 8), callScore: clampScore(4 + roll / 18), raiseScore: clampScore(2 + roll / 25), foldScore: 0 }
          : { checkScore: 0, callScore: 0, raiseScore: 0, foldScore: clampScore(8 + Math.abs(50 - roll) / 30) };

  const key = action.toLowerCase() as "check" | "call" | "raise";
  const answerLabels = selectedAnswers.map((answer) => `「${answer.label}」`).join("、");
  const status = destinyStatus(roll);
  const effect = destinyEffect(action, roll);
  const specialEventName = destinySpecialEvent(roll);

  return {
    action,
    sizing: destinySizing(action, scenario, roll),
    scoreBreakdown,
    voiceLine: action === "Fold" ? "这轮不属于我，先撤。" : character.voiceLines[key],
    reasoning: `天命人不看鸡、钱、术。他本手先掷出命运底数 ${baseRoll}，再把你的回答 ${answerLabels} 折算成荒诞扰动，得到天命波动 ${roll}。数字越高越容易把筹码往前推。`,
    riskWarning: `这不是牌理建议，而是随机娱乐机制。${roll >= 90 ? "本次命运很躁，下注尺度会明显偏大。" : "本次数字只代表小游戏里的命运噪声。"} `,
    personalityBias: character.bias,
    commonDeath: commonDeathText(action, character),
    destiny: {
      roll,
      status,
      effect,
      specialEventName,
    },
    destinyRoll: roll,
    destinyStatus: status,
    destinyEffect: effect,
    specialEventName,
  };
}

export function generateDecision(character: Character, scenario: PokerScenario, selectedAnswers: Answer[], destinyRoll?: number): DecisionResult {
  if (character.decisionMode === "destiny") {
    return generateDestinyDecision(character, scenario, selectedAnswers, destinyRoll);
  }

  if (!character.stats) {
    throw new Error(`${character.name} 缺少 PBTI 三维属性，无法使用公式决策。`);
  }

  const { params, bonuses, paramDeltas } = mergeModifiers(scenario.params, selectedAnswers);
  const stats = {
    chicken: clampStat(character.stats.chicken + bonuses.chicken),
    money: clampStat(character.stats.money + bonuses.money),
    skill: clampStat(character.stats.skill + bonuses.skill),
  };

  let raiseScore =
    stats.chicken * 0.35 +
    stats.skill * 0.18 +
    params.foldEquity * 0.25 +
    params.drawPotential * 0.15 +
    params.positionAdvantage * 0.12 -
    params.opponentAggression * 0.08 +
    bonuses.raiseScoreBonus * 2.35 +
    bonuses.chicken * 0.55 +
    bonuses.skill * 0.2 +
    paramDeltas.foldEquity * 0.55 +
    paramDeltas.drawPotential * 0.25 +
    paramDeltas.positionAdvantage * 0.2 -
    paramDeltas.opponentAggression * 0.35;

  let callScore =
    params.handStrength * 0.25 +
    params.potOdds * 0.22 +
    stats.money * 0.22 +
    stats.skill * 0.12 +
    params.opponentAggression * 0.1 +
    params.showdownValue * 0.1 +
    bonuses.callScoreBonus * 2.15 +
    bonuses.money * 0.45 +
    paramDeltas.potOdds * 0.5 +
    paramDeltas.showdownValue * 0.25 +
    paramDeltas.opponentAggression * 0.15;

  let checkScore =
    (10 - stats.chicken) * 0.22 +
    params.uncertainty * 0.25 +
    params.showdownValue * 0.16 +
    params.trapPotential * 0.18 +
    stats.skill * 0.08 +
    bonuses.checkScoreBonus * 2.25 -
    bonuses.chicken * 0.4 +
    bonuses.skill * 0.25 +
    paramDeltas.uncertainty * 0.45 +
    paramDeltas.trapPotential * 0.25 +
    paramDeltas.showdownValue * 0.2;

  let foldScore =
    (10 - params.handStrength) * 0.20 +
    (10 - params.potOdds) * 0.18 +
    params.uncertainty * 0.18 +
    (10 - params.showdownValue) * 0.15 +
    params.opponentAggression * 0.12 +
    (10 - stats.chicken) * 0.10 +
    (10 - stats.money) * 0.07 +
    bonuses.foldScoreBonus * 2.5 -
    bonuses.money * 0.35 -
    bonuses.chicken * 0.3 +
    paramDeltas.uncertainty * 0.5 +
    paramDeltas.opponentAggression * 0.25 -
    paramDeltas.potOdds * 0.35 -
    paramDeltas.showdownValue * 0.2;

  const facingBet = scenario.opponentAction.toLowerCase().includes("bet");
  if (facingBet) {
    checkScore = -1;
    callScore += 0.7;
  }

  if (character.id === "bluff-assassin") raiseScore += params.foldEquity > 5 ? 0.55 : -0.35;
  if (character.id === "boss-whale") callScore += 0.25;
  if (character.id === "gto-tank") {
    callScore += params.potOdds > 6 ? 0.6 : 0;
    raiseScore += params.positionAdvantage > 7 ? 0.4 : 0;
  }
  if (character.id === "soul-reader") checkScore += params.uncertainty > 6 ? 0.4 : 0;

  const scoreBreakdown = {
    checkScore: clampScore(checkScore),
    callScore: clampScore(callScore),
    raiseScore: clampScore(raiseScore),
    foldScore: clampScore(foldScore),
  };

  let action: DecisionResult["action"] = "Check";
  if (scoreBreakdown.foldScore >= scoreBreakdown.raiseScore && scoreBreakdown.foldScore >= scoreBreakdown.callScore && scoreBreakdown.foldScore >= scoreBreakdown.checkScore) {
    action = "Fold";
  } else if (scoreBreakdown.raiseScore >= scoreBreakdown.callScore && scoreBreakdown.raiseScore >= scoreBreakdown.checkScore) {
    action = "Raise";
  } else if (scoreBreakdown.callScore >= scoreBreakdown.checkScore) {
    action = "Call";
  } else if (facingBet) {
    action = "Fold";
  }

  const key = action.toLowerCase() as "check" | "call" | "raise";
  const bestReason =
    action === "Raise"
      ? `加注分最高：${character.name} 的鸡瘾值把弃牌率、听牌潜力和位置优势转化成主动压力。`
      : action === "Call"
        ? `跟注分最高：当前牌力、赔率和钞能力足够支撑继续看下一步剧情。`
        : action === "Fold"
          ? `弃牌分最高：牌力偏弱、赔率不理想，${character.name} 选择弃牌等候下一手。`
          : `过牌分最高：不确定性、陷阱可能和术流控池价值超过主动施压收益。`;

  return {
    action,
    sizing: chooseSizing(action, scenario, params, character),
    scoreBreakdown,
    voiceLine: action === "Fold" ? "这轮不入戏，下一把再让人格上桌。" : character.voiceLines[key],
    reasoning: `${bestReason} 你的回答改变了鸡 / 钱 / 术或牌局参数，因此这不是标准 GTO 输出，而是 ${character.archetype} 的 PBTI 人格决策。`,
    riskWarning: riskText(action, scenario, params, character),
    personalityBias: character.bias,
    commonDeath: commonDeathText(action, character),
  };
}
