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
  courage?: number;
  technique?: number;
  bankroll?: number;
  read?: number;
  destinySeed?: number;
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
    courage: number;
    technique: number;
    bankroll: number;
    read: number;
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
  action: "Check" | "Call" | "Raise";
  sizing: string;
  scoreBreakdown: {
    checkScore: number;
    callScore: number;
    raiseScore: number;
  };
  voiceLine: string;
  reasoning: string;
  riskWarning: string;
  personalityBias: string;
  destinyRoll?: number;
};
