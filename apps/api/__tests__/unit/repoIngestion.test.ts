import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockClone, mockExtractAllTo } = vi.hoisted(() => ({
  mockClone: vi.fn().mockResolvedValue(undefined),
  mockExtractAllTo: vi.fn(),
}));

vi.mock("simple-git", () => ({
  default: vi.fn(() => ({
    clone: mockClone,
  })),
}));

vi.mock("adm-zip", () => {
  return {
    default: class MockAdmZip {
      extractAllTo = mockExtractAllTo;
    },
  };
});

import { ingestFromUrl, ingestFromZip } from "../../src/services/repoIngestion";

describe("ingestFromUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls git clone with shallow depth", async () => {
    await ingestFromUrl("https://github.com/owner/my-repo.git");

    expect(mockClone).toHaveBeenCalledWith(
      "https://github.com/owner/my-repo.git",
      expect.any(String),
      ["--depth", "1"],
    );
  });

  it("injects github token into URL", async () => {
    await ingestFromUrl("https://github.com/owner/repo", "ghp_abc123");

    const cloneUrl = mockClone.mock.calls[0][0];
    expect(cloneUrl).toBe("https://ghp_abc123@github.com/owner/repo");
  });

  it("uses original URL without token", async () => {
    await ingestFromUrl("https://github.com/owner/repo");

    const cloneUrl = mockClone.mock.calls[0][0];
    expect(cloneUrl).toBe("https://github.com/owner/repo");
  });

  it("extracts repo name from URL", async () => {
    const result = await ingestFromUrl("https://github.com/owner/my-repo.git");
    expect(result.repoName).toBe("my-repo");
  });

  it("extracts repo name without .git suffix", async () => {
    const result = await ingestFromUrl("https://github.com/owner/project");
    expect(result.repoName).toBe("project");
  });

  it("returns cleanup function", async () => {
    const result = await ingestFromUrl("https://github.com/owner/repo");
    expect(typeof result.cleanup).toBe("function");
  });

  it("creates temp directory with repolens prefix", async () => {
    const result = await ingestFromUrl("https://github.com/owner/repo");
    expect(result.repoPath).toContain("repolens-");
  });
});

describe("ingestFromZip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("strips .zip from original name", async () => {
    const buffer = Buffer.from("fake zip content");
    const result = await ingestFromZip(buffer, "project.zip");
    expect(result.repoName).toBe("project");
  });

  it("handles case-insensitive .ZIP", async () => {
    const buffer = Buffer.from("fake zip content");
    const result = await ingestFromZip(buffer, "Project.ZIP");
    expect(result.repoName).toBe("Project");
  });

  it("calls extractAllTo on zip instance", async () => {
    const buffer = Buffer.from("fake zip content");
    await ingestFromZip(buffer, "test.zip");
    expect(mockExtractAllTo).toHaveBeenCalledWith(expect.any(String), true);
  });

  it("returns repoPath in temp directory", async () => {
    const buffer = Buffer.from("fake zip content");
    const result = await ingestFromZip(buffer, "test.zip");
    expect(result.repoPath).toContain("repolens-");
  });

  it("returns cleanup function", async () => {
    const buffer = Buffer.from("fake zip content");
    const result = await ingestFromZip(buffer, "test.zip");
    expect(typeof result.cleanup).toBe("function");
  });
});
