import type { PokerGameMode, PokerPhotoRecognition } from "../src/types.js";

type VisionInput = {
  apiKey: string;
  model?: string;
  imageDataUrl: string;
  mode: PokerGameMode;
};

type OpenAIResponse = {
  output_text?: string;
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

  const parsed = parseVisionJson(payload.output_text);
  const recognition = normalizeRecognition(parsed);
  if (!recognition.players.length && !recognition.boards.length) {
    throw new PokerVisionError("视觉模型没有读出可用牌面，请换一张更清晰的照片或手动输入。", { provider: "openai" });
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
                  "你是牌桌照片识别助手。只从图片中读取可见扑克牌，不猜不可见牌。必须返回 JSON。牌面统一为 A♠、T♥、9♦、2♣ 格式。需要识别德州扑克/奥马哈；如果出现两路或多路发牌，把每一路公共牌放入 boards。玩家手牌放入 players.holeCards；德州通常 2 张，奥马哈通常 4 张。无法确认时写入 warnings。",
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
              { type: "input_image", image_url: imageDataUrl },
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
