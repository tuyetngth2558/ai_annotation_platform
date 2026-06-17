import { test } from "@playwright/test";
import { PAGE_TEST_IDS, ROUTES } from "./fixtures/mvp-routes.js";
import { gotoAndExpectPage, loginAs } from "./support/mvp-helpers.js";

const pageContracts = [
  { role: "ADMIN", route: ROUTES.projectSetup, pageTestId: PAGE_TEST_IDS.projectSetup },
  { role: "ADMIN", route: ROUTES.importBundle, pageTestId: PAGE_TEST_IDS.importBundle },
  { role: "ANNOTATOR", route: ROUTES.annotatorTasks, pageTestId: PAGE_TEST_IDS.annotatorTasks },
  { role: "QA", route: ROUTES.qaQueue, pageTestId: PAGE_TEST_IDS.qaQueue },
  { role: "ADMIN", route: ROUTES.exportCsv, pageTestId: PAGE_TEST_IDS.exportCsv },
];

test.describe("MVP page URL and data-testid contract", () => {
  for (const contract of pageContracts) {
    test(`${contract.role} can open ${contract.route} and sees ${contract.pageTestId}`, async ({ page }) => {
      test.fixme(
        process.env.E2E_MVP_CONTRACT !== "1",
        "Enable with E2E_MVP_CONTRACT=1 after MVP routes and page-level data-testid attributes are implemented.",
      );

      await loginAs(page, contract.role, { strictTestIds: true });
      await gotoAndExpectPage(page, contract.route, contract.pageTestId);
    });
  }
});

