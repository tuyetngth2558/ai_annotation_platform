/**
 * Smoke test — web load + trang login hiển thị.
 * Cần web (:5173) + api (:8000) chạy (docker compose up).
 */
import { test, expect } from "@playwright/test";

test("trang login load được", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /đăng nhập|sign in/i })).toBeVisible();
});

test("truy cập route bảo vệ khi chưa login -> redirect /login", async ({ page }) => {
  await page.goto("/admin/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});
