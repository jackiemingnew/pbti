# PBTI 项目结构说明

本文档用于快速理解《PBTI：牌桌行为人格测试》的代码组织、核心数据流和后续扩展位置。

## 项目概览

这是一个基于 React + TypeScript + Vite + Tailwind CSS 的纯前端小游戏项目，同时保留了一个轻量题库生成 API：

- 本地开发时，Vite 插件在 `/api/generate-questions` 提供题库接口。
- 部署到 Vercel 时，`api/generate-questions.ts` 作为 Serverless Function 提供同名接口。
- 前端不写死 OpenAI Key，服务端从 `OPENAI_API_KEY` 环境变量读取。
- 题库 Prompt 支持在页面内配置，并存储到浏览器 `localStorage`。
- 首页进入后会预加载并缓存题库，降低玩家选择角色后的等待时间。

## 根目录结构

```text
.
├── api/
│   └── generate-questions.ts
├── public/
│   └── avatars/
├── server/
│   └── openaiQuestions.ts
├── src/
│   ├── components/
│   ├── config/
│   ├── data/
│   ├── logic/
│   ├── services/
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   ├── types.ts
│   └── vite-env.d.ts
├── .env.example
├── index.html
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## 关键文件职责

### 应用入口

| 文件 | 职责 |
| --- | --- |
| `src/main.tsx` | React 应用挂载入口。 |
| `src/App.tsx` | 当前 MVP 的主流程容器，包含首页、题目回答流、结果页、Prompt 配置页。 |
| `src/index.css` | Tailwind 入口和全局视觉样式，例如赌场背景、阴影等。 |

`App.tsx` 是目前最核心的文件，负责：

- 角色选择。
- 随机 1-2 个问题。
- 题库读取、预加载、缓存和 fallback。
- 结果生成。
- Prompt 配置保存与恢复默认。
- 彩蛋模式。

### 类型定义

| 文件 | 职责 |
| --- | --- |
| `src/types.ts` | 全局核心类型，包括 `Character`、`Question`、`Answer`、`DecisionParams`、`DecisionResult` 等。 |

当前角色体系已经从旧四维改为 PBTI 三维：

- `chicken`：鸡瘾值，偏主动下注、raise、bluff。
- `money`：钞能力，偏跟注、扛波动、买剧情。
- `skill`：技术流，偏赔率、范围、下注尺度和理论判断。

特殊角色 `天命人悟空` 使用 `decisionMode: "destiny"`，不显示基础三维，而是通过每手随机的 `destinyRoll` 和答案里的 `destinySeed` 决策。

### 数据层

| 文件 | 职责 |
| --- | --- |
| `src/data/characters.ts` | 角色 mock/config 数据，包括角色属性、头像、默认问题、台词和人格偏差。 |
| `src/data/scenarios.ts` | 旧牌局场景数据，当前主 MVP 不再依赖具体牌局，但文件仍可用于未来牌局识别页或测试模式。 |
| `public/avatars/` | 角色头像静态资源。 |

当前主路径不展示牌局本身，而是：

1. 首页介绍玩法。
2. 玩家选择角色。
3. 系统生成 1-2 个问题。
4. 玩家回答。
5. 系统给出弃牌 / 过牌 / 跟注 / 加注风格结果。

### 组件层

| 文件 | 职责 |
| --- | --- |
| `src/components/CharacterCard.tsx` | 角色卡片和头像展示。当前 `App.tsx` 主要复用了其中的 `CharacterAvatar`。 |
| `src/components/ResultCard.tsx` | 决策结果展示，包括 Action、下注尺度、台词、理由、风险和分数。 |
| `src/components/ActionChip.tsx` | Action 视觉标签。 |
| `src/components/StatBar.tsx` | 属性条组件。 |
| `src/components/QuestionPanel.tsx` | 旧题目面板组件，可作为后续拆分 `App.tsx` 的参考。 |
| `src/components/PlayingCard.tsx` | 扑克牌文字块展示。 |
| `src/components/PokerTable.tsx` | 旧牌局桌面展示组件，未来可用于图片识别/牌局校准页面。 |

当前 `App.tsx` 内仍有一些页面级组件，如 `HomePage`、`PromptAdminPage`、`ResultFlow` 等。后续如果继续扩展，可以逐步迁移到 `src/components/` 或新增 `src/pages/`。

### 决策逻辑

| 文件 | 职责 |
| --- | --- |
| `src/logic/decisionEngine.ts` | 纯函数决策引擎，根据角色、离线场景参数、玩家答案和天命随机数生成 `DecisionResult`。 |

普通角色使用公式决策：

- `Raise` 更受 `chicken`、`skill`、`foldEquity`、`drawPotential`、`positionAdvantage` 影响。
- `Call` 更受 `handStrength`、`potOdds`、`money`、`opponentAggression`、`showdownValue` 影响。
- `Check` 更受低鸡瘾、不确定性、摊牌价值、陷阱潜力影响。
- `Fold` 更受弱牌力、差赔率、高不确定性和低钞能力影响。

天命人使用随机机制：

1. 每手开始生成 `destinyRoll`。
2. 玩家答案通过 `destinySeed` 产生扰动。
3. 最终数字映射为弃牌 / 过牌 / 跟注 / 加注。

### 题库与 OpenAI 链路

| 文件 | 职责 |
| --- | --- |
| `src/config/questionPrompt.ts` | 默认题库 Prompt 和天命人荒诞题 Prompt。 |
| `src/services/questionApi.ts` | 前端题库请求入口，优先请求 `/api/generate-questions`，必要时可走浏览器端 fallback key。 |
| `src/services/questionFormat.ts` | OpenAI 返回结果的 JSON Schema、解析和 normalize。 |
| `src/services/questionCache.ts` | 浏览器本地题库缓存、去重、最近使用记录和 TTL 管理。 |
| `server/openaiQuestions.ts` | 服务端调用 OpenAI Responses API 的通用函数，本地 Vite 和 Vercel API 共用。 |
| `api/generate-questions.ts` | Vercel Serverless API，读取 `OPENAI_API_KEY` 后调用 `server/openaiQuestions.ts`。 |
| `vite.config.ts` | 本地开发时注册 `/api/generate-questions` 中间件，并注入 OpenAI Key 后四位用于 UI 指示。 |

题库生成流程：

```text
首页进入
  -> App.tsx 后台预加载各角色题库
  -> questionCache.ts 读取本地缓存
  -> 缓存不足时 questionApi.ts 请求 /api/generate-questions
  -> 本地开发走 vite.config.ts 中间件
  -> Vercel 部署走 api/generate-questions.ts
  -> server/openaiQuestions.ts 调用 OpenAI Responses API
  -> questionFormat.ts 校验/解析/normalize
  -> questionCache.ts 写入 localStorage
```

缓存策略：

- 缓存 key 包含角色 id、全局 Prompt、天命 Prompt 的 hash。
- TTL 为 12 小时。
- 每个角色、每种题目数量最多保留 4 组。
- 最近用过的问题组会记录 signature，避免同一人格连续重复拿到同一组题。
- 首页会并发预加载，优先准备 1 题组，再准备 2 题组。

### 配置与环境变量

| 文件 | 职责 |
| --- | --- |
| `.env.example` | 环境变量示例。 |
| `vite.config.ts` | 读取本地 `.env.local` / 环境变量。 |
| `api/generate-questions.ts` | Vercel 上读取项目环境变量。 |

建议环境变量：

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
```

注意：

- 不要把真实 key 写入源码。
- `.env.local` 应该只存在本地，并保持被 git ignore。
- Vercel 部署时在项目 Environment Variables 中配置 `OPENAI_API_KEY`。

## 页面与状态流

当前页面状态由 `App.tsx` 的 `page` 控制：

```ts
type Page = "home" | "result" | "promptAdmin";
```

### `home`

展示：

- PBTI 核心概念。
- 玩法说明。
- 角色选择。
- 随机人格按钮。
- Prompt 配置入口。
- 可选彩蛋模式。

### `result`

这个页面实际包含两个阶段：

1. 题目阶段：展示当前角色、题目和答案按钮。
2. 结果阶段：回答完成后点击揭晓，展示最终决策。

### `promptAdmin`

展示两个可编辑 Prompt：

- 全局题库 Prompt。
- 天命人荒诞题 Prompt。

保存后写入 `localStorage`：

- `pbti-question-prompt`
- `pbti-destiny-question-prompt`

## 本地开发命令

```bash
npm install
npm run dev
npm run check
npm run build
```

如果本机 `node` / `npm` 不在 PATH 中，可以使用 Codex 工作区提供的 Node runtime，或先安装 Node.js。

## 构建与部署

本项目适合部署到 Vercel：

1. 连接 GitHub 仓库。
2. Framework 选择 Vite。
3. 配置环境变量 `OPENAI_API_KEY`。
4. Build Command 使用 `npm run build`。
5. Output Directory 使用 `dist`。

部署后，前端会调用同域 `/api/generate-questions`，由 Vercel Serverless Function 负责访问 OpenAI。

## 后续扩展建议

### 拆分页面

如果 `App.tsx` 继续变大，建议新增：

```text
src/pages/
├── HomePage.tsx
├── ResultFlowPage.tsx
└── PromptAdminPage.tsx
```

### 牌局识别二级页

未来图片识别/牌局校准功能可以新增：

```text
src/pages/TableScanPage.tsx
src/components/CardCalibrationPanel.tsx
src/services/visionApi.ts
api/recognize-table.ts
```

建议流程：

1. 上传或拍照。
2. 视觉模型返回手牌、公共牌、位置、下注信息候选。
3. UI 用可视化卡片让用户校准。
4. 校准结果转成 `PokerScenario`。
5. 再进入 PBTI 决策或另一个策略页面。

### 更多角色

新增角色只需要修改 `src/data/characters.ts`：

- 普通角色需要 `stats: { chicken, money, skill }`。
- 特殊随机角色可以设置 `decisionMode: "destiny"`。
- 头像放到 `public/avatars/`，并在 `avatarImage` 引用 `/avatars/xxx.png`。

### 更多决策机制

普通 PBTI 公式在 `src/logic/decisionEngine.ts` 中。可以新增：

- exploit 型权重。
- 根据玩家历史偏好微调。
- 更细的下注尺度。
- 结果文案多版本随机池。

## 安全边界

本项目只做娱乐与策略思维训练：

- 不接入真钱、支付、下注或赌博系统。
- 不承诺盈利。
- OpenAI Key 只应放在服务端环境变量，不应写入前端源码。
- 前端页面底部保留免责声明。
