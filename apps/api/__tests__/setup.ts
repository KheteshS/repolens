import { vi } from "vitest";

// Mock Prisma
vi.mock("../src/db/prisma", () => ({
  prisma: {
    analysis: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn(), upsert: vi.fn() },
    chatSession: { create: vi.fn(), findFirst: vi.fn() },
    chatMessage: { create: vi.fn() },
  },
}));

// Mock BullMQ
vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: "test-job-1" }),
    getJob: vi.fn(),
  })),
  Worker: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
  })),
}));
