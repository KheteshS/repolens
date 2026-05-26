import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGenerateContent, mockGenerateContentStream } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
  mockGenerateContentStream: vi.fn(),
}));

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return {
          generateContent: mockGenerateContent,
          generateContentStream: mockGenerateContentStream,
        };
      }
    },
  };
});

import { generateText, generateStream } from "../../src/services/geminiClient";

describe("generateText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns response text from Gemini", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "Hello from Gemini" },
    });

    const result = await generateText("test prompt");
    expect(result).toBe("Hello from Gemini");
  });

  it("passes prompt to generateContent", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "response" },
    });

    await generateText("my prompt");
    expect(mockGenerateContent).toHaveBeenCalledWith("my prompt");
  });

  it("propagates API errors", async () => {
    mockGenerateContent.mockRejectedValue(new Error("API rate limit"));

    await expect(generateText("prompt")).rejects.toThrow("API rate limit");
  });
});

describe("generateStream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("yields chunks from stream", async () => {
    mockGenerateContentStream.mockResolvedValue({
      stream: (async function* () {
        yield { text: () => "chunk1" };
        yield { text: () => "chunk2" };
        yield { text: () => "chunk3" };
      })(),
    });

    const chunks: string[] = [];
    for await (const chunk of generateStream("prompt")) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["chunk1", "chunk2", "chunk3"]);
  });

  it("skips empty chunks", async () => {
    mockGenerateContentStream.mockResolvedValue({
      stream: (async function* () {
        yield { text: () => "hello" };
        yield { text: () => "" };
        yield { text: () => "world" };
      })(),
    });

    const chunks: string[] = [];
    for await (const chunk of generateStream("prompt")) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["hello", "world"]);
  });

  it("propagates stream errors", async () => {
    mockGenerateContentStream.mockRejectedValue(new Error("Stream error"));

    await expect(async () => {
      for await (const _ of generateStream("prompt")) {
        // consume
      }
    }).rejects.toThrow("Stream error");
  });
});
