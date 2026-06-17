import { expect } from "@playwright/test";
import { LANDING_BY_ROLE, ROUTES, USERS } from "../fixtures/mvp-routes.js";
import { TEST_IDS } from "../fixtures/mvp-test-ids.js";

async function getByTestIdOrFallback(page, testId, fallbackLocatorFactory, strictTestIds) {
  const testIdLocator = page.getByTestId(testId);

  if (strictTestIds || (await testIdLocator.count()) > 0) {
    return testIdLocator;
  }

  return fallbackLocatorFactory();
}

export async function loginAs(page, role, options = {}) {
  const user = USERS[role];
  const strictTestIds = options.strictTestIds ?? process.env.E2E_STRICT_TEST_IDS === "1";

  if (!user) {
    throw new Error(`Unknown E2E role: ${role}`);
  }

  await page.goto(ROUTES.login);

  const emailInput = await getByTestIdOrFallback(
    page,
    TEST_IDS.login.emailInput,
    () => page.getByLabel(/email/i),
    strictTestIds,
  );
  const passwordInput = await getByTestIdOrFallback(
    page,
    TEST_IDS.login.passwordInput,
    () => page.getByLabel(/mật khẩu|password/i),
    strictTestIds,
  );
  const submitButton = await getByTestIdOrFallback(
    page,
    TEST_IDS.login.submitButton,
    () => page.getByRole("button", { name: /đăng nhập|sign in|vào workspace/i }),
    strictTestIds,
  );

  await emailInput.fill(user.email);
  await passwordInput.fill(user.password);
  await submitButton.click();
  await expect(page).toHaveURL(new RegExp(escapeRouteForRegex(LANDING_BY_ROLE[role])));
}

export async function expectPageReady(page, testId) {
  await expect(page.getByTestId(testId)).toBeVisible();
}

export async function gotoAndExpectPage(page, route, testId) {
  await page.goto(route);
  await expect(page).toHaveURL(new RegExp(escapeRouteForRegex(route)));
  await expectPageReady(page, testId);
}

export async function expectCsvDownload(page, triggerDownload) {
  const [download] = await Promise.all([page.waitForEvent("download"), triggerDownload()]);

  expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  return download;
}

export function requireEnv(name) {
  const value = process.env[name];

  expect(value, `Set ${name} before running this opt-in workflow test.`).toBeTruthy();
  return value;
}

function escapeRouteForRegex(route) {
  return route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

