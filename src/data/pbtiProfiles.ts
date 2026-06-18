import type { PbtiProfileCode } from "../logic/pbtiClassifier";

export type PbtiProfile = {
  code: PbtiProfileCode;
  title: string;
  alias: string;
  vibeDescription: string;
  representative: string;
  tagline: string;
  shortDescription: string;
  longDescription: string;
  warning: string;
  deathPattern: string;
  axisSummary: {
    first: string;
    second: string;
    third: string;
  };
  avatar: string;
  accent: string;
};

export const pbtiProfiles: PbtiProfile[] = [
  {
    code: "鸡豪术",
    title: "三街鬼才",
    alias: "BLUFF-R",
    vibeDescription: "会讲三条街故事的诈唬大师",
    representative: "加强版 Tom Dwan",
    tagline: "空气牌，也得有完整世界观。",
    shortDescription: "敢偷、敢打大池，还能给每一次冲动补上一套理论。",
    longDescription: "你敢偷、敢打大池，也经常能用技术理由包装自己的进攻。你不是在随便诈唬，你是在写一部对手不一定看得懂的三条街小说。",
    warning: "技术优势不是入池许可证，加注也不是解决所有问题的默认按钮。",
    deathPattern: "故事讲得太高级，老板拿第三对一路买票看到结局。",
    axisSummary: {
      first: "鸡｜主动进攻倾向更强",
      second: "豪｜更敢承受筹码波动",
      third: "术｜更依赖技术理由和下注结构",
    },
    avatar: "/avatars/profiles/ji-hao-shu.png",
    accent: "from-red-500 via-amber-400 to-yellow-200",
  },
  {
    code: "鸡豪风",
    title: "豪门火山",
    alias: "BOOM-R",
    vibeDescription: "上头爆炸、说冲就冲",
    representative: "有钱上头哥",
    tagline: "风一来，底池先喷发。",
    shortDescription: "顺风时是全桌发动机，逆风时也能把自己点成烟花。",
    longDescription: "你敢打、敢看，也容易相信风向。顺风时你像全桌发动机，逆风时你可能变成烟花。",
    warning: "不是每一次感觉来了都值得把底池做大。",
    deathPattern: "不是被对手打败，是被自己的节目效果打败。",
    axisSummary: {
      first: "鸡｜喜欢主动点燃底池",
      second: "豪｜愿意为感觉承受波动",
      third: "风｜更相信气氛、直觉和剧情",
    },
    avatar: "/avatars/profiles/ji-hao-feng.png",
    accent: "from-orange-600 via-red-500 to-fuchsia-400",
  },
  {
    code: "鸡谨术",
    title: "冷面鸡刺客",
    alias: "SNEAK-R",
    vibeDescription: "精打细算的偷鸡专家",
    representative: "低成本偷鸡专家",
    tagline: "预算不多，杀气很足。",
    shortDescription: "专挑高性价比的偷鸡窗口，下注不大，眼神很贵。",
    longDescription: "你想偷，也会偷，但讲究性价比。你喜欢用小注、位置和 fold equity 拿下底池，不太愿意无脑打大池。",
    warning: "别为了省成本，把每一次偷鸡都设计成半吊子的故事。",
    deathPattern: "想用最小成本偷最大一只鸡，结果被 check-raise 教做人。",
    axisSummary: {
      first: "鸡｜会主动寻找偷鸡窗口",
      second: "谨｜偏爱低成本、可撤退的路线",
      third: "术｜重视位置、频率和弃牌率",
    },
    avatar: "/avatars/profiles/ji-jin-shu.png",
    accent: "from-cyan-500 via-zinc-500 to-amber-300",
  },
  {
    code: "鸡谨风",
    title: "听风偷鸡客",
    alias: "VIBE-R",
    vibeDescription: "看风向、靠手感开火",
    representative: "灵感型诈唬怪",
    tagline: "风说能偷，他就信了。",
    shortDescription: "靠风向找开火时机，灵感来得快，证据来得慢。",
    longDescription: "你会看风向开火。风起时你敢偷，风停时你会藏，但你的直觉有时会把一点点机会放大成天命。",
    warning: "风向不是证据，感觉不是赔率。",
    deathPattern: "风没起来，鸡也没偷到，自己先被吹下桌。",
    axisSummary: {
      first: "鸡｜有机会就想主动拿池",
      second: "谨｜火力有限，随时准备撤退",
      third: "风｜主要读取气氛和临场手感",
    },
    avatar: "/avatars/profiles/ji-jin-feng.png",
    accent: "from-teal-400 via-sky-400 to-violet-400",
  },
  {
    code: "稳豪术",
    title: "白衣控桌者",
    alias: "CTRL",
    vibeDescription: "从容控场，像桌面管理员",
    representative: "发哥赌神型",
    tagline: "不急着出手，桌子已经归他管。",
    shortDescription: "筹码和技术都够用，最大的动作通常只是让别人先犯错。",
    longDescription: "你有钞能力，也有技术，但不急着表演。你不是没攻击性，你只是知道什么时候筹码该动，什么时候让别人先犯错。",
    warning: "不要过度相信自己的气场，不是所有人都会读你的故事。",
    deathPattern: "气场拉满，结果老板根本没在怕，只是在看牌。",
    axisSummary: {
      first: "稳｜更偏向控池和选择性出手",
      second: "豪｜能够承受必要的筹码波动",
      third: "术｜依赖范围、尺度和局面控制",
    },
    avatar: "/avatars/profiles/wen-hao-shu.png",
    accent: "from-slate-200 via-amber-300 to-zinc-500",
  },
  {
    code: "稳豪风",
    title: "千金看客",
    alias: "ATM-er",
    vibeDescription: "用筹码买剧情的人",
    representative: "老板 Tan Xuan 型",
    tagline: "不是跟注，是续费大结局。",
    shortDescription: "不一定爱偷，但一定想知道对手到底有没有。",
    longDescription: "你不一定爱诈唬，但很爱看结局。你愿意用筹码买剧情，也容易把“我想知道”误认为“我应该跟注”。",
    warning: "买票看结局可以，但别每一集都买 VIP。",
    deathPattern: "一晚上看了 47 次，终于看见钱包没了。",
    axisSummary: {
      first: "稳｜通常不主动制造大冲突",
      second: "豪｜愿意花筹码购买剧情真相",
      third: "风｜决策容易被好奇心和氛围带走",
    },
    avatar: "/avatars/profiles/wen-hao-feng.png",
    accent: "from-fuchsia-500 via-yellow-300 to-emerald-300",
  },
  {
    code: "稳谨术",
    title: "铁律修士",
    alias: "RULE-R",
    vibeDescription: "纪律、结构、范围守护者",
    representative: "GTO 修士",
    tagline: "心可以乱，频率不能乱。",
    shortDescription: "纪律、理论、低波动，连上头都得先经过范围审批。",
    longDescription: "你纪律强、理论强、波动低。你很少暴毙，但可能也会因为过度谨慎，错过一些薄价值和高 EV 进攻机会。",
    warning: "理论救了你很多次，也可能偷走你一些价值。",
    deathPattern: "活着，但盲注慢慢流血。",
    axisSummary: {
      first: "稳｜克制冲动，优先减少大错",
      second: "谨｜严格管理筹码和波动",
      third: "术｜信任范围、赔率和规则结构",
    },
    avatar: "/avatars/profiles/wen-jin-shu.png",
    accent: "from-zinc-300 via-blue-400 to-amber-300",
  },
  {
    code: "稳谨风",
    title: "牌桌隐士",
    alias: "HIDE-R",
    vibeDescription: "低调回避风险的安静观察者",
    representative: "谨慎观光客",
    tagline: "事故没参加，价值也没赶上。",
    shortDescription: "不惹事、不冒险，坐得很久，筹码悄悄少。",
    longDescription: "你不太爱偷，不太敢看，也更多依赖感觉判断风险。你通常不会制造大事故，但也很难主动创造高价值 spot。",
    warning: "不犯大错不等于持续盈利，长期不争取好 spot 也是一种漏损。",
    deathPattern: "没有暴毙，但筹码被一圈一圈磨掉。",
    axisSummary: {
      first: "稳｜习惯避开主动冲突",
      second: "谨｜把风险控制放在第一位",
      third: "风｜更多依赖感觉判断危险",
    },
    avatar: "/avatars/profiles/wen-jin-feng.png",
    accent: "from-emerald-500 via-zinc-500 to-sky-300",
  },
];

export const pbtiProfileMap = Object.fromEntries(pbtiProfiles.map((profile) => [profile.code, profile])) as Record<PbtiProfileCode, PbtiProfile>;

export function getPbtiProfile(code: PbtiProfileCode) {
  return pbtiProfileMap[code];
}
