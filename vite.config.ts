import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { generateQuestionBankFromOpenAI, getQuestionBankErrorStatus, toQuestionBankErrorPayload } from "./server/openaiQuestions.js";
import type { Character, PokerScenario } from "./src/types.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  syncRuntimeEnv(env);

 return {
   plugins: [react(), localQuestionApi(env)],
 };
});

function syncRuntimeEnv(env: Record<string, string>) {
  for (const key of ["HTTPS_PROXY", "HTTP_PROXY", "ALL_PROXY"] as const) {
    if (env[key] && !process.env[key]) process.env[key] = env[key];
  }
}

function localQuestionApi(env: Record<string, string>): Plugin {
  return {
    name: "local-question-api",
    configureServer(server) {
      server.middlewares.use("/api/generate-questions", async (request, response) => {
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.setHeader("Cache-Control", "no-store");

        if (request.method === "OPTIONS") {
          response.statusCode = 204;
          response.end();
          return;
        }

        if (request.method !== "POST") {
          response.statusCode = 405;
          response.end(JSON.stringify({ error: "只支持 POST 请求。" }));
          return;
        }

        const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
        if (!apiKey?.trim()) {
          response.statusCode = 500;
          response.end(JSON.stringify({ error: "本地服务缺少 OPENAI_API_KEY 环境变量。" }));
          return;
        }

        try {
          const body = await readJsonBody(request);
          const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
          if (!prompt || !body.character) {
            response.statusCode = 400;
            response.end(JSON.stringify({ error: "请求缺少 prompt 或 character。" }));
            return;
          }

          const questions = await generateQuestionBankFromOpenAI({
            apiKey,
            model: env.OPENAI_MODEL || env.VITE_OPENAI_MODEL || process.env.OPENAI_MODEL || process.env.VITE_OPENAI_MODEL,
            prompt,
            character: body.character as Character,
            scenario: body.scenario as PokerScenario | undefined,
            questionCount: typeof body.questionCount === "number" ? body.questionCount : undefined,
            destinyPrompt: typeof body.destinyPrompt === "string" ? body.destinyPrompt : undefined,
          });

          response.end(JSON.stringify({ questions }));
        } catch (error) {
          response.statusCode = getQuestionBankErrorStatus(error);
          response.end(JSON.stringify(toQuestionBankErrorPayload(error)));
        }
      });
    },
  };
}

async function readJsonBody(request: import("node:http").IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as { prompt?: unknown; character?: unknown; scenario?: unknown; questionCount?: unknown; destinyPrompt?: unknown };
}
