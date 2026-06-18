import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ProxyAgent, setGlobalDispatcher } from "undici";

type AvatarSpec = {
  code: string;
  alias: string;
  vibeDescription: string;
  filename: string;
  character: string;
};

const avatarSpecs: AvatarSpec[] = [
  {
    code: "鸡豪术",
    alias: "BLUFF-R",
    vibeDescription: "a bluff master who can tell a convincing three-street story",
    filename: "ji-hao-shu.png",
    character:
      "A sly and confident poker storyteller, one hand gesturing forward to pressure an opponent, the other holding a few poker chips, clever smirk, sharp eyes, composed posture, looks capable of telling a convincing three-street bluff story.",
  },
  {
    code: "鸡豪风",
    alias: "BOOM-R",
    vibeDescription: "an explosive hothead who charges forward whenever excitement hits",
    filename: "ji-hao-feng.png",
    character:
      "A flamboyant wealthy hothead about to go all-in, both arms spread wide, chips almost bursting from the hands, excited over-the-top expression, explosive stance, looks like a human volcano ready to ignite the pot.",
  },
  {
    code: "鸡谨术",
    alias: "SNEAK-R",
    vibeDescription: "a calculating low-cost bluff specialist",
    filename: "ji-jin-shu.png",
    character:
      "A restrained low-cost bluff assassin, leaning slightly forward and secretly observing, holding one tiny chip with precision, cold sharp expression, compact cautious pose, looks economical but dangerous.",
  },
  {
    code: "鸡谨风",
    alias: "VIBE-R",
    vibeDescription: "an intuition-led bluffer who fires according to the mood",
    filename: "ji-jin-feng.png",
    character:
      "A whimsical intuition-driven bluffer standing sideways with one ear raised toward an imaginary breeze, clothes and a single playing card lightly drifting, alert mysterious expression, nimble and slightly superstitious.",
  },
  {
    code: "稳豪术",
    alias: "CTRL",
    vibeDescription: "a calm table controller with desktop-administrator energy",
    filename: "wen-hao-shu.png",
    character:
      "An elegant white-suited poker table controller, stable upright stance, hands relaxed and composed, mature calm confidence, subtle commanding gaze, controls the whole room without exaggerated movement.",
  },
  {
    code: "稳豪风",
    alias: "ATM-er",
    vibeDescription: "a wealthy spectator who buys poker drama with chips",
    filename: "wen-hao-feng.png",
    character:
      "A cheerful wealthy story investor holding chips like cinema tickets, curious carefree expression, relaxed posture, visibly ready to pay to see the ending, amusing rich-spectator energy.",
  },
  {
    code: "稳谨术",
    alias: "RULE-R",
    vibeDescription: "a disciplined guardian of structure, ranges, and rules",
    filename: "wen-jin-shu.png",
    character:
      "A strict poker theory monk standing perfectly straight, geometric robe with subtle grid motifs, holding a small rule tablet and one chip, serious disciplined expression, emotionally motionless and rational.",
  },
  {
    code: "稳谨风",
    alias: "HIDE-R",
    vibeDescription: "a quiet observer who avoids risk and attention",
    filename: "wen-jin-feng.png",
    character:
      "A shy cautious poker hermit partially hiding inside an oversized hood, shoulders tucked in, holding cards close to the chest, nervous but cute expression, quietly avoiding every possible disturbance.",
  },
];

const sharedPrompt = `
Create a single quirky low-poly cartoon personality mascot for a humorous poker personality card collection.
Style: geometric body, cute awkward proportions, clean faceted shapes, flat color blocks, crisp edges, modern minimal 3D-cartoon feel, expressive face, slightly absurd meme-like charm.
Composition: one centered full-body character, fully visible from head to feet, generous padding, simple light gray or warm white seamless background, soft even studio lighting.
Consistency: looks like one member of a unified set of eight collectible personality mascots.
Do not include text, letters, numbers, logos, UI borders, casino scenery, extra people, photorealism, celebrity likeness, watermark, or complex background.
`.trim();

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(projectRoot, "public", "avatars", "profiles");
const force = process.argv.includes("--force");
const onlyCode = process.argv.find((argument) => argument.startsWith("--only="))?.slice("--only=".length);
const selectedSpecs = onlyCode ? avatarSpecs.filter((spec) => spec.code === onlyCode || spec.filename === onlyCode) : avatarSpecs;

if (!selectedSpecs.length) {
  throw new Error(`没有找到 --only=${onlyCode} 对应的人格或文件名。`);
}

await loadLocalEnv();
configureProxy();

const apiKey = process.env.OPENAI_API_KEY?.trim();
if (!apiKey) {
  throw new Error("缺少 OPENAI_API_KEY。请在 .env.local 或当前 shell 环境中配置后重试。");
}

await mkdir(outputDir, { recursive: true });

for (const [index, spec] of selectedSpecs.entries()) {
  const outputPath = path.join(outputDir, spec.filename);
  if (existsSync(outputPath) && !force) {
    console.log(`[${index + 1}/${selectedSpecs.length}] 跳过 ${spec.code}：${spec.filename} 已存在。`);
    continue;
  }

  console.log(`[${index + 1}/${selectedSpecs.length}] 正在生成 ${spec.code} → ${spec.filename}`);
  try {
    const image = await generateImageWithRetry(
      `${sharedPrompt}\n\nCharacter concept: "${spec.alias}" — ${spec.vibeDescription}.\nUse the alias only as an internal personality concept; do not render the alias or any text in the image.\n\nCharacter direction:\n${spec.character}`,
    );
    await writeFile(outputPath, image);
    console.log(`  已保存：${path.relative(projectRoot, outputPath)}`);
  } catch (error) {
    console.error(`  生成失败：${formatError(error)}`);
  }
}

async function generateImageWithRetry(prompt: string) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await generateImage(prompt);
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        console.warn(`  请求中断，正在重试（${formatError(error)}）`);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  }
  throw lastError;
}

async function generateImage(prompt: string) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
      prompt,
      size: "1024x1024",
      quality: process.env.OPENAI_IMAGE_QUALITY || "low",
      output_format: "png",
      background: "opaque",
    }),
    signal: AbortSignal.timeout(180_000),
  });

  const payload = (await response.json()) as {
    data?: Array<{ b64_json?: string }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(`OpenAI HTTP ${response.status}: ${payload.error?.message || "图片请求失败"}`);
  }

  const base64 = payload.data?.[0]?.b64_json;
  if (!base64) throw new Error("OpenAI 响应中没有 b64_json 图片数据。");
  return Buffer.from(base64, "base64");
}

async function loadLocalEnv() {
  for (const filename of [".env.local", ".env"]) {
    const envPath = path.join(projectRoot, filename);
    if (!existsSync(envPath)) continue;
    const contents = await readFile(envPath, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
    }
  }
}

function configureProxy() {
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY;
  if (proxy) setGlobalDispatcher(new ProxyAgent(proxy));
}

function formatError(error: unknown) {
  if (!(error instanceof Error)) return String(error);
  const errorWithCause = error as Error & { cause?: unknown };
  const cause = errorWithCause.cause instanceof Error ? `；原因：${errorWithCause.cause.message}` : "";
  return `${error.message}${cause}`;
}
