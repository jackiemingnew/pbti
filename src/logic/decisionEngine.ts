import type { Answer, Character, DecisionModifier, DecisionParams, DecisionResult, PokerScenario } from "../types";

const clampScore = (score: number) => Math.max(0, Math.min(12, Number(score.toFixed(2))));
const clampStat = (score: number) => Math.max(0, Math.min(10, Number(score.toFixed(2))));

function mergeModifiers(params: DecisionParams, selectedAnswers: Answer[]) {
  const modified: DecisionParams = { ...params };
  const bonuses = {
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
      modified[key] = Math.max(0, Math.min(10, modified[key] + (modifiers[key] ?? 0)));
    }
    bonuses.raiseScoreBonus += modifiers.raiseScoreBonus ?? 0;
    bonuses.callScoreBonus += modifiers.callScoreBonus ?? 0;
    bonuses.checkScoreBonus += modifiers.checkScoreBonus ?? 0;
    bonuses.chicken += modifiers.chicken ?? 0;
    bonuses.money += modifiers.money ?? 0;
    bonuses.skill += modifiers.skill ?? 0;
  }

  return { params: modified, bonuses };
}

function chooseSizing(action: DecisionResult["action"], scenario: PokerScenario, params: DecisionParams, character: Character) {
  if (action === "Check") return scenario.opponentAction.toLowerCase().includes("bet") ? "Fold 被替换为保守 Call" : "0";
  if (action === "Call") {
    if (scenario.opponentAction.toLowerCase().includes("2/3")) return "Call 2/3 Pot";
    if (scenario.opponentAction.toLowerCase().includes("1/2")) return "Call 1/2 Pot";
    return "Call";
  }

  if (character.id === "boss-whale" && character.stats && character.stats.money > 9) return params.handStrength > 8 ? "Pot" : "1/2 Pot";
  if (params.drawPotential > 8 && params.foldEquity > 5) return "2.5x";
  if (params.handStrength > 8.5 || params.trapPotential > 7.5) return "2.5x";
  if (params.foldEquity > 7) return "1/2 Pot";
  return "1/3 Pot";
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
    if (scenario.opponentAction.toLowerCase().includes("2/3")) return "Call 2/3 Pot";
    if (scenario.opponentAction.toLowerCase().includes("1/2")) return "Call 1/2 Pot";
    return roll % 2 === 0 ? "Call 命运底池" : "跟注一袋风";
  }
  if (roll >= 98) return "All-in";
  if (roll >= 90) return "Pot";
  if (roll >= 76) return "1/2 Pot";
  return "1/3 Pot";
}

function generateDestinyDecision(character: Character, scenario: PokerScenario, selectedAnswers: Answer[], destinyRoll?: number): DecisionResult {
  const baseRoll = destinyRoll ?? Math.floor(Math.random() * 100) + 1;
  const answerSeed = destinySeedFromAnswers(selectedAnswers);
  const roll = ((baseRoll + answerSeed - 1) % 100) + 1;
  const facingBet = scenario.opponentAction.toLowerCase().includes("bet");
  const action: DecisionResult["action"] = roll >= 67 ? "Raise" : roll >= 34 || facingBet ? "Call" : "Check";

  const scoreBreakdown =
    action === "Raise"
      ? { checkScore: facingBet ? 0 : clampScore(2 + (100 - roll) / 30), callScore: clampScore(4 + (100 - roll) / 22), raiseScore: clampScore(7 + roll / 20) }
      : action === "Call"
        ? { checkScore: facingBet ? 0 : clampScore(4 + Math.abs(50 - roll) / 30), callScore: clampScore(8 + Math.abs(50 - roll) / 40), raiseScore: clampScore(3 + roll / 30) }
        : { checkScore: clampScore(8 + (34 - roll) / 8), callScore: clampScore(4 + roll / 18), raiseScore: clampScore(2 + roll / 25) };

  const key = action.toLowerCase() as "check" | "call" | "raise";
  const answerLabels = selectedAnswers.map((answer) => `「${answer.label}」`).join("、");

  return {
    action,
    sizing: destinySizing(action, scenario, roll),
    scoreBreakdown,
    voiceLine: character.voiceLines[key],
    reasoning: `天命人不看鸡、钱、术。他本手先掷出命运底数 ${baseRoll}，再把你的回答 ${answerLabels} 折算成荒诞扰动，得到天命波动 ${roll}。数字越高越容易把筹码往前推。`,
    riskWarning: `这不是牌理建议，而是随机娱乐机制。${roll >= 90 ? "本次命运很躁，下注尺度会明显偏大。" : "本次数字只代表小游戏里的命运噪声。"} `,
    personalityBias: character.bias,
    destinyRoll: roll,
  };
}

export function generateDecision(character: Character, scenario: PokerScenario, selectedAnswers: Answer[], destinyRoll?: number): DecisionResult {
  if (character.decisionMode === "destiny") {
    return generateDestinyDecision(character, scenario, selectedAnswers, destinyRoll);
  }

  if (!character.stats) {
    throw new Error(`${character.name} 缺少 PBTI 三维属性，无法使用公式决策。`);
  }

  const { params, bonuses } = mergeModifiers(scenario.params, selectedAnswers);
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
    bonuses.raiseScoreBonus;

  let callScore =
    params.handStrength * 0.25 +
    params.potOdds * 0.22 +
    stats.money * 0.22 +
    stats.skill * 0.12 +
    params.opponentAggression * 0.1 +
    params.showdownValue * 0.1 +
    bonuses.callScoreBonus;

  let checkScore =
    (10 - stats.chicken) * 0.22 +
    params.uncertainty * 0.25 +
    params.showdownValue * 0.16 +
    params.trapPotential * 0.18 +
    stats.skill * 0.08 +
    bonuses.checkScoreBonus;

  const facingBet = scenario.opponentAction.toLowerCase().includes("bet");
  if (facingBet) {
    checkScore = -1;
    callScore += 0.7;
  }

  if (character.id === "bluff-assassin") raiseScore += params.foldEquity > 5 ? 0.9 : -0.5;
  if (character.id === "boss-whale") callScore += 1.1;
  if (character.id === "gto-tank") {
    callScore += params.potOdds > 6 ? 0.6 : 0;
    raiseScore += params.positionAdvantage > 7 ? 0.4 : 0;
  }
  if (character.id === "soul-reader") checkScore += params.uncertainty > 6 ? 0.4 : 0;

  const scoreBreakdown = {
    checkScore: clampScore(checkScore),
    callScore: clampScore(callScore),
    raiseScore: clampScore(raiseScore),
  };

  let action: DecisionResult["action"] = "Check";
  if (scoreBreakdown.raiseScore >= scoreBreakdown.callScore && scoreBreakdown.raiseScore >= scoreBreakdown.checkScore) action = "Raise";
  else if (scoreBreakdown.callScore >= scoreBreakdown.checkScore) action = "Call";
  if (facingBet && action === "Check") action = "Call";

  const key = action.toLowerCase() as "check" | "call" | "raise";
  const bestReason =
    action === "Raise"
      ? `Raise 分最高：${character.name} 的鸡瘾值把 fold equity、听牌潜力和位置优势转化成主动压力。`
      : action === "Call"
        ? `Call 分最高：当前牌力、赔率和钞能力足够支撑继续看下一步剧情。`
        : `Check 分最高：不确定性、陷阱可能和术流控池价值超过主动施压收益。`;

  return {
    action,
    sizing: chooseSizing(action, scenario, params, character),
    scoreBreakdown,
    voiceLine: character.voiceLines[key],
    reasoning: `${bestReason} 你的回答改变了鸡 / 钱 / 术或牌局参数，因此这不是标准 GTO 输出，而是 ${character.archetype} 的 PBTI 人格决策。`,
    riskWarning: riskText(action, scenario, params, character),
    personalityBias: character.bias,
  };
}
