import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("ioredis", () => ({
  default: class MockRedis {
    constructor() {}
    on() { return this; }
  },
}));

vi.mock("bullmq", () => ({
  Queue: class MockQueue {
    add = vi.fn();
    getJob = vi.fn();
  },
  Worker: class MockWorker {
    constructor() {}
    on() { return this; }
  },
  QueueEvents: class MockQueueEvents {
    constructor() {}
    on() { return this; }
  },
}));

vi.mock("../../src/db/prisma", () => ({
  prisma: {
    analysis: {
      findUnique: vi.fn(),
    },
  },
}));

import app from "../../src/app";
import { prisma } from "../../src/db/prisma";

describe("GET /api/results/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 for non-existent analysis", async () => {
    vi.mocked(prisma.analysis.findUnique).mockResolvedValue(null);

    const res = await request(app).get("/api/results/nonexistent-id");
    expect(res.status).toBe(404);
    expect(res.body.error).toContain("not found");
  });

  it("returns status only when not completed", async () => {
    vi.mocked(prisma.analysis.findUnique).mockResolvedValue({
      id: "a1",
      status: "processing",
      errorMessage: null,
    } as any);

    const res = await request(app).get("/api/results/a1");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("processing");
    expect(res.body.summary).toBeUndefined();
  });

  it("returns full analysis when completed", async () => {
    vi.mocked(prisma.analysis.findUnique).mockResolvedValue({
      id: "a1",
      status: "completed",
      repoName: "test-repo",
      summary: "A test project",
      techStack: ["TypeScript"],
      fileTree: { name: "root", type: "directory" },
      diagrams: { mermaid: {} },
      createdAt: new Date(),
    } as any);

    const res = await request(app).get("/api/results/a1");
    expect(res.status).toBe(200);
    expect(res.body.repoName).toBe("test-repo");
    expect(res.body.summary).toBe("A test project");
  });

  it("includes errorMessage for failed analysis", async () => {
    vi.mocked(prisma.analysis.findUnique).mockResolvedValue({
      id: "a1",
      status: "failed",
      errorMessage: "Clone failed",
    } as any);

    const res = await request(app).get("/api/results/a1");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("failed");
    expect(res.body.errorMessage).toBe("Clone failed");
  });
});
