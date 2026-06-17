import { test, expect } from "@playwright/test";
import { ROUTES } from "./fixtures/mvp-routes.js";

const protectedRoutes = [
  ROUTES.adminDashboard,
  ROUTES.projectSetup,
  ROUTES.importBundle,
  ROUTES.annotatorTasks,
  ROUTES.qaQueue,
  ROUTES.exportCsv,
];

test.describe("MVP protected route guards", () => {
  for (const route of protectedRoutes) {
    test(`anonymous user visiting ${route} is redirected to login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login$/);
    });
  }
});

