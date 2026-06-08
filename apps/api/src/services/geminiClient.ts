import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const geminiFlash = genAI.getGenerativeModel({
  model: "gemini-3.5-flash",
});

export class GeminiQuotaError extends Error {
  retryAfterSeconds?: number;

  constructor(message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "GeminiQuotaError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function isGeminiQuotaError(err: unknown): err is GeminiQuotaError {
  if (err instanceof GeminiQuotaError) return true;
  if (!(err instanceof Error)) return false;

  const message = err.message.toLowerCase();
  return (
    message.includes("quota exceeded") ||
    message.includes("too many requests") ||
    message.includes("429")
  );
}

function toGeminiQuotaError(err: unknown): GeminiQuotaError {
  if (err instanceof GeminiQuotaError) return err;

  const message = err instanceof Error ? err.message : String(err);
  const retryMatch = message.match(/retry in\s+([\d.]+)s/i);
  const retryAfterSeconds = retryMatch
    ? Math.max(1, Math.ceil(Number(retryMatch[1])))
    : undefined;

  return new GeminiQuotaError(message, retryAfterSeconds);
}

export async function generateText(prompt: string): Promise<string> {
  try {
    const result = await geminiFlash.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    if (isGeminiQuotaError(err)) {
      throw toGeminiQuotaError(err);
    }
    throw err;
  }
}

export async function* generateStream(prompt: string): AsyncGenerator<string> {
  const result = await geminiFlash.generateContentStream(prompt);
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}
