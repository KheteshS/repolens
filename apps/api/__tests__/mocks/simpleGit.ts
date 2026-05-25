import { vi } from "vitest";

const mockGit = {
  clone: vi.fn().mockResolvedValue(undefined),
};

export default vi.fn(() => mockGit);
export { mockGit };
