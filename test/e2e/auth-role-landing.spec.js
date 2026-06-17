import { test, expect } from "@playwright/test";
import { LANDING_BY_ROLE, ROUTES, USERS } from "./fixtures/mvp-routes.js";
import { TEST_IDS } from "./fixtures/mvp-test-ids.js";
import { loginAs } from "./support/mvp-helpers.js";

test.describe("MVP auth and role landing", () => {
  for (const role of Object.keys(USERS)) {
    test(`login as ${role} lands on ${LANDING_BY_ROLE[role]}`, async ({ page }) => {
      await loginAs(page, role);
      await expect(page).toHaveURL(new RegExp(LANDING_BY_ROLE[role].replace("/", "\\/")));
    });
  }

  test("login form exposes the documented data-testid contract", async ({ page }) => {
    test.fixme(
      process.env.E2E_STRICT_TEST_IDS !== "1",
      "Enable with E2E_STRICT_TEST_IDS=1 after login data-testid attributes are implemented.",
    );

    await page.goto(ROUTES.login);
    await expect(page.getByTestId(TEST_IDS.login.page)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.login.form)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.login.emailInput)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.login.passwordInput)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.login.submitButton)).toHaveText(/đăng nhập/i);
  });
});

