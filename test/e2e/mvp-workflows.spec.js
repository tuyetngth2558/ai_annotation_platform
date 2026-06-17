import { test, expect } from "@playwright/test";
import { CLAIM_IDS, ROUTES } from "./fixtures/mvp-routes.js";
import { TEST_IDS } from "./fixtures/mvp-test-ids.js";
import { expectCsvDownload, expectPageReady, loginAs, requireEnv } from "./support/mvp-helpers.js";

test.describe.configure({ mode: "serial" });

test.describe("MVP integration workflows", () => {
  test("happy path approve: import -> annotate -> QA approve -> export CSV", async ({ page }) => {
    test.fixme(
      process.env.E2E_MVP_WORKFLOWS !== "1",
      "Enable with E2E_MVP_WORKFLOWS=1 when seeded data, PDF fixture, and MVP test IDs are available.",
    );

    const bundlePdf = requireEnv("E2E_BUNDLE_PDF");
    const claimId = process.env.E2E_CLAIM_ID ?? CLAIM_IDS.submittedByAnnotator;

    await loginAs(page, "ADMIN", { strictTestIds: true });
    await page.goto(ROUTES.importBundle);
    await expectPageReady(page, TEST_IDS.importBundle.page);
    await page.getByTestId(TEST_IDS.importBundle.uploadFileInput).setInputFiles(bundlePdf);
    await page.getByTestId(TEST_IDS.importBundle.validateButton).click();
    await expect(page.getByTestId(TEST_IDS.importBundle.validationSuccess)).toBeVisible();
    await page.getByTestId(TEST_IDS.importBundle.step4NextButton).click();
    await expect(page.getByTestId(TEST_IDS.importBundle.parsePreviewPanel)).toBeVisible();
    await page.getByTestId(TEST_IDS.importBundle.step5ConfirmButton).click();
    await expect(page.getByTestId(TEST_IDS.importBundle.pipelineStatus)).toBeVisible();

    await loginAs(page, "ANNOTATOR", { strictTestIds: true });
    await page.getByTestId(TEST_IDS.annotatorTasks.open(claimId)).click();
    await expect(page).toHaveURL(new RegExp(ROUTES.annotationWorkspace(claimId).replace("/", "\\/")));
    await page.getByTestId(TEST_IDS.annotation.sourceStatusSelect).selectOption("source_text_parsed");
    await page.getByTestId(TEST_IDS.annotation.submitButton).click();
    await expect(page.getByTestId(TEST_IDS.annotation.statusBadge)).toHaveText(/submitted/i);

    await loginAs(page, "QA", { strictTestIds: true });
    await page.goto(ROUTES.qaReview(claimId));
    await expectPageReady(page, TEST_IDS.qaReview.page);
    await page.getByTestId(TEST_IDS.qaReview.approveButton).click();
    await expect(page).toHaveURL(new RegExp(ROUTES.qaQueue.replace("/", "\\/")));

    await loginAs(page, "ADMIN", { strictTestIds: true });
    await page.goto(ROUTES.exportCsv);
    await expectPageReady(page, TEST_IDS.exportCsv.page);
    await page.getByTestId(TEST_IDS.exportCsv.projectSelect).selectOption("vivipedia-demo");
    await expectCsvDownload(page, () => page.getByTestId(TEST_IDS.exportCsv.downloadButton).click());
  });

  test("return -> re-annotate -> approve captures review history", async ({ page }) => {
    test.fixme(
      process.env.E2E_MVP_WORKFLOWS !== "1",
      "Enable with E2E_MVP_WORKFLOWS=1 when returned-claim seed data and MVP test IDs are available.",
    );

    const claimId = process.env.E2E_RETURN_CLAIM_ID ?? CLAIM_IDS.readyForQaReview;

    await loginAs(page, "QA", { strictTestIds: true });
    await page.goto(ROUTES.qaReview(claimId));
    await expectPageReady(page, TEST_IDS.qaReview.page);
    await page.getByTestId(TEST_IDS.qaReview.returnButton).click();
    await expect(page.getByTestId(TEST_IDS.qaReview.returnModal)).toBeVisible();
    await page.getByTestId(TEST_IDS.qaReview.returnErrorTypeSelect).selectOption({ index: 1 });
    await page
      .getByTestId(TEST_IDS.qaReview.returnCommentTextarea)
      .fill("Please revise the source status and clarify the score delta.");
    await page.getByTestId(TEST_IDS.qaReview.returnConfirmButton).click();
    await expect(page).toHaveURL(new RegExp(ROUTES.qaQueue.replace("/", "\\/")));

    await loginAs(page, "ANNOTATOR", { strictTestIds: true });
    await page.goto(ROUTES.annotatorTasks);
    await page.getByTestId(TEST_IDS.annotatorTasks.open(claimId)).click();
    await expect(page.getByTestId(TEST_IDS.annotation.returnedBanner)).toBeVisible();
    await page.getByTestId(TEST_IDS.annotation.claimText).fill("Updated claim text after QA return.");
    await page.getByTestId(TEST_IDS.annotation.sourceStatusSelect).selectOption("source_text_parsed");
    await page.getByTestId(TEST_IDS.annotation.submitButton).click();
    await expect(page.getByTestId(TEST_IDS.annotation.statusBadge)).toHaveText(/submitted/i);

    await loginAs(page, "QA", { strictTestIds: true });
    await page.goto(ROUTES.qaReview(claimId));
    await page.getByTestId(TEST_IDS.qaReview.tabHistory).click();
    await expect(page.getByTestId(TEST_IDS.qaReview.tabHistory)).toBeVisible();
    await page.getByTestId(TEST_IDS.qaReview.approveButton).click();
    await expect(page).toHaveURL(new RegExp(ROUTES.qaQueue.replace("/", "\\/")));
  });
});

