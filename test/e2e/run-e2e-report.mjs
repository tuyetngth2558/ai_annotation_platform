#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const e2eDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(e2eDir, "..", "..");
const webRoot = resolve(repoRoot, "fe_ui");
const artifactsDir = resolve(e2eDir, ".artifacts");
const require = createRequire(resolve(webRoot, "package.json"));

mkdirSync(resolve(artifactsDir, "test-results"), { recursive: true });
mkdirSync(resolve(artifactsDir, "html-report"), { recursive: true });

let playwrightCli;
try {
  playwrightCli = require.resolve("@playwright/test/cli");
} catch {
  console.error(
    "Playwright is not installed for fe_ui. Run npm install in fe_ui before executing E2E tests.",
  );
  process.exit(1);
}

const forwardedArgs = process.argv.slice(2);
const args = [
  playwrightCli,
  "test",
  ...forwardedArgs,
];

const child = spawn(process.execPath, args, {
  cwd: webRoot,
  env: {
    ...process.env,
    NODE_PATH: resolve(webRoot, "node_modules"),
    PLAYWRIGHT_HTML_OPEN: "never",
  },
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(`Failed to start Playwright: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
