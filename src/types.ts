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
  deathPatterns: string[];
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
  commonDeath: string;
  destiny?: {
    roll?: number;
    status?: string;
    effect?: string;
    specialEventName?: string;
  };
  destinyRoll?: number;
  destinyStatus?: string;
  destinyEffect?: string;
  specialEventName?: string;
  easterEgg?: boolean;
};

export type PokerGameType = "holdem" | "omaha";
export type PokerGameMode = PokerGameType | "auto";

export type RecognizedPlayer = {
  id?: string;
  seat: string;
  holeCards: string[];
  stack?: string;
  isHero?: boolean;
};

export type RecognizedBoard = {
  id?: string;
  label: string;
  cards: string[];
};

export type PokerPhotoRecognition = {
  gameType: PokerGameType | "unknown";
  confidence: number;
  players: RecognizedPlayer[];
  boards: RecognizedBoard[];
  pot?: string;
  notes?: string[];
  warnings?: string[];
};
