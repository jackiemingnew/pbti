import type { Character } from "../types";

const pressureAnswers = [
  {
    id: "pressure-real",
    label: "他像是真的有强牌",
    modifiers: { opponentAggression: 1.2, uncertainty: 1, foldEquity: -1.2, callScoreBonus: 0.4 },
  },
  {
    id: "pressure-fake",
    label: "他在讲故事，压力不自然",
    modifiers: { foldEquity: 1.6, read: 0.8, raiseScoreBonus: 1.1 },
  },
  {
    id: "pressure-cap",
    label: "他范围被封顶，顶多一对",
    modifiers: { foldEquity: 1.2, positionAdvantage: 0.8, raiseScoreBonus: 0.8 },
  },
  {
    id: "pressure-blurry",
    label: "我看不出来，先控池",
    modifiers: { uncertainty: 1.4, showdownValue: 0.8, checkScoreBonus: 0.9 },
  },
];

const barrelAnswers = [
  {
    id: "barrel-yes",
    label: "敢，Turn 继续开火",
    modifiers: { courage: 1, foldEquity: 1, raiseScoreBonus: 1 },
  },
  {
    id: "barrel-no",
    label: "不敢，打一枪就收",
    modifiers: { uncertainty: 1.2, checkScoreBonus: 0.8 },
  },
  {
    id: "barrel-card",
    label: "只在好转牌继续",
    modifiers: { technique: 1, drawPotential: 0.8, callScoreBonus: 0.4, raiseScoreBonus: 0.3 },
  },
  {
    id: "barrel-value",
    label: "我更多是价值下注",
    modifiers: { handStrength: 1.2, showdownValue: 0.7, callScoreBonus: 0.6 },
  },
];

export const characters: Character[] = [
  {
    id: "king-chow",
    name: "赌王周润发",
    archetype: "全能压迫型",
    stats: { courage: 9, technique: 8, bankroll: 9, read: 9 },
    description: "他不是单纯莽，而是有气场、有判断、有资金承压能力的全能玩家。",
    avatarStyle: "from-amber-300 via-yellow-700 to-zinc-950",
    questions: [
      {
        id: "king-q1",
        text: "你觉得对手是真的强，还是只是想让你相信他强？",
        answers: pressureAnswers,
      },
      {
        id: "king-q2",
        text: "如果你现在加注，他有没有能力继续跟？",
        answers: [
          { id: "king-follow-yes", label: "他会跟，但会很难受", modifiers: { callScoreBonus: 0.5, raiseScoreBonus: 0.5 } },
          { id: "king-follow-no", label: "他大概率顶不住", modifiers: { foldEquity: 1.5, raiseScoreBonus: 1.2 } },
          { id: "king-follow-rich", label: "他筹码够深，不怕压力", modifiers: { foldEquity: -1, opponentAggression: 0.9, callScoreBonus: 0.7 } },
          { id: "king-follow-trap", label: "他可能在等我加注", modifiers: { trapPotential: 1.4, checkScoreBonus: 1 } },
        ],
      },
    ],
    voiceLines: {
      check: "真正的高手，不急着亮剑。",
      call: "我先看看，你的故事还能不能讲下去。",
      raise: "牌不是最重要的，重要的是他相信你有什么牌。",
    },
    bias: "容易过度相信自己可以掌控牌桌。",
  },
  {
    id: "bluff-assassin",
    name: "偷鸡王",
    archetype: "诈唬刺客型",
    stats: { courage: 10, technique: 7, bankroll: 5, read: 8 },
    description: "他擅长发现对手不舒服的节点，然后用下注压力逼对手弃牌。",
    avatarStyle: "from-red-500 via-zinc-950 to-amber-600",
    questions: [
      {
        id: "bluff-q1",
        text: "对手像不像在等你下注后弃牌？",
        answers: [
          { id: "folding-hard", label: "很像，他的牌很尴尬", modifiers: { foldEquity: 2, raiseScoreBonus: 1.4 } },
          { id: "calling-station", label: "不像，他今天不爱弃牌", modifiers: { foldEquity: -2, bankroll: 0.6, callScoreBonus: 1 } },
          { id: "nervous", label: "他动作很虚，但还没崩", modifiers: { read: 1, foldEquity: 0.8, raiseScoreBonus: 0.8 } },
          { id: "unknown-bluff", label: "读不清，别硬演", modifiers: { uncertainty: 1.3, checkScoreBonus: 0.7 } },
        ],
      },
      { id: "bluff-q2", text: "如果你现在开火，Turn 还敢继续开第二枪吗？", answers: barrelAnswers },
    ],
    voiceLines: {
      check: "今天这只鸡还没熟，先不偷。",
      call: "他想赶我走，但我偏要看看。",
      raise: "你不是没牌，你是没有勇气跟我到河牌。",
    },
    bias: "容易高估对手弃牌率，尤其容易对老板型玩家 bluff 太多。",
  },
  {
    id: "boss-whale",
    name: "老板板板",
    archetype: "娱乐巨鲸型",
    stats: { courage: 9, technique: 3, bankroll: 10, read: 3 },
    description: "资金厚，爱玩，喜欢看牌，不喜欢轻易弃牌。",
    avatarStyle: "from-fuchsia-500 via-amber-600 to-zinc-950",
    questions: [
      {
        id: "boss-q1",
        text: "这手牌有没有节目效果？",
        answers: [
          { id: "showtime", label: "太有节目了，观众要看", modifiers: { bankroll: 1.2, courage: 1, callScoreBonus: 1.1 } },
          { id: "boring", label: "没意思，别乱花钱", modifiers: { uncertainty: 0.8, checkScoreBonus: 0.9 } },
          { id: "hero-moment", label: "赢了能吹一晚上", modifiers: { raiseScoreBonus: 1, callScoreBonus: 0.8 } },
          { id: "expensive-show", label: "节目可以有，但别太贵", modifiers: { potOdds: 1, callScoreBonus: 0.7 } },
        ],
      },
      {
        id: "boss-q2",
        text: "你是不是觉得他在偷你？",
        answers: [
          { id: "stealing-me", label: "就是在偷我", modifiers: { opponentAggression: 1, callScoreBonus: 1.3, raiseScoreBonus: 0.5 } },
          { id: "not-sure-boss", label: "不知道，但我想看", modifiers: { bankroll: 1.5, callScoreBonus: 1 } },
          { id: "real-hand-boss", label: "他可能真有", modifiers: { foldEquity: -1, callScoreBonus: 0.4 } },
          { id: "punish-boss", label: "他敢偷我就惩罚他", modifiers: { courage: 1, raiseScoreBonus: 1 } },
        ],
      },
    ],
    voiceLines: {
      check: "先免费看一张，不急。",
      call: "钱不是问题，我就是想看看你到底有没有。",
      raise: "我加注，不是因为我懂，是因为我开心。",
    },
    bias: "低估长期损失，高估娱乐价值。",
  },
  {
    id: "soul-reader",
    name: "读人大师",
    archetype: "心理捕手型",
    stats: { courage: 6, technique: 8, bankroll: 7, read: 10 },
    description: "关注对手动作、节奏、表情、下注方式是否自然。",
    avatarStyle: "from-cyan-400 via-slate-900 to-amber-500",
    questions: [
      {
        id: "reader-q1",
        text: "对手这个下注节奏自然吗？",
        answers: [
          { id: "natural-strong", label: "很自然，像强牌", modifiers: { opponentAggression: 1.2, callScoreBonus: 0.6 } },
          { id: "too-fast", label: "太快了，像预设剧本", modifiers: { read: 1.2, foldEquity: 1, raiseScoreBonus: 0.9 } },
          { id: "too-slow", label: "太慢了，像在演", modifiers: { uncertainty: 0.6, read: 1.1, callScoreBonus: 0.7 } },
          { id: "no-read", label: "看不出来，别脑补", modifiers: { uncertainty: 1.2, checkScoreBonus: 0.8 } },
        ],
      },
      {
        id: "reader-q2",
        text: "他是在保护牌，还是在表演强牌？",
        answers: [
          { id: "protecting", label: "更像保护中等强牌", modifiers: { showdownValue: 0.8, callScoreBonus: 0.8 } },
          { id: "acting", label: "更像表演强牌", modifiers: { foldEquity: 1, raiseScoreBonus: 0.9 } },
          { id: "nuts-reader", label: "像坚果牌在钓鱼", modifiers: { trapPotential: 1.4, checkScoreBonus: 0.9 } },
          { id: "mixed-reader", label: "两边都有，先收集信息", modifiers: { uncertainty: 1, callScoreBonus: 0.6 } },
        ],
      },
    ],
    voiceLines: {
      check: "信息还不够，先让他自己说话。",
      call: "你嘴上没说话，但你的筹码已经说了。",
      raise: "你这个故事，破绽太多了。",
    },
    bias: "容易过度解读随机动作，把普通动作解释成心理信号。",
  },
  {
    id: "gto-tank",
    name: "GTO 战车",
    archetype: "理论机器型",
    stats: { courage: 8, technique: 10, bankroll: 8, read: 4 },
    description: "不太看脸色，主要根据范围、赔率、位置、下注尺度和频率做决策。",
    avatarStyle: "from-zinc-200 via-zinc-800 to-amber-500",
    questions: [
      {
        id: "gto-q1",
        text: "这张牌更有利于你的范围，还是对手的范围？",
        answers: [
          { id: "range-hero", label: "更有利于我", modifiers: { positionAdvantage: 1, foldEquity: 0.8, raiseScoreBonus: 0.8 } },
          { id: "range-villain", label: "更有利于对手", modifiers: { uncertainty: 1, checkScoreBonus: 0.8 } },
          { id: "range-neutral", label: "基本中性", modifiers: { technique: 0.8, callScoreBonus: 0.5 } },
          { id: "range-unsure", label: "范围判断不清", modifiers: { uncertainty: 1.2, checkScoreBonus: 0.6 } },
        ],
      },
      {
        id: "gto-q2",
        text: "你的手牌在自己范围里属于 value、bluff，还是 bluff catcher？",
        answers: [
          { id: "value", label: "Value", modifiers: { handStrength: 1.5, raiseScoreBonus: 0.9 } },
          { id: "bluff", label: "Bluff 候选", modifiers: { drawPotential: 1.1, foldEquity: 1, raiseScoreBonus: 0.8 } },
          { id: "catcher", label: "Bluff catcher", modifiers: { showdownValue: 1.2, callScoreBonus: 1 } },
          { id: "trash", label: "范围底部", modifiers: { uncertainty: 1, checkScoreBonus: 0.8 } },
        ],
      },
    ],
    voiceLines: {
      check: "这手牌有摊牌价值，不需要把池子做大。",
      call: "赔率允许，范围允许，跟注。",
      raise: "我不是相信自己，我是相信频率。",
    },
    bias: "容易低估对手偏离理论的程度。",
  },
  {
    id: "destiny-fool",
    name: "天命人",
    archetype: "随机玄学型",
    decisionMode: "destiny",
    description: "他不看胆术粮眼，也不看 GTO。先问一个弱智吧式问题，再把你的回答丢进天命随机数里。",
    avatarStyle: "from-lime-300 via-amber-500 to-red-950",
    questions: [
      {
        id: "destiny-q1",
        text: "如果冰箱门关上以后里面的灯还亮着，那它是在偷看你的牌吗？",
        answers: [
          { id: "fridge-spy", label: "当然，它是冰箱位玩家", modifiers: { destinySeed: 17 } },
          { id: "fridge-dark", label: "不亮，因为它已经弃牌了", modifiers: { destinySeed: 31 } },
          { id: "fridge-schrodinger", label: "只要不打开，亮和不亮同时存在", modifiers: { destinySeed: 53 } },
          { id: "fridge-allin", label: "灯不重要，先 All-in 再说", modifiers: { destinySeed: 79 } },
        ],
      },
      {
        id: "destiny-q2",
        text: "薯片袋里一半是空气，那你吃完薯片以后算不算吃了一袋风？",
        answers: [
          { id: "wind-value", label: "算，风味很足", modifiers: { destinySeed: 11 } },
          { id: "wind-bluff", label: "不算，那是包装在诈唬", modifiers: { destinySeed: 29 } },
          { id: "wind-call", label: "算一半，所以跟半池", modifiers: { destinySeed: 47 } },
          { id: "wind-raise", label: "空气免费，应该加注收费", modifiers: { destinySeed: 83 } },
        ],
      },
    ],
    voiceLines: {
      check: "天命说先别动，可能牌桌正在加载运势。",
      call: "随机数点头了，跟一下看看宇宙怎么发牌。",
      raise: "数字已经起飞，筹码只是它的尾焰。",
    },
    bias: "完全不尊重牌理，容易把随机波动解释成命运安排。",
  },
];
