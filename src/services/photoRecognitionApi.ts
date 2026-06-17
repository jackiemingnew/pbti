import type { PokerGameMode, PokerPhotoRecognition } from "../types";

export async function recognizePokerPhoto(file: File, mode: PokerGameMode): Promise<PokerPhotoRecognition> {
  const imageDataUrl = await fileToDataUrl(file);
  const response = await fetch("/api/recognize-photo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageDataUrl, mode }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    recognition?: PokerPhotoRecognition;
    error?: string;
    details?: { providerStatus?: number; requestId?: string };
  };

  if (!response.ok || !payload.recognition) {
    const statusText = response.status ? `HTTP ${response.status}` : "请求失败";
    const requestId = payload.details?.requestId ? `（requestId=${payload.details.requestId}）` : "";
    throw new Error(`照片识别失败：${statusText}${payload.error ? `：${payload.error}` : ""}${requestId}`);
  }

  return payload.recognition;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("图片读取失败。"));
    reader.readAsDataURL(file);
  });
}
