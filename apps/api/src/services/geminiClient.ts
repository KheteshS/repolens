import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const geminiFlash = genAI.getGenerativeModel({
  model: "gemini-3.5-flash",
});

export async function generateText(prompt: string): Promise<string> {
  const result = await geminiFlash.generateContent(prompt);
  return result.response.text();
}

export async function* generateStream(prompt: string): AsyncGenerator<string> {
  const result = await geminiFlash.generateContentStream(prompt);
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}
