import type { Answer, Character, DecisionModifier, DecisionParams, DecisionResult, PokerScenario } from "../types";

const clampScore = (score: number) => Math.max(0, Math.min(12, Number(score.toFixed(2))));

function mergeModifiers(params: DecisionParams, selectedAnswers: Answer[]) {
  const modified: DecisionParams = { ...params };
  const bonuses = {
    raiseScoreBonus: 0,
    callScoreBonus: 0,
    checkScoreBonus: 0,
    courage: 0,
    technique: 0,
    bankroll: 0,
    read: 0,
  };

  for (const answer of selectedAnswers) {
    const modifiers = answer.modifiers as DecisionModifier;
    for (const key of Object.keys(params) as Array<keyof DecisionParams>) {
      modified[key] = Math.max(0, Math.min(10, modified[key] + (modifiers[key] ?? 0)));
    }
    bonuses.raiseScoreBonus += modifiers.raiseScoreBonus ?? 0;
    bonuses.callScoreBonus += modifiers.callScoreBonus ?? 0;
    bonuses.checkScoreBonus += modifiers.checkScoreBonus ?? 0;
    bonuses.courage += modifiers.courage ?? 0;
    bonuses.technique += modifiers.technique ?? 0;
    bonuses.bankroll += modifiers.bankroll ?? 0;
    bonuses.read += modifiers.read ?? 0;
  }

  return { params: modified, bonuses };
}

function chooseSizing(action: DecisionResult["action"], scenario: PokerScenario, params: DecisionParams, character: Character) {
  if (action === "Check") return scenario.opponentAction.toLowerCase().includes("bet") ? "Fold 被替换为谨慎 Call" : "0";
  if (action === "Call") {
    if (scenario.opponentAction.toLowerCase().includes("2/3")) return "Call 2/3 Pot";
    if (scenario.opponentAction.toLowerCase().includes("1/2")) return "Call 1/2 Pot";
    return "Call";
  }

  if (character.id === "boss-whale" && character.stats && character.stats.bankroll > 9) return params.handStrength > 8 ? "Pot" : "1/2 Pot";
  if (params.drawPotential > 8 && params.foldEquity > 5) return "2.5x";
  if (params.handStrength > 8.5 || params.trapPotential > 7.5) return "2.5x";
  if (params.foldEquity > 7) return "1/2 Pot";
  return "1/3 Pot";
}

function riskText(action: DecisionResult["action"], scenario: PokerScenario, params: DecisionParams, character: Character) {
  if (action === "Raise") {
    return `${character.name} 的攻击会放大波动；如果对手不是会弃牌的人，${scenario.title} 可能变成高方差战役。`;
  }
  if (action === "Call") {
    return `跟注保留信息，但也可能让你在 Turn 面对更大的下注压力。注意 pot odds 和后续计划。`;
  }
  return `过牌能控池，但可能错过 fold equity 或价值下注机会。别让免费牌反噬你的优势。`;
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
  if (roll >= 78) return "1/2 Pot";
  return "1/3 Pot";
}

function generateDestinyDecision(character: Character, scenario: PokerScenario, selectedAnswers: Answer[]): DecisionResult {
  const answerSeed = destinySeedFromAnswers(selectedAnswers);
  const roll = ((Math.floor(Math.random() * 100) + answerSeed) % 100) + 1;
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
    reasoning: `天命人没有四维数值。他把你的回答 ${answerLabels} 折算成荒诞种子，再掷出天命随机数 ${roll}。数字越高越想把筹码往前推。`,
    riskWarning: `这不是牌理建议，而是随机娱乐机制。${roll >= 90 ? "本次数字很躁，下注尺度会明显偏大。" : "本次数字只代表小游戏里的命运噪声。"} `,
    personalityBias: character.bias,
    destinyRoll: roll,
  };
}

export function generateDecision(character: Character, scenario: PokerScenario, selectedAnswers: Answer[]): DecisionResult {
  if (character.decisionMode === "destiny") {
    return generateDestinyDecision(character, scenario, selectedAnswers);
  }

  if (!character.stats) {
    throw new Error(`${character.name} 缺少四维属性，无法使用公式决策。`);
  }

  const { params, bonuses } = mergeModifiers(scenario.params, selectedAnswers);
  const stats = {
    courage: Math.max(0, Math.min(10, character.stats.courage + bonuses.courage)),
    technique: Math.max(0, Math.min(10, character.stats.technique + bonuses.technique)),
    bankroll: Math.max(0, Math.min(10, character.stats.bankroll + bonuses.bankroll)),
    read: Math.max(0, Math.min(10, character.stats.read + bonuses.read)),
  };

  let raiseScore =
    stats.courage * 0.3 +
    stats.technique * 0.2 +
    stats.read * 0.2 +
    params.foldEquity * 0.25 +
    params.drawPotential * 0.15 +
    params.positionAdvantage * 0.1 -
    params.opponentAggression * 0.1 +
    bonuses.raiseScoreBonus;

  let callScore =
    params.handStrength * 0.25 +
    params.potOdds * 0.2 +
    stats.bankroll * 0.15 +
    stats.read * 0.15 +
    params.opponentAggression * 0.15 +
    params.showdownValue * 0.1 +
    bonuses.callScoreBonus;

  let checkScore =
    (10 - stats.courage) * 0.25 +
    params.uncertainty * 0.3 +
    params.showdownValue * 0.2 +
    params.trapPotential * 0.2 +
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
      ? `攻击分最高：${character.name} 将 fold equity、位置优势和人格胆量转化为压力。`
      : action === "Call"
        ? `跟注分最高：当前牌力、赔率或摊牌价值足够继续看下一步。`
        : `过牌分最高：不确定性和控池价值超过主动施压收益。`;

  return {
    action,
    sizing: chooseSizing(action, scenario, params, character),
    scoreBreakdown,
    voiceLine: character.voiceLines[key],
    reasoning: `${bestReason} 你的回答让参数产生了偏移，因此这不是标准 GTO 输出，而是 ${character.archetype} 的人格决策。`,
    riskWarning: riskText(action, scenario, params, character),
    personalityBias: character.bias,
  };
}
