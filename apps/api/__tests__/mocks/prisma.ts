import { vi } from "vitest";

export const prisma = {
  analysis: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  chatSession: {
    create: vi.fn(),
    findFirst: vi.fn(),
  },
  chatMessage: {
    create: vi.fn(),
  },
};
