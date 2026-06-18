import type { PokerGameMode, PokerPhotoRecognition } from "../src/types.js";

type VisionInput = {
  apiKey: string;
  model?: string;
  imageDataUrl: string;
  mode: PokerGameMode;
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      parsed?: unknown;
      json?: unknown;
    }>;
  }>;
  error?: {
    message?: string;
    code?: string;
    type?: string;
    param?: string;
  };
};

export class PokerVisionError extends Error {
  details?: {
    provider?: string;
    providerStatus?: number;
    code?: string;
    type?: string;
    param?: string;
    requestId?: string;
  };

  constructor(message: string, details?: PokerVisionError["details"]) {
    super(message);
    this.name = "PokerVisionError";
    this.details = details;
  }
}

let configuredProxyUrl = "";
const DEFAULT_TIMEOUT_MS = process.env.VERCEL ? 25000 : 18000;

export async function recognizePokerPhotoWithOpenAI({ apiKey, model, imageDataUrl, mode }: VisionInput): Promise<PokerPhotoRecognition> {
  await configureOptionalProxy();
  const response = await fetchOpenAI(apiKey, model, imageDataUrl, mode);
  const payload = (await response.json().catch(() => ({}))) as OpenAIResponse;

  if (!response.ok) {
    throw buildOpenAIError(response, payload);
  }

  const parsed = parseVisionPayload(payload);
  const recognition = normalizeRecognition(parsed);
  if (!recognition.players.length && !recognition.boards.length) {
    throw new PokerVisionError("视觉模型没有读出可用牌面，请换一张更清晰的照片或手动输入。", {
      provider: "openai",
      code: extractOutputText(payload) ? "empty_cards" : "empty_model_output",
    });
  }

  return recognition;
}

export function toPokerVisionErrorPayload(error: unknown) {
  if (error instanceof PokerVisionError) {
    return { error: error.message, details: error.details };
  }
  return { error: error instanceof Error ? error.message : "照片识别服务失败。" };
}

export function getPokerVisionErrorStatus(error: unknown) {
  if (!(error instanceof PokerVisionError)) return 500;
  const providerStatus = error.details?.providerStatus;
  if (!providerStatus) return 502;
  if (providerStatus === 429) return 429;
  if (providerStatus >= 500) return 502;
  if (providerStatus >= 400) return 400;
  return 500;
}

async function fetchOpenAI(apiKey: string, model: string | undefined, imageDataUrl: string, mode: PokerGameMode) {
  const timeoutMs = getPositiveIntegerEnv("OPENAI_VISION_TIMEOUT_MS", DEFAULT_TIMEOUT_MS, 2000, 25000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text:
                  "你是牌桌照片识别助手。只从图片中读取可见的正面扑克牌，不猜不可见牌。必须返回 JSON。牌面统一为 A♠、T♥、9♦、2♣ 格式。需要识别德州扑克/奥马哈；如果照片是奥马哈发两路、双牌面、run it twice、多路公共牌，把每一横排或每一路公共牌分别放入 boards，例如 第一路 / 第二路。公共牌优先于玩家手牌识别；即使无法确认玩家手牌，也要返回可见公共牌，并把不确定项写入 warnings。玩家手牌放入 players.holeCards；德州通常 2 张，奥马哈通常 4 张。不要因为牌被旋转、斜放或部分遮挡就返回空数组。",
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify({
                  task: "recognize_poker_table_photo",
                  requestedMode: mode,
                  specialCases: [
                    "Omaha double-board / 两路牌：通常有两行公共牌，请分别输出为 boards[0] 和 boards[1]",
                    "如果牌桌上有多组正面牌，先识别所有公共牌，再识别靠近玩家座位的手牌",
                    "图片中没有明确玩家手牌也可以 players 为空，但 boards 不能漏掉可见公共牌",
                  ],
                  outputRules: {
                    gameType: "holdem | omaha | unknown",
                    confidence: "0-1 number",
                    players: "array of { seat, holeCards, stack?, isHero? }",
                    boards: "array of { label, cards }；两路发牌用 第一路 / 第二路",
                    pot: "optional visible pot/chip text",
                    notes: "short readable notes",
                    warnings: "uncertain or blocked cards",
                  },
                }),
              },
              { type: "input_image", image_url: imageDataUrl, detail: "high" },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "poker_photo_recognition",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["gameType", "confidence", "players", "boards", "pot", "notes", "warnings"],
              properties: {
                gameType: { type: "string", enum: ["holdem", "omaha", "unknown"] },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                players: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["seat", "holeCards", "stack", "isHero"],
                    properties: {
                      seat: { type: "string" },
                      holeCards: { type: "array", items: { type: "string" } },
                      stack: { type: "string" },
                      isHero: { type: "boolean" },
                    },
                  },
                },
                boards: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["label", "cards"],
                    properties: {
                      label: { type: "string" },
                      cards: { type: "array", items: { type: "string" } },
                    },
                  },
                },
                pot: { type: "string" },
                notes: { type: "array", items: { type: "string" } },
                warnings: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
      }),
    });
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    throw new PokerVisionError(isAbort ? `OpenAI 视觉识别超时：超过 ${timeoutMs}ms 未返回。` : error instanceof Error ? `OpenAI 视觉识别失败：${error.message}` : "OpenAI 视觉识别失败。", {
      provider: "openai",
    });
  } finally {
    clearTimeout(timeout);
  }
}

function parseVisionPayload(payload: OpenAIResponse) {
  for (const parsed of extractParsedObjects(payload)) {
    if (parsed && typeof parsed === "object") return parsed as Partial<PokerPhotoRecognition>;
  }
  return parseVisionJson(extractOutputText(payload));
}

function parseVisionJson(outputText: string | undefined) {
  if (!outputText) return {};
  try {
    return JSON.parse(outputText) as Partial<PokerPhotoRecognition>;
  } catch {
    const match = outputText.match(/\{[\s\S]*\}/);
    if (!match) return {};
    return JSON.parse(match[0]) as Partial<PokerPhotoRecognition>;
  }
}

function extractOutputText(payload: OpenAIResponse) {
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (typeof part.text === "string") return part.text;
    }
  }
  return "";
}

function extractParsedObjects(payload: OpenAIResponse) {
  const parsedObjects: unknown[] = [];
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (part.parsed && typeof part.parsed === "object") parsedObjects.push(part.parsed);
      if (part.json && typeof part.json === "object") parsedObjects.push(part.json);
    }
  }
  return parsedObjects;
}

function normalizeRecognition(input: Partial<PokerPhotoRecognition>): PokerPhotoRecognition {
  return {
    gameType: input.gameType === "holdem" || input.gameType === "omaha" ? input.gameType : "unknown",
    confidence: typeof input.confidence === "number" ? Math.max(0, Math.min(1, input.confidence)) : 0,
    players: Array.isArray(input.players)
      ? input.players.map((player, index) => ({
          id: player.id || `player-${index + 1}`,
          seat: player.seat || `玩家 ${index + 1}`,
          holeCards: Array.isArray(player.holeCards) ? player.holeCards : [],
          stack: player.stack || "",
          isHero: Boolean(player.isHero),
        }))
      : [],
    boards: Array.isArray(input.boards)
      ? input.boards.map((board, index) => ({
          id: board.id || `board-${index + 1}`,
          label: board.label || (index === 0 ? "主牌面" : `第 ${index + 1} 路`),
          cards: Array.isArray(board.cards) ? board.cards : [],
        }))
      : [],
    pot: input.pot || "",
    notes: Array.isArray(input.notes) ? input.notes : [],
    warnings: Array.isArray(input.warnings) ? input.warnings : [],
  };
}

function buildOpenAIError(response: Response, payload: OpenAIResponse) {
  const requestId = response.headers.get("x-request-id") || undefined;
  return new PokerVisionError(payload.error?.message || `OpenAI 视觉识别失败：HTTP ${response.status}`, {
    provider: "openai",
    providerStatus: response.status,
    code: payload.error?.code,
    type: payload.error?.type,
    param: payload.error?.param,
    requestId,
  });
}

function getPositiveIntegerEnv(name: string, fallback: number, min: number, max: number) {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

async function configureOptionalProxy() {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY || "";
  if (!proxyUrl || configuredProxyUrl === proxyUrl) return;

  try {
    const { ProxyAgent, setGlobalDispatcher } = await import("undici");
    setGlobalDispatcher(new ProxyAgent(proxyUrl));
    configuredProxyUrl = proxyUrl;
  } catch {
    throw new Error("检测到代理环境变量，但缺少 undici 代理依赖。请重新安装依赖后再启动本地服务。");
  }
}
