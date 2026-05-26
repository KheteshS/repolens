import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/services/geminiClient.js", () => ({
  generateText: vi.fn(),
  generateStream: vi.fn(),
  geminiFlash: {},
}));

import { generateSummary } from "../../src/services/summaryGenerator";
import { generateText } from "../../src/services/geminiClient";
import { simpleParsedFiles } from "../fixtures/parsedFiles";

const mockGenerateText = vi.mocked(generateText);

const sampleFileTree = {
  name: "repo",
  path: ".",
  type: "directory" as const,
  children: [{ name: "index.ts", path: "src/index.ts", type: "file" as const }],
};

const sampleLayers = [
  { name: "services", files: ["src/services/api.ts"] },
];

describe("generateSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns parsed JSON when Gemini returns valid JSON", async () => {
    const geminiResponse = JSON.stringify({
      summary: "A TypeScript web app",
      techStack: ["TypeScript", "React"],
      entryPoints: ["src/index.ts"],
      architectureStyle: "Layered",
    });
    mockGenerateText.mockResolvedValue(geminiResponse);

    const result = await generateSummary("test-repo", simpleParsedFiles, sampleFileTree, sampleLayers);

    expect(result.summary).toBe("A TypeScript web app");
    expect(result.techStack).toContain("TypeScript");
    expect(result.architectureStyle).toBe("Layered");
  });

  it("strips markdown code blocks from response", async () => {
    const geminiResponse = '```json\n{"summary":"Test","techStack":["React"],"entryPoints":[],"architectureStyle":"MVC"}\n```';
    mockGenerateText.mockResolvedValue(geminiResponse);

    const result = await generateSummary("test-repo", simpleParsedFiles, sampleFileTree, sampleLayers);

    expect(result.summary).toBe("Test");
    expect(result.techStack).toContain("React");
  });

  it("falls back to raw text on invalid JSON", async () => {
    mockGenerateText.mockResolvedValue("This is not JSON at all, just text about the repo");

    const result = await generateSummary("test-repo", simpleParsedFiles, sampleFileTree, sampleLayers);

    expect(result.summary).toContain("This is not JSON");
    expect(result.techStack).toBeInstanceOf(Array);
  });

  it("fallback detectTechStack identifies technologies from imports", async () => {
    mockGenerateText.mockResolvedValue("invalid json");

    const filesWithReact = [
      ...simpleParsedFiles,
      {
        path: "src/app.tsx",
        language: "typescript",
        imports: ["react", "express", "prisma"],
        exports: ["App"],
        functions: ["App"],
        classes: [],
        content: 'import React from "react";',
      },
    ];

    const result = await generateSummary("test-repo", filesWithReact, sampleFileTree, sampleLayers);

    expect(result.techStack).toContain("TypeScript");
  });

  it("calls generateText with prompt containing repo name", async () => {
    mockGenerateText.mockResolvedValue('{"summary":"x","techStack":[],"entryPoints":[],"architectureStyle":"Unknown"}');

    await generateSummary("my-project", simpleParsedFiles, sampleFileTree, sampleLayers);

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    const prompt = mockGenerateText.mock.calls[0]![0];
    expect(prompt).toContain("my-project");
  });

  it("truncates summary to 500 chars on fallback", async () => {
    const longText = "A".repeat(1000);
    mockGenerateText.mockResolvedValue(longText);

    const result = await generateSummary("test-repo", simpleParsedFiles, sampleFileTree, sampleLayers);

    expect(result.summary.length).toBeLessThanOrEqual(500);
  });
});
