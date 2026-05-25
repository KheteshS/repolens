import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

const { mockGetJob } = vi.hoisted(() => ({
  mockGetJob: vi.fn(),
}));

vi.mock("ioredis", () => ({
  default: class MockRedis {
    constructor() {}
    on() { return this; }
    connect() { return Promise.resolve(); }
  },
}));

vi.mock("bullmq", () => ({
  Queue: class MockQueue {
    add = vi.fn();
    getJob = mockGetJob;
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
      findFirst: vi.fn().mockResolvedValue({ id: "a-1", status: "completed" }),
    },
  },
}));

import app from "../../src/app";

describe("GET /api/status/:jobId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 for non-existent job", async () => {
    mockGetJob.mockResolvedValue(null);

    const res = await request(app).get("/api/status/nonexistent");
    expect(res.status).toBe(404);
  });

  it("returns state and progress for active job", async () => {
    mockGetJob.mockResolvedValue({
      id: "job-1",
      getState: vi.fn().mockResolvedValue("active"),
      progress: 45,
      data: { analysisId: "a-1" },
      failedReason: undefined,
    });

    const res = await request(app).get("/api/status/job-1");
    expect(res.status).toBe(200);
    expect(res.body.state).toBe("active");
    expect(res.body.progress).toBe(45);
  });

  it("returns analysisId when completed", async () => {
    mockGetJob.mockResolvedValue({
      id: "job-1",
      getState: vi.fn().mockResolvedValue("completed"),
      progress: 100,
      data: { analysisId: "a-1" },
      failedReason: undefined,
    });

    const { prisma } = await import("../../src/db/prisma");
    vi.mocked(prisma.analysis.findFirst).mockResolvedValue({ id: "a-1", status: "completed" } as any);

    const res = await request(app).get("/api/status/job-1");
    expect(res.status).toBe(200);
    expect(res.body.state).toBe("completed");
    expect(res.body.analysisId).toBe("a-1");
  });

  it("returns error reason when failed", async () => {
    mockGetJob.mockResolvedValue({
      id: "job-1",
      getState: vi.fn().mockResolvedValue("failed"),
      progress: 25,
      data: { analysisId: "a-1" },
      failedReason: "Clone timeout",
    });

    const res = await request(app).get("/api/status/job-1");
    expect(res.status).toBe(200);
    expect(res.body.state).toBe("failed");
    expect(res.body.error).toBe("Clone timeout");
  });
});
