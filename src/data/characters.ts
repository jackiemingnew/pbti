import type { Character } from "../types";

const pressureAnswers = [
  {
    id: "story-fake",
    label: "他故事太薄，可以偷",
    modifiers: { foldEquity: 2.2, chicken: 1.6, raiseScoreBonus: 2.1, callScoreBonus: -0.5 },
  },
  {
    id: "story-real",
    label: "他像真的有牌",
    modifiers: { opponentAggression: 1.4, uncertainty: 1.2, chicken: -1.2, money: -0.6, foldScoreBonus: 1.4, checkScoreBonus: 0.8 },
  },
  {
    id: "story-priced",
    label: "价格合理，先买一张剧情票",
    modifiers: { potOdds: 1.5, money: 1.5, callScoreBonus: 2, raiseScoreBonus: -0.5 },
  },
  {
    id: "story-range",
    label: "从范围看他代表不了太多强牌",
    modifiers: { foldEquity: 1.8, skill: 1.4, raiseScoreBonus: 1.8 },
  },
];

const barrelAnswers = [
  {
    id: "barrel-always",
    label: "敢，Turn 继续讲第二章",
    modifiers: { chicken: 2.2, foldEquity: 1.5, raiseScoreBonus: 2.2, callScoreBonus: -0.6 },
  },
  {
    id: "barrel-good-card",
    label: "只在好转牌继续",
    modifiers: { skill: 1.6, drawPotential: 1.1, raiseScoreBonus: 1, callScoreBonus: 0.7 },
  },
  {
    id: "barrel-wallet",
    label: "先看价格，太贵就不演",
    modifiers: { money: -1, potOdds: 1, callScoreBonus: 1.2, checkScoreBonus: 0.7 },
  },
  {
    id: "barrel-nope",
    label: "不敢，打一枪就收",
    modifiers: { chicken: -2, uncertainty: 1.5, checkScoreBonus: 1.8, foldScoreBonus: 0.8 },
  },
];

export const characters: Character[] = [
  {
    id: "king-chow",
    name: "发哥控桌",
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
          { id: "king-folds", label: "他顶不住，会把中等牌丢掉", modifiers: { foldEquity: 2, chicken: 1.4, raiseScoreBonus: 2.1 } },
          { id: "king-calls", label: "他会跟，但价格能让他难受", modifiers: { money: 1, skill: 1, callScoreBonus: 1.3, raiseScoreBonus: 0.8 } },
          { id: "king-rich", label: "他也有钞能力，不怕波动", modifiers: { foldEquity: -1.4, opponentAggression: 1.2, callScoreBonus: 1.7, raiseScoreBonus: -0.8 } },
          { id: "king-trap", label: "他可能在等我把池子做大", modifiers: { trapPotential: 1.8, chicken: -1.2, checkScoreBonus: 2, foldScoreBonus: 0.6 } },
        ],
      },
    ],
    voiceLines: {
      check: "真正的控场，不急着把筹码推到台前。",
      call: "我先看看，你这段故事还能不能讲圆。",
      raise: "牌不是最重要的，重要的是他相信你有什么牌。",
    },
    bias: "容易过度相信自己可以掌控牌桌，把普通边缘点打成主角局。",
    deathPatterns: [
      "气场太满，把对手的坚果牌也当成了可被控场的群演。",
      "明明只是薄价值，最后打成了全桌都在看你表演的大片。",
      "用西装压迫对手，结果对手用摊牌教育你。",
      "太相信自己能读懂空气，忘了有人真的拿着牌。",
    ],
  },
  {
    id: "bluff-assassin",
    name: "三街鸡王",
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
          { id: "folding-hard", label: "很像，他的牌卡在中间", modifiers: { foldEquity: 2.5, chicken: 1.8, raiseScoreBonus: 2.4 } },
          { id: "calling-station", label: "不像，他今天按钮是焊死在 Call 上", modifiers: { foldEquity: -2.2, money: 1.2, callScoreBonus: 2, raiseScoreBonus: -1 } },
          { id: "nervous", label: "他动作很虚，但还没崩", modifiers: { foldEquity: 1.4, skill: 0.8, raiseScoreBonus: 1.5 } },
          { id: "unknown-bluff", label: "看不清，硬演会穿帮", modifiers: { chicken: -2, uncertainty: 1.8, checkScoreBonus: 2, foldScoreBonus: 0.8 } },
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
    deathPatterns: [
      "三街小说写太长，对手却是自动跟注机。",
      "把每张转牌都当第二枪授权书，最后河牌自己先没词了。",
      "空气牌写成史诗，结果老板花钱买了全本。",
      "偷鸡偷到监控底下，对手一摊牌你才发现自己是剧情素材。",
    ],
  },
  {
    id: "boss-whale",
    name: "老板买票",
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
          { id: "showtime", label: "太有节目了，必须看完", modifiers: { money: 2.2, callScoreBonus: 2.4, foldScoreBonus: -0.8 } },
          { id: "boring", label: "没意思，不给导演加预算", modifiers: { money: -2.4, chicken: -1.4, potOdds: -1.2, uncertainty: 1.8, checkScoreBonus: 2.2, foldScoreBonus: 2.2 } },
          { id: "hero-moment", label: "赢了能吹一晚上", modifiers: { chicken: 2.3, foldEquity: 1.4, money: 0.6, raiseScoreBonus: 2.5, callScoreBonus: -0.5 } },
          { id: "expensive-show", label: "节目可以有，但票价要合理", modifiers: { potOdds: 1.5, skill: 0.8, callScoreBonus: 1.8, checkScoreBonus: 0.6 } },
        ],
      },
      {
        id: "boss-q2",
        text: "你是不是觉得他在偷你的剧情版权？",
        answers: [
          { id: "stealing-me", label: "就是在偷我，抓他", modifiers: { opponentAggression: 1.2, money: 1.4, callScoreBonus: 2.2 } },
          { id: "not-sure-boss", label: "不知道，但我想看摊牌", modifiers: { money: 2, showdownValue: 1.2, callScoreBonus: 2 } },
          { id: "real-hand-boss", label: "他可能真有，别送太多", modifiers: { chicken: -1.8, money: -1.6, foldEquity: -1.5, uncertainty: 1.5, checkScoreBonus: 1.6, foldScoreBonus: 2 } },
          { id: "punish-boss", label: "偷我就加价惩罚", modifiers: { chicken: 2.2, foldEquity: 1.3, raiseScoreBonus: 2.5, callScoreBonus: -0.5 } },
        ],
      },
    ],
    voiceLines: {
      check: "先免费看一张，不急着充值。",
      call: "钱不是问题，我就是想看看你到底有没有。",
      raise: "我加注，不是因为我懂，是因为这集要有爆点。",
    },
    bias: "低估长期损失，高估娱乐价值，容易用钞能力买一段不划算的剧情。",
    deathPatterns: [
      "把每一手都当节目投资，最后发现自己赞助了全桌。",
      "嘴上说看一张，行动上直接续费到大结局。",
      "用钞能力买信息，买回来一句：你早该弃。",
      "觉得输赢无所谓，直到筹码盒开始替你有所谓。",
    ],
  },
  {
    id: "destiny-fool",
    name: "悟空改命",
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
    deathPatterns: [
      "把随机数当宇宙圣旨，赢了叫天命，输了叫劫数。",
      "三界之外不算赔率，回到牌桌才发现底池会算账。",
      "命运骰子一热，筹码就开始渡劫。",
      "明明是低频操作，硬说这是天庭批文。",
    ],
  },
];
