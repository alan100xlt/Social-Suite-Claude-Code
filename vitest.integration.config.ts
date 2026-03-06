import { defineConfig } from "vitest/config";
import path from "path";
import { readFileSync, existsSync } from "fs";

// Load .env.local into process.env for integration tests (SUPABASE_SERVICE_ROLE_KEY etc.)
const envLocalPath = path.resolve(__dirname, ".env.local");
if (existsSync(envLocalPath)) {
  for (const line of readFileSync(envLocalPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

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
