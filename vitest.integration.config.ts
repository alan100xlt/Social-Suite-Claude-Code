import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["src/tests/integration/**/*.test.ts"],
    environment: "node",
    testTimeout: 30000,
    setupFiles: ["src/tests/integration/setup.ts"],
    globals: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
