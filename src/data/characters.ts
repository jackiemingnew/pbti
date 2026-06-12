import type { Character } from "../types";

const pressureAnswers = [
  {
    id: "story-fake",
    label: "他故事太薄，可以偷",
    modifiers: { foldEquity: 1.5, chicken: 1, raiseScoreBonus: 1 },
  },
  {
    id: "story-real",
    label: "他像真的有牌",
    modifiers: { opponentAggression: 1.2, uncertainty: 0.8, chicken: -0.6, callScoreBonus: 0.4 },
  },
  {
    id: "story-priced",
    label: "价格合理，先买一张剧情票",
    modifiers: { potOdds: 1, money: 0.8, callScoreBonus: 0.8 },
  },
  {
    id: "story-range",
    label: "从范围看他代表不了太多强牌",
    modifiers: { foldEquity: 1, skill: 1, raiseScoreBonus: 0.8 },
  },
];

const barrelAnswers = [
  {
    id: "barrel-always",
    label: "敢，Turn 继续讲第二章",
    modifiers: { chicken: 1.4, foldEquity: 0.9, raiseScoreBonus: 1 },
  },
  {
    id: "barrel-good-card",
    label: "只在好转牌继续",
    modifiers: { skill: 1.2, drawPotential: 0.8, raiseScoreBonus: 0.4, callScoreBonus: 0.3 },
  },
  {
    id: "barrel-wallet",
    label: "先看价格，太贵就不演",
    modifiers: { money: -0.4, potOdds: 0.7, callScoreBonus: 0.5 },
  },
  {
    id: "barrel-nope",
    label: "不敢，打一枪就收",
    modifiers: { chicken: -1.2, uncertainty: 1, checkScoreBonus: 0.8 },
  },
];

export const characters: Character[] = [
  {
    id: "king-chow",
    name: "发哥 AA",
    archetype: "赌神控场者",
    stats: { chicken: 7, money: 8, skill: 8 },
    description: "他不一定每手都开火，但一旦决定施压，筹码、气场和牌理会一起进池。",
    avatarStyle: "from-amber-300 via-yellow-700 to-zinc-950",
    avatarImage: "/avatars/fage-aa.png",
    questions: [
      {
        id: "king-q1",
        text: "你觉得对手是真的强，还是只是希望你相信他强？",
        answers: pressureAnswers,
      },
      {
        id: "king-q2",
        text: "如果你现在主动加压，他有没有能力继续扛？",
        answers: [
          { id: "king-folds", label: "他顶不住，会把中等牌丢掉", modifiers: { foldEquity: 1.4, chicken: 0.8, raiseScoreBonus: 1 } },
          { id: "king-calls", label: "他会跟，但价格能让他难受", modifiers: { money: 0.5, skill: 0.7, raiseScoreBonus: 0.5 } },
          { id: "king-rich", label: "他也有钞能力，不怕波动", modifiers: { foldEquity: -1, opponentAggression: 0.8, callScoreBonus: 0.8 } },
          { id: "king-trap", label: "他可能在等我把池子做大", modifiers: { trapPotential: 1.3, chicken: -0.6, checkScoreBonus: 0.9 } },
        ],
      },
    ],
    voiceLines: {
      check: "真正的控场，不急着把筹码推到台前。",
      call: "我先看看，你这段故事还能不能讲圆。",
      raise: "牌不是最重要的，重要的是他相信你有什么牌。",
    },
    bias: "容易过度相信自己可以掌控牌桌，把普通边缘点打成主角局。",
  },
  {
    id: "bluff-assassin",
    name: "鸡王 TomDwan",
    archetype: "三条街小说家",
    stats: { chicken: 10, money: 4, skill: 7 },
    description: "他的鸡瘾值接近爆表，擅长把空气写成连续三街的长篇小说。",
    avatarStyle: "from-red-500 via-zinc-950 to-amber-600",
    avatarImage: "/avatars/bluff-king-27.png",
    questions: [
      {
        id: "bluff-q1",
        text: "对手现在像不像拿着一手想弃又舍不得弃的牌？",
        answers: [
          { id: "folding-hard", label: "很像，他的牌卡在中间", modifiers: { foldEquity: 2, chicken: 1.2, raiseScoreBonus: 1.4 } },
          { id: "calling-station", label: "不像，他今天按钮是焊死在 Call 上", modifiers: { foldEquity: -2, money: 0.8, callScoreBonus: 1 } },
          { id: "nervous", label: "他动作很虚，但还没崩", modifiers: { foldEquity: 0.9, skill: 0.5, raiseScoreBonus: 0.8 } },
          { id: "unknown-bluff", label: "看不清，硬演会穿帮", modifiers: { chicken: -1, uncertainty: 1.2, checkScoreBonus: 0.8 } },
        ],
      },
      { id: "bluff-q2", text: "如果你现在开火，Turn 还敢继续写第二章吗？", answers: barrelAnswers },
    ],
    voiceLines: {
      check: "今天这只鸡还没熟，先别掀锅盖。",
      call: "他想赶我走，但小说家不会第一章就下线。",
      raise: "你不是没牌，你是没有勇气跟我读到河牌。",
    },
    bias: "容易高估对手弃牌率，尤其容易对老板型玩家 bluff 太多。",
  },
  {
    id: "boss-whale",
    name: "老板板板",
    archetype: "剧情投资人",
    stats: { chicken: 6, money: 10, skill: 3 },
    description: "钞能力拉满，牌理可以不懂，但这手牌必须有节目效果。",
    avatarStyle: "from-fuchsia-500 via-amber-600 to-zinc-950",
    avatarImage: "/avatars/boss-money.png",
    questions: [
      {
        id: "boss-q1",
        text: "这手牌有没有值得花钱看的剧情？",
        answers: [
          { id: "showtime", label: "太有节目了，必须看完", modifiers: { money: 1.5, callScoreBonus: 1.1 } },
          { id: "boring", label: "没意思，不给导演加预算", modifiers: { money: -1, uncertainty: 0.8, checkScoreBonus: 0.9 } },
          { id: "hero-moment", label: "赢了能吹一晚上", modifiers: { chicken: 0.8, money: 0.8, raiseScoreBonus: 0.8, callScoreBonus: 0.6 } },
          { id: "expensive-show", label: "节目可以有，但票价要合理", modifiers: { potOdds: 1, skill: 0.4, callScoreBonus: 0.7 } },
        ],
      },
      {
        id: "boss-q2",
        text: "你是不是觉得他在偷你的剧情版权？",
        answers: [
          { id: "stealing-me", label: "就是在偷我，抓他", modifiers: { opponentAggression: 1, money: 1, callScoreBonus: 1.2 } },
          { id: "not-sure-boss", label: "不知道，但我想看摊牌", modifiers: { money: 1.4, callScoreBonus: 1 } },
          { id: "real-hand-boss", label: "他可能真有，别送太多", modifiers: { chicken: -0.8, foldEquity: -1, callScoreBonus: 0.3 } },
          { id: "punish-boss", label: "偷我就加价惩罚", modifiers: { chicken: 0.8, raiseScoreBonus: 0.9 } },
        ],
      },
    ],
    voiceLines: {
      check: "先免费看一张，不急着充值。",
      call: "钱不是问题，我就是想看看你到底有没有。",
      raise: "我加注，不是因为我懂，是因为这集要有爆点。",
    },
    bias: "低估长期损失，高估娱乐价值，容易用钞能力买一段不划算的剧情。",
  },
  {
    id: "soul-reader",
    name: "读牌脑补王",
    archetype: "细节显微镜",
    stats: { chicken: 4, money: 6, skill: 8 },
    description: "喜欢从节奏、下注尺度和牌面结构里找线索，偶尔会把普通动作解读成连续剧伏笔。",
    avatarStyle: "from-cyan-400 via-slate-900 to-amber-500",
    questions: [
      {
        id: "reader-q1",
        text: "对手这个下注节奏，像自然价值还是临时编剧？",
        answers: [
          { id: "natural-strong", label: "很自然，像价值牌", modifiers: { opponentAggression: 1, chicken: -0.6, callScoreBonus: 0.5 } },
          { id: "too-fast", label: "太快了，像预设剧本", modifiers: { foldEquity: 1, skill: 0.8, raiseScoreBonus: 0.8 } },
          { id: "too-slow", label: "太慢了，像在演强", modifiers: { uncertainty: 0.6, skill: 0.7, callScoreBonus: 0.7 } },
          { id: "no-read", label: "别脑补，回到赔率", modifiers: { uncertainty: 0.8, skill: 1, callScoreBonus: 0.4 } },
        ],
      },
      {
        id: "reader-q2",
        text: "这张公共牌更像帮了谁的范围？",
        answers: [
          { id: "hero-range", label: "更帮我，可以施压", modifiers: { positionAdvantage: 1, foldEquity: 0.8, raiseScoreBonus: 0.8 } },
          { id: "villain-range", label: "更帮对手，别硬闯", modifiers: { chicken: -0.8, uncertainty: 1, checkScoreBonus: 0.7 } },
          { id: "neutral-range", label: "中性牌，赔率说话", modifiers: { skill: 1, potOdds: 0.8, callScoreBonus: 0.6 } },
          { id: "trap-range", label: "双方都有强牌，警惕陷阱", modifiers: { trapPotential: 1.2, checkScoreBonus: 0.8 } },
        ],
      },
    ],
    voiceLines: {
      check: "信息还不够，先让牌桌自己说话。",
      call: "你的筹码节奏，已经比你的表情诚实。",
      raise: "你这个故事，牌面结构不支持。",
    },
    bias: "容易过度解读随机动作，把普通下注解释成心理信号。",
  },
  {
    id: "gto-tank",
    name: "GTO 战车",
    archetype: "术流计算器",
    stats: { chicken: 5, money: 7, skill: 10 },
    description: "不太看脸色，主要根据范围、赔率、位置、下注尺度和频率做决策。",
    avatarStyle: "from-zinc-200 via-zinc-800 to-amber-500",
    questions: [
      {
        id: "gto-q1",
        text: "这张牌更有利于你的范围，还是对手的范围？",
        answers: [
          { id: "range-hero", label: "更有利于我", modifiers: { skill: 1, positionAdvantage: 1, foldEquity: 0.8, raiseScoreBonus: 0.7 } },
          { id: "range-villain", label: "更有利于对手", modifiers: { chicken: -0.8, uncertainty: 1, checkScoreBonus: 0.8 } },
          { id: "range-neutral", label: "基本中性，看赔率", modifiers: { skill: 0.8, potOdds: 0.8, callScoreBonus: 0.5 } },
          { id: "range-unsure", label: "范围判断不清", modifiers: { uncertainty: 1.1, skill: -0.5, checkScoreBonus: 0.6 } },
        ],
      },
      {
        id: "gto-q2",
        text: "你的手牌在自己范围里更像什么？",
        answers: [
          { id: "value", label: "Value", modifiers: { handStrength: 1.5, skill: 0.6, raiseScoreBonus: 0.9 } },
          { id: "bluff", label: "Bluff 候选", modifiers: { drawPotential: 1.1, foldEquity: 1, chicken: 0.6, raiseScoreBonus: 0.8 } },
          { id: "catcher", label: "Bluff catcher", modifiers: { showdownValue: 1.2, potOdds: 0.8, callScoreBonus: 1 } },
          { id: "trash", label: "范围底部", modifiers: { chicken: -0.8, uncertainty: 1, checkScoreBonus: 0.8 } },
        ],
      },
    ],
    voiceLines: {
      check: "这手牌有摊牌价值，不需要把池子做大。",
      call: "赔率允许，范围允许，跟注。",
      raise: "我不是相信自己，我是相信频率。",
    },
    bias: "容易低估对手偏离理论的程度，把娱乐局打成训练软件。",
  },
  {
    id: "destiny-fool",
    name: "天命人悟空",
    archetype: "三界之外",
    decisionMode: "destiny",
    description: "他没有鸡、钱、术基础值。每手先掷出天命随机数，再用弱智吧式问题给命运一点离谱解释。",
    avatarStyle: "from-lime-300 via-amber-500 to-red-950",
    avatarImage: "/avatars/destiny-q3.png",
    questions: [
      {
        id: "destiny-q1",
        text: "如果冰箱门关上以后里面的灯还亮着，那它是在偷看你的手牌吗？",
        answers: [
          { id: "fridge-spy", label: "当然，它是冰箱位玩家", modifiers: { destinySeed: 17 } },
          { id: "fridge-fold", label: "不亮，因为它已经弃牌了", modifiers: { destinySeed: 31 } },
          { id: "fridge-box", label: "只要不打开，亮和不亮同时存在", modifiers: { destinySeed: 53 } },
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
