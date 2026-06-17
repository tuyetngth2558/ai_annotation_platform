import { defineConfig, devices } from "@playwright/test";

// Smoke/E2E test. Cần web (Vite) chạy ở :5173 — docker compose hoặc `npm run dev`.
export default defineConfig({
  testDir: "../test/e2e",
  outputDir: "../test/e2e/.artifacts/test-results",
  fullyParallel: true,
  reporter: [
    ["list"],
    ["html", { outputFolder: "../test/e2e/.artifacts/html-report", open: "never" }],
    ["json", { outputFile: "../test/e2e/.artifacts/results.json" }],
    ["junit", { outputFile: "../test/e2e/.artifacts/junit.xml" }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
