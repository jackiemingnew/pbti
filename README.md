# PBTI：牌桌行为人格测试

Poker Behavior Type Indicator，一个娱乐化的单人德州扑克行为人格测试 / 决策游戏。

玩家选择一个虚构牌桌人格后，回答 1-2 个随机问题，系统会结合角色特性和回答内容生成牌桌行动：弃牌 / 过牌 / 跟注 / 加注。

## PBTI 三维

- 鸡：你有多想偷。
- 钱：你有多敢看。
- 术：你有多会把冲动包装成理论。

天命人悟空是三界之外角色，不显示基础三维；每轮决策开始时生成 `destinyRoll`，通过 Destiny System 决定行动倾向。

## 技术栈

- React + TypeScript
- Vite
- Tailwind CSS
- Vercel Serverless API + 前端静态页面
- 无登录、无数据库、无真钱、无支付系统

## 本地运行

```bash
npm install
npm run dev
```

然后打开 Vite 输出的本地地址，通常是：

```text
http://localhost:5173/
```

检查和构建：

```bash
npm run check
npm run build
```

## API Key

项目不会把 OpenAI API key 写进前端源码。请在 `.env.local` 或 Vercel Project Environment Variables 里配置服务端变量：

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
```

前端只请求同域接口：

```text
/api/generate-questions
```

该接口由服务端读取 `OPENAI_API_KEY`，不会把 key 暴露给浏览器。若接口不可用，页面会使用 `data/characters.ts` 中的本地 fallback 题库，保证游戏流程不中断。

可选模型配置：

```bash
OPENAI_MODEL=gpt-4.1-mini
VITE_OPENAI_MODEL=gpt-4.1-mini
```

如果不配置，默认使用 `gpt-4.1-mini`。Vercel 服务端优先使用 `OPENAI_MODEL`。

### 本地 ClashX 代理

如果本地服务端报 `fetch failed`，通常是 Node 服务没有走 ClashX 代理。可以在启动本地服务前设置：

```bash
HTTPS_PROXY=http://127.0.0.1:7890 npm run dev
```

或把下面这行加入被 Git 忽略的 `.env.local`：

```bash
HTTPS_PROXY=http://127.0.0.1:7890
```

Vercel 线上部署通常不需要设置 `HTTPS_PROXY`。

## GitHub / 静态部署

构建：

```bash
npm run build
```

产物在：

```text
dist/
```

推荐部署到 Vercel，这样 `/api/generate-questions` 会作为 Serverless Function 工作。

## 代码结构

```text
src/
  App.tsx
  main.tsx
  index.css
  components/
    ActionChip.tsx
    CharacterCard.tsx
    ResultCard.tsx
  data/
    characters.ts
    scenarios.ts
  logic/
    decisionEngine.ts
  services/
    questionApi.ts
    questionCache.ts
    questionFormat.ts
  config/
    questionPrompt.ts
  types.ts
api/
  generate-questions.ts
server/
  openaiQuestions.ts
public/
  avatars/
```

## 生成人格图鉴头像

项目提供一次性素材生成脚本。它只在本地 Node 进程中读取 `OPENAI_API_KEY`，不会进入 Vite 前端代码或浏览器。

```bash
npm run generate:pbti-avatars
```

默认跳过已经存在的图片。需要重新生成全部头像时：

```bash
npm run generate:pbti-avatars -- --force
```

只生成一个指定人格：

```bash
npm run generate:pbti-avatars -- --only=鸡豪术
npm run generate:pbti-avatars -- --only=ji-hao-shu.png
```

可选配置：

```bash
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_IMAGE_QUALITY=low
```

`low` 适合网页卡片并且生成较快；需要更高精度的重绘素材时可设为 `medium`。

生成目录：

```text
public/avatars/profiles/
```

对应文件：

```text
ji-hao-shu.png
ji-hao-feng.png
ji-jin-shu.png
ji-jin-feng.png
wen-hao-shu.png
wen-hao-feng.png
wen-jin-shu.png
wen-jin-feng.png
```

手工绘制替换时，保持相同文件名放入该目录即可。页面在文件缺失或加载失败时会自动显示渐变 fallback 卡片。

免责声明：本游戏仅用于娱乐与策略思维训练，不构成赌博建议。
