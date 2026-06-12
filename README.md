# 牌桌人格：一手入魂

一个娱乐化的德州扑克人格决策小游戏。玩家选择一个虚构牌桌人格后，系统通过 OpenAI 生成本手题库，玩家回答后由本地决策引擎生成 Check / Call / Raise 建议。

首页展示 PBTI 四角色入口；“测试识别”页面可读取并预览牌局图片，预留未来视觉模型识别牌局信息。

## 技术栈

- React + TypeScript
- Vite
- Tailwind CSS
- Vercel Serverless API + 前端静态页面
- 无真钱或支付系统

## 本地运行

```bash
npm install
npm run dev
```

然后打开 Vite 输出的本地地址，通常是：

```text
http://localhost:5173/
```

如果当前 shell 找不到系统 `node` / `npm`，可以使用 Codex bundled Node 路径运行对应命令。

## API Key

项目不会把 OpenAI API key 写进源码。推荐在 `.env.local` 或 Vercel Project Environment Variables 里配置服务端变量：

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
```

部署到 Vercel 后，前端会请求：

```text
/api/generate-questions
```

该接口由服务端读取 `OPENAI_API_KEY`，不会把 key 暴露给浏览器。

本地如果只用 `vite dev`，Vite 不会自动运行 Vercel API 函数；可以使用 Vercel 本地开发环境，或在页面里输入个人 key 作为兜底：

- key 只保存在当前浏览器会话的 `sessionStorage`
- 不提交到 GitHub
- 仅当 `/api/generate-questions` 不可用时，才由浏览器直接请求 OpenAI API

可选模型配置：

```bash
OPENAI_MODEL=gpt-4.1-mini
VITE_OPENAI_MODEL=gpt-4.1-mini
```

如果不配置，默认使用 `gpt-4.1-mini`。Vercel 服务端优先使用 `OPENAI_MODEL`。

注意：浏览器兜底模式更适合个人项目和临时演示。用户输入的 key 会出现在自己浏览器发出的网络请求里，这是前端直连 API 的天然限制。

## GitHub / 静态部署

构建：

```bash
npm run build
```

产物在：

```text
dist/
```

可以部署到 GitHub Pages、Vercel、Netlify 或任意静态站点服务。

## 代码结构

```text
src/
  App.tsx
  main.tsx
  index.css
  components/
  data/
    characters.ts
    scenarios.ts
  logic/
    decisionEngine.ts
  services/
    questionApi.ts
  config/
    questionPrompt.ts
  types.ts
api/
  generate-questions.ts
public/
  avatars/
```

`data/characters.ts` 中仍保留本地 fallback 题库；当 OpenAI 请求失败或用户未填写 key 时，页面会临时使用 fallback，避免游戏流程中断。

免责声明：本游戏仅用于娱乐与策略思维训练，不构成赌博建议。
