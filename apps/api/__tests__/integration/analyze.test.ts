import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

const { mockAdd, mockCreate, mockUpsert } = vi.hoisted(() => ({
  mockAdd: vi.fn().mockResolvedValue({ id: "job-456" }),
  mockCreate: vi.fn().mockResolvedValue({ id: "analysis-123" }),
  mockUpsert: vi.fn().mockResolvedValue({ id: "user-1" }),
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
    add = mockAdd;
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
      create: mockCreate,
      update: vi.fn(),
    },
    user: {
      upsert: mockUpsert,
    },
  },
}));

import app from "../../src/app";
import { prisma } from "../../src/db/prisma";

describe("POST /api/analyze/url", () => {
  beforeEach(() => {
    mockAdd.mockResolvedValue({ id: "job-456" });
    mockCreate.mockResolvedValue({ id: "analysis-123" });
    mockUpsert.mockResolvedValue({ id: "user-1" });
  });

  it("returns 200 with jobId and analysisId for valid URL", async () => {
    const res = await request(app)
      .post("/api/analyze/url")
      .send({ repoUrl: "https://github.com/owner/repo" });

    expect(res.status).toBe(200);
    expect(res.body.jobId).toBe("job-456");
    expect(res.body.analysisId).toBe("analysis-123");
  });

  it("returns 400 for invalid URL", async () => {
    const res = await request(app)
      .post("/api/analyze/url")
      .send({ repoUrl: "https://gitlab.com/owner/repo" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("GitHub URL");
  });

  it("returns 400 for missing repoUrl", async () => {
    const res = await request(app)
      .post("/api/analyze/url")
      .send({});

    expect(res.status).toBe(400);
  });

  it("upserts user when userEmail provided", async () => {
    await request(app)
      .post("/api/analyze/url")
      .send({ repoUrl: "https://github.com/owner/repo", userEmail: "test@test.com" });

    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "test@test.com" },
      }),
    );
  });

  it("creates analysis without userId when no email", async () => {
    await request(app)
      .post("/api/analyze/url")
      .send({ repoUrl: "https://github.com/owner/repo" });

    expect(prisma.analysis.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: undefined,
        }),
      }),
    );
  });

  it("queues BullMQ job with correct data", async () => {
    await request(app)
      .post("/api/analyze/url")
      .send({ repoUrl: "https://github.com/owner/repo", githubToken: "ghp_test" });

    expect(mockAdd).toHaveBeenCalledWith(
      "analyze",
      expect.objectContaining({
        analysisId: "analysis-123",
        repoUrl: "https://github.com/owner/repo",
        githubToken: "ghp_test",
      }),
    );
  });
});

describe("POST /api/analyze/zip", () => {
  beforeEach(() => {
    mockAdd.mockResolvedValue({ id: "job-456" });
    mockCreate.mockResolvedValue({ id: "analysis-123" });
    mockUpsert.mockResolvedValue({ id: "user-1" });
  });

  it("returns 200 for valid zip upload", async () => {
    const res = await request(app)
      .post("/api/analyze/zip")
      .attach("file", Buffer.from("PK\x03\x04fake"), "test.zip");

    expect(res.status).toBe(200);
    expect(res.body.jobId).toBe("job-456");
    expect(res.body.analysisId).toBe("analysis-123");
  });

  it("returns 400 when no file attached", async () => {
    const res = await request(app)
      .post("/api/analyze/zip")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("ZIP file required");
  });

  it("creates analysis with correct repo name from filename", async () => {
    await request(app)
      .post("/api/analyze/zip")
      .attach("file", Buffer.from("PK\x03\x04fake"), "my-project.zip");

    expect(prisma.analysis.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          repoName: "my-project",
        }),
      }),
    );
  });
});
