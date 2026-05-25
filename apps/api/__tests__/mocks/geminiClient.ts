import { vi } from "vitest";

export const generateText = vi.fn().mockResolvedValue(JSON.stringify({
  summary: "A sample project for testing",
  techStack: ["TypeScript", "React", "Express"],
  entryPoints: ["src/index.ts"],
  architectureStyle: "Layered",
}));

export async function* generateStream(prompt: string): AsyncGenerator<string> {
  yield "Hello ";
  yield "from ";
  yield "mocked Gemini.";
}

export const geminiFlash = {
  generateContent: vi.fn().mockResolvedValue({
    response: { text: () => "mocked response" },
  }),
  generateContentStream: vi.fn().mockResolvedValue({
    stream: (async function* () {
      yield { text: () => "chunk1" };
      yield { text: () => "chunk2" };
    })(),
  }),
};
