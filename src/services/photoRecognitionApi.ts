import type { PokerGameMode, PokerPhotoRecognition } from "../types";

const MAX_IMAGE_SIDE = 1600;
const TARGET_DATA_URL_BYTES = 3_200_000;
const MIN_JPEG_QUALITY = 0.48;

export async function recognizePokerPhoto(file: File, mode: PokerGameMode): Promise<PokerPhotoRecognition> {
  const image = await prepareImageForVision(file);
  const response = await fetch("/api/recognize-photo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageDataUrl: image.dataUrl,
      mode,
      imageMeta: {
        originalBytes: file.size,
        uploadBytes: image.bytes,
        resized: image.resized,
      },
    }),
  });

  const rawText = await response.text().catch(() => "");
  const payload = parseApiPayload(rawText);

  if (!response.ok || !payload.recognition) {
    const statusText = response.status ? `HTTP ${response.status}` : "请求失败";
    const requestId = payload.details?.requestId ? `（requestId=${payload.details.requestId}）` : "";
    if (response.status === 413) {
      throw new Error(
        [
          "照片识别失败：HTTP 413：图片请求体过大，服务网关在进入识别 API 前拒绝了请求。",
          `原图 ${formatBytes(file.size)}，压缩后 ${formatBytes(image.bytes)}。`,
          "请裁掉无关桌面区域，或换一张更清晰但尺寸更小的照片。",
          payload.error || rawTextToHint(rawText),
        ]
          .filter(Boolean)
          .join(" "),
      );
    }
    const responseHint = payload.error || rawTextToHint(rawText);
    throw new Error(`照片识别失败：${statusText}${responseHint ? `：${responseHint}` : ""}${requestId}`);
  }

  return payload.recognition;
}

function parseApiPayload(rawText: string) {
  try {
    return JSON.parse(rawText || "{}") as {
      recognition?: PokerPhotoRecognition;
      error?: string;
      details?: { providerStatus?: number; requestId?: string };
    };
  } catch {
    return {};
  }
}

function rawTextToHint(rawText: string) {
  const normalized = rawText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return normalized.slice(0, 220);
}

async function prepareImageForVision(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("请上传图片文件。");
  }

  try {
    return await compressImage(file);
  } catch (error) {
    const fallback = await fileToDataUrl(file);
    if (fallback.length > TARGET_DATA_URL_BYTES) {
      throw new Error(
        `图片过大且浏览器无法压缩这张图片（${formatBytes(file.size)}）。请先裁剪或导出为 JPG/PNG 后再上传。${
          error instanceof Error ? ` 原因：${error.message}` : ""
        }`,
      );
    }
    return { dataUrl: fallback, bytes: byteLength(fallback), resized: false };
  }
}

async function compressImage(file: File) {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(sourceUrl);
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("当前浏览器不支持图片压缩。");

    context.drawImage(image, 0, 0, width, height);

    let quality = 0.76;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);
    while (byteLength(dataUrl) > TARGET_DATA_URL_BYTES && quality > MIN_JPEG_QUALITY) {
      quality = Math.max(MIN_JPEG_QUALITY, quality - 0.08);
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }

    return {
      dataUrl,
      bytes: byteLength(dataUrl),
      resized: scale < 1 || dataUrl.length < file.size,
    };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片解码失败。"));
    image.src = src;
  });
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("图片读取失败。"));
    reader.readAsDataURL(file);
  });
}

function byteLength(value: string) {
  return new Blob([value]).size;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}
