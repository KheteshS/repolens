import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    root: ".",
    include: ["__tests__/**/*.test.ts"],
    setupFiles: ["./__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/db/**"],
    },
    mockReset: true,
  },
  resolve: {
    alias: {
      "@repo/shared": path.resolve(__dirname, "../../packages/shared/src"),
    },
  },
});
