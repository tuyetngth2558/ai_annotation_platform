import { defineConfig, devices } from "@playwright/test";

// Smoke/E2E test. Cần web (Vite) chạy ở :5173 — docker compose hoặc `npm run dev`.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
