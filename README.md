# 牌桌人格：一手入魂

一个娱乐化的德州扑克人格决策小游戏。玩家选择一个虚构牌桌人格，输入自己的 OpenAI API key 后，系统通过 OpenAI 生成本手题库，玩家回答后由本地决策引擎生成 Check / Call / Raise 建议。

## 技术栈

- React + TypeScript
- Vite
- Tailwind CSS
- 纯前端静态站点
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

项目不会把 OpenAI API key 写进源码。用户需要在页面里输入自己的 key：

- key 只保存在当前浏览器会话的 `sessionStorage`
- 不提交到 GitHub
- 不经过自建后端
- 由浏览器直接请求 OpenAI API

可选模型配置：

```bash
VITE_OPENAI_MODEL=gpt-4.1-mini
```

如果不配置，默认使用 `gpt-4.1-mini`。

注意：纯前端模式更适合个人项目、演示和 GitHub Pages 部署。用户输入的 key 会出现在自己浏览器发出的网络请求里，这是纯前端直连 API 的天然限制。

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
```

`data/characters.ts` 中仍保留本地 fallback 题库；当 OpenAI 请求失败或用户未填写 key 时，页面会临时使用 fallback，避免游戏流程中断。

免责声明：本游戏仅用于娱乐与策略思维训练，不构成赌博建议。
