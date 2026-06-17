/**
 * E2E auth — login 3 role mock → điều hướng đúng trang theo role.
 * Cần api (AUTH_MOCK_ENABLED=true) + web chạy.
 */
import { test, expect } from "@playwright/test";
import { USERS } from "./fixtures/users";
import { LANDING_BY_ROLE } from "./fixtures/routes";

for (const [key, user] of Object.entries(USERS)) {
  test(`login ${key} -> ${LANDING_BY_ROLE[user.role]}`, async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/mật khẩu|password/i).fill(user.password);
    await page.getByRole("button", { name: /đăng nhập|sign in/i }).click();
    await expect(page).toHaveURL(new RegExp(LANDING_BY_ROLE[user.role].replace("/", "\\/")));
  });
}
