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
    user: {
      findUnique: vi.fn(),
    },
    analysis: {
      findMany: vi.fn(),
    },
  },
}));

import app from "../../src/app";
import { prisma } from "../../src/db/prisma";

describe("GET /api/analyses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 without email query param", async () => {
    const res = await request(app).get("/api/analyses");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("email");
  });

  it("returns empty array for unknown user", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await request(app).get("/api/analyses?email=unknown@test.com");
    expect(res.status).toBe(200);
    expect(res.body.analyses).toEqual([]);
  });

  it("returns analyses for known user", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-1" } as any);
    vi.mocked(prisma.analysis.findMany).mockResolvedValue([
      {
        id: "a1",
        repoName: "repo1",
        repoUrl: "https://github.com/test/repo1",
        status: "completed",
        createdAt: new Date("2024-01-15"),
        techStack: ["TypeScript"],
      },
    ] as any);

    const res = await request(app).get("/api/analyses?email=test@test.com");
    expect(res.status).toBe(200);
    expect(res.body.analyses).toHaveLength(1);
    expect(res.body.analyses[0].repoName).toBe("repo1");
  });

  it("queries with correct orderBy and select", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-1" } as any);
    vi.mocked(prisma.analysis.findMany).mockResolvedValue([]);

    await request(app).get("/api/analyses?email=test@test.com");

    expect(prisma.analysis.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        orderBy: { createdAt: "desc" },
      }),
    );
  });
});
