import { getPokerVisionErrorStatus, recognizePokerPhotoWithOpenAI, toPokerVisionErrorPayload } from "../server/openaiVision.js";
import type { PokerGameMode } from "../src/types.js";

export const config = {
  maxDuration: 30,
};

type ApiRequest = {
  method?: string;
  body?: unknown;
};

type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => {
    json: (body: unknown) => void;
    end?: () => void;
  };
};

type RecognizePhotoBody = {
  imageDataUrl?: string;
  mode?: PokerGameMode;
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method === "OPTIONS") {
    response.status(204).end?.();
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ error: "只支持 POST 请求。" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    response.status(500).json({ error: "服务端缺少 OPENAI_API_KEY 环境变量。" });
    return;
  }

  const body = parseBody(request.body);
  if (!body.imageDataUrl || !body.imageDataUrl.startsWith("data:image/")) {
    response.status(400).json({ error: "请求缺少图片数据。" });
    return;
  }

  try {
    const recognition = await recognizePokerPhotoWithOpenAI({
      apiKey,
      model: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || process.env.VITE_OPENAI_MODEL,
      imageDataUrl: body.imageDataUrl,
      mode: body.mode === "holdem" || body.mode === "omaha" || body.mode === "auto" ? body.mode : "auto",
    });
    response.status(200).json({ recognition });
  } catch (error) {
    response.status(getPokerVisionErrorStatus(error)).json(toPokerVisionErrorPayload(error));
  }
}

function parseBody(body: unknown): RecognizePhotoBody {
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as RecognizePhotoBody;
    } catch {
      return {};
    }
  }
  if (typeof body === "object" && body) return body as RecognizePhotoBody;
  return {};
}
