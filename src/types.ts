export type DecisionParams = {
  handStrength: number;
  drawPotential: number;
  positionAdvantage: number;
  opponentAggression: number;
  foldEquity: number;
  potOdds: number;
  uncertainty: number;
  showdownValue: number;
  trapPotential: number;
};

export type DecisionModifier = Partial<DecisionParams> & {
  chicken?: number;
  money?: number;
  skill?: number;
  destinySeed?: number;
  foldScoreBonus?: number;
  raiseScoreBonus?: number;
  callScoreBonus?: number;
  checkScoreBonus?: number;
};

export type Answer = {
  id: string;
  label: string;
  modifiers: DecisionModifier;
};

export type Question = {
  id: string;
  text: string;
  answers: Answer[];
};

export type Character = {
  id: string;
  name: string;
  archetype: string;
  decisionMode?: "formula" | "destiny";
  stats?: {
    chicken: number;
    money: number;
    skill: number;
  };
  description: string;
  questions: Question[];
  voiceLines: {
    check: string;
    call: string;
    raise: string;
  };
  bias: string;
  avatarStyle: string;
  avatarImage?: string;
};

export type PokerScenario = {
  id: string;
  title: string;
  heroHand: string;
  position: string;
  board: string;
  pot: number;
  opponentAction: string;
  situation: string;
  params: DecisionParams;
};

export type DecisionResult = {
  action: "Check" | "Call" | "Raise" | "Fold";
  sizing: string;
  scoreBreakdown: {
    checkScore: number;
    callScore: number;
    raiseScore: number;
    foldScore: number;
  };
  voiceLine: string;
  reasoning: string;
  riskWarning: string;
  personalityBias: string;
  destinyRoll?: number;
  easterEgg?: boolean;
};
