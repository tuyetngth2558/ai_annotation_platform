# VSF AI Annotation Platform - Testability Specification

Version: 1.0

Scope: Vite/React single-page prototype in `src/`, using hash routing and shared testability constants from `src/testability.ts`.

This document is the stable UI automation contract for FE and QA. Tests should prefer `data-testid`, semantic roles, and stable hash URLs. Tests must not depend on Tailwind classes, DOM depth, visual layout position, transient product copy, or XPath selectors.

## 1. Source Of Truth

Shared route and selector constants live in `src/testability.ts`.

Rules:

1. Existing test IDs in `src/testability.ts` are canonical and must not be renamed without updating this spec and all tests.
2. New interactive controls must receive a unique `data-testid` before E2E tests rely on them.
3. Dynamic IDs must be derived from stable domain IDs, not array indexes.
4. Visible Vietnamese product copy may change; tests should not rely on it unless the test is explicitly about copy.
5. Prefer `page.getByTestId(...)`. Use `getByRole` or `getByLabel` only when the accessible name is part of this contract.

## 2. Naming Convention

Use lowercase kebab-case for new static IDs:

```txt
<area>-<object>-<action-or-type>
```

Examples:

```txt
project-wizard-next
annotation-claim-textarea
qa-return-confirm
export-download-EXP-001
```

Dynamic examples:

```txt
nav-dashboard
role-switch-admin
login-demo-qa
project-row-PRJ-001
task-open-annotation-CT-001
qa-review-open-CT-002
export-download-EXP-001
audit-row-A-001
```

Do not encode visual order, color, CSS class names, or temporary button wording in a test ID.

## 3. URL Contract

The app uses hash URLs synchronized from `VIEW_URL_MAP` in `src/testability.ts`.

| View | URL | Page root `data-testid` |
| --- | --- | --- |
| Login | `/#/login` | `view-login` |
| Dashboard | `/#/dashboard` | `view-dashboard` |
| Projects / PDF import | `/#/projects` | `view-projects` |
| Annotator tasks | `/#/tasks` | `view-tasks` |
| Annotation workspace | `/#/annotation` | `view-annotation` |
| QA queue | `/#/qa` | `view-qa` |
| QA review | `/#/qa-review` | `view-qaReview` |
| Export CSV | `/#/export` | `view-export` |
| Users | `/#/users` | `view-users` |
| Audit log | `/#/audit` | `view-audit` |
| Change password | `/#/change-password` | `view-changePassword` |

Route behavior:

| Case | Expected result |
| --- | --- |
| Fresh load while logged out | Render `view-login` and normalize to `/#/login`. |
| Any protected hash while logged out | Render `view-login` and normalize to `/#/login`. |
| Valid login | Render `view-dashboard` and navigate to `/#/dashboard`. |
| Nav click | Update rendered `view-*` root and matching hash URL. |
| Unknown hash | Fall back to dashboard after login. |

## 4. Global Shell Contract

These IDs are implemented in `src/testability.ts` and must exist whenever a user is logged in.

| Area | Required `data-testid` | Notes |
| --- | --- | --- |
| App shell | `app-shell` | Logged-in layout root. |
| Sidebar | `sidebar` | Left navigation area. |
| Primary nav | `primary-nav` | Role-specific nav container. |
| Main viewport | `main-viewport` | Render target for view roots. |
| Profile menu button | `profile-menu-button` | Opens account menu. |
| Profile menu | `profile-menu` | Conditional; visible only after opening. |
| Toast region | `toast-region` | Present on login and logged-in layouts. |

Profile menu actions should be testable:

| Control | Required `data-testid` |
| --- | --- |
| Change password action | `profile-change-password` |
| Logout action | `profile-logout` |

## 5. Role And Navigation Contract

Role switch IDs are implemented:

| Action | Required `data-testid` |
| --- | --- |
| Switch to ADMIN | `role-switch-admin` |
| Switch to ANNOTATOR | `role-switch-annotator` |
| Switch to QA | `role-switch-qa` |

Navigation IDs use `nav-{view}`:

| Role | Required nav IDs |
| --- | --- |
| ADMIN | `nav-dashboard`, `nav-projects`, `nav-export`, `nav-users`, `nav-audit` |
| ANNOTATOR | `nav-dashboard`, `nav-tasks`, `nav-annotation` |
| QA | `nav-dashboard`, `nav-qa`, `nav-qaReview`, `nav-export` |

Accessible labels:

| Control | Required pattern |
| --- | --- |
| Nav button | `Navigate to {label}` |
| Role switch | `Switch to {ROLE} role` |
| Profile menu button | `Open profile menu` |

## 6. Auth Contract

Valid demo credentials:

| Role | Email | Password | Demo button |
| --- | --- | --- | --- |
| ADMIN | `admin@vsf.local` | `admin-demo-2026` | `login-demo-admin` |
| ANNOTATOR | `annotator@vsf.local` | `annotator-demo-2026` | `login-demo-annotator` |
| QA | `qa@vsf.local` | `qa-demo-2026` | `login-demo-qa` |

Login selectors:

| Control | Required `data-testid` | Accessible label |
| --- | --- | --- |
| Page root | `view-login` | - |
| Email input | `login-email` | `Login email` |
| Password input | `login-password` | `Login password` |
| Submit button | `login-submit` | - |
| Demo account button | `login-demo-{role}` | `Use {ROLE} demo account` |

Behavior:

| Case | Expected result |
| --- | --- |
| Valid credentials | App enters workspace, lands on `/#/dashboard`, and renders `view-dashboard`. |
| Demo account click | Logs in as selected role and lands on `view-dashboard`. |
| Invalid email or password | App stays on `/#/login`, keeps `view-login`, and shows an error in `toast-region`. |
| Empty or malformed email | Native form validation or app validation prevents workspace entry. |

## 7. Dashboard Contract

| Area / control | Required `data-testid` |
| --- | --- |
| Page root | `view-dashboard` |
| Metric projects | `dashboard-metric-projects` |
| Metric submitted tasks | `dashboard-metric-submitted` |
| Metric approved tasks | `dashboard-metric-approved` |
| Metric export jobs | `dashboard-metric-exports` |
| Open projects shortcut | `dashboard-open-projects` |
| Open tasks shortcut | `dashboard-open-tasks` |
| Open annotation shortcut | `dashboard-open-annotation` |
| Open QA queue shortcut | `dashboard-open-qa` |
| Open export shortcut | `dashboard-open-export` |
| Open audit shortcut | `dashboard-open-audit` |
| Task snapshot table | `dashboard-task-table` |
| Open annotation task button | `dashboard-open-annotation-{taskId}` |
| Open QA task button | `dashboard-open-qa-{taskId}` |

## 8. Projects / PDF Import Contract

Page root: `view-projects`.

### Project List

| Area / control | Required `data-testid` |
| --- | --- |
| Project list panel | `project-list-panel` |
| Project summary table | `project-list-table` |
| Create new project button | `project-create-new` |
| Back to dashboard button | `project-back-dashboard` |
| Project row | `project-row-{projectId}` |
| Project detail button | `project-detail-{projectId}` |
| Project import button | `project-import-{projectId}` |

### Import Wizard

| Area / control | Required `data-testid` |
| --- | --- |
| Wizard panel | `project-wizard-panel` |
| Wizard stepper | `project-wizard-stepper` |
| Wizard step button | `project-wizard-step-{stepNumber}` |
| Previous step | `project-wizard-prev` |
| Next step | `project-wizard-next` |
| Back to project list | `project-back-list` |
| Complete wizard | `project-wizard-complete` |

Step 1 - project information:

| Control | Required `data-testid` |
| --- | --- |
| Project name input | `project-name-input` |
| Deadline input | `project-deadline-input` |
| Description textarea | `project-description-textarea` |
| Modality select | `project-modality-select` |

Step 2 - LLM configuration:

| Control | Required `data-testid` |
| --- | --- |
| Endpoint URL input | `project-llm-url-input` |
| API key input | `project-llm-api-key-input` |
| Provider select | `project-llm-provider-select` |
| Prompt template textarea | `project-prompt-template-textarea` |

Step 3 - upload:

| Control | Required `data-testid` |
| --- | --- |
| Upload zone | `project-upload-zone` |
| PDF file input | `project-pdf-files-input` |
| Answer PDF chip | `project-answer-pdf-chip` |
| Source reference PDF chip | `project-source-ref-pdf-chip` |
| Source content count chip | `project-source-count-chip` |
| Continue role assignment | `project-upload-continue` |

Step 4 - role assignment / validation:

| Control | Required `data-testid` |
| --- | --- |
| Bundle builder table | `project-bundle-builder-table` |
| Validate bundle button | `project-validate-bundle` |
| Validation panel | `project-validation-panel` |
| Preview parse button | `project-preview-parse` |

Step 5 - parse preview:

| Control | Required `data-testid` |
| --- | --- |
| Parse preview table | `project-parse-preview-table` |
| Warning banner | `project-parse-warning-banner` |
| Confirm import button | `project-confirm-import` |

Step 6 - pipeline:

| Control | Required `data-testid` |
| --- | --- |
| Pipeline status panel | `project-pipeline-panel` |
| Pipeline error demo panel | `project-pipeline-error-panel` |
| Assignment next button | `project-assignment-next` |

Step 7 - assignment:

| Control | Required `data-testid` |
| --- | --- |
| Annotator checkbox | `project-annotator-{userSlug}` |
| QA radio | `project-qa-{userSlug}` |
| Complete assignment button | `project-assignment-complete` |

Step 8 - detail:

| Control | Required `data-testid` |
| --- | --- |
| Project detail panel | `project-detail-panel` |
| Project detail task table | `project-detail-task-table` |
| Project detail task row | `project-detail-task-row-{taskId}` |

## 9. Annotator Tasks Contract

Page root: `view-tasks`.

| Area / control | Required `data-testid` |
| --- | --- |
| Assigned tasks table | `tasks-assigned-table` |
| Task row | `task-row-{taskId}` |
| Open annotation button | `task-open-annotation-{taskId}` |
| Status badge | `task-status-{taskId}` |

## 10. Annotation Workspace Contract

Page root: `view-annotation`.

| Area / control | Required `data-testid` |
| --- | --- |
| Breadcrumb | `annotation-breadcrumb` |
| Status badge | `annotation-status-badge` |
| Timer | `annotation-timer` |
| Returned warning | `annotation-returned-warning` |
| Answer panel | `annotation-answer-panel` |
| Question text | `annotation-question-text` |
| Answer text | `annotation-answer-text` |
| Highlighted claim | `annotation-highlighted-claim` |
| Scoring panel | `annotation-scoring-panel` |
| Reset claim button | `annotation-reset-claim` |
| Claim textarea | `annotation-claim-textarea` |
| Score input | `annotation-score-{dimension}` |
| Score delta | `annotation-delta-{dimension}` |
| Composite score | `annotation-composite-score` |
| Reason textarea | `annotation-reason-textarea` |
| Notes textarea | `annotation-notes-textarea` |
| Submit button | `annotation-submit` |
| Source panel | `annotation-source-panel` |
| Source card | `annotation-source-card-{sourceOrder}` |
| Source status select | `annotation-source-status-select` |
| Source note textarea | `annotation-source-note-textarea` |
| Reference tab rubric | `annotation-reference-tab-rubric` |
| Reference tab guideline | `annotation-reference-tab-guideline` |
| Reference tab examples | `annotation-reference-tab-examples` |
| Reference content | `annotation-reference-content` |

Dimensions are `SF`, `SC`, `NH`, `SQ`, `REL`, and `COMP`, so score IDs include values such as `annotation-score-SF`.

Validation behavior:

| Case | Expected result |
| --- | --- |
| Submit without source status | Stay on `view-annotation` and show validation toast in `toast-region`. |
| Source inaccessible without source note | Stay on `view-annotation` and show validation toast. |
| Delta greater than `0.20` without reason | Stay on `view-annotation` and show validation toast. |
| Valid submit | Task status becomes `Submitted` and success toast appears. |

## 11. QA Queue Contract

Page root: `view-qa`.

| Area / control | Required `data-testid` |
| --- | --- |
| Queue filter submitted | `qa-filter-submitted` |
| Queue filter returned | `qa-filter-returned` |
| Queue filter approved | `qa-filter-approved` |
| Queue search input | `qa-search-input` |
| Queue table | `qa-queue-table` |
| Empty state | `qa-empty-state` |
| Task row | `qa-row-{taskId}` |
| Open review button | `qa-review-open-{taskId}` |
| Status badge | `qa-status-{taskId}` |

## 12. QA Review Contract

Page root: `view-qaReview`.

| Area / control | Required `data-testid` |
| --- | --- |
| Breadcrumb | `qa-review-breadcrumb` |
| Back to queue button | `qa-back-queue` |
| Status badge | `qa-review-status-badge` |
| Review tab | `qa-review-tab-review` |
| History tab | `qa-review-tab-history` |
| Baseline panel | `qa-baseline-panel` |
| Annotator output panel | `qa-annotator-output-panel` |
| Delta panel | `qa-delta-panel` |
| Claim detail panel | `qa-claim-detail-panel` |
| Source detail panel | `qa-source-detail-panel` |
| Approve button | `qa-approve` |
| Return button | `qa-return-open` |
| History timeline | `qa-history-timeline` |

Return modal:

| Area / control | Required `data-testid` |
| --- | --- |
| Modal | `qa-return-modal` |
| Close button | `qa-return-close` |
| Error type select | `qa-return-type-select` |
| Comment textarea | `qa-return-comment-textarea` |
| Cancel button | `qa-return-cancel` |
| Confirm button | `qa-return-confirm` |

Behavior:

| Case | Expected result |
| --- | --- |
| Approve task | Task status becomes `Approved`, app returns to `view-qa`, toast appears. |
| Open return modal | `qa-return-modal` is visible. |
| Confirm return without type | Stay in modal and show validation toast. |
| Confirm return without comment | Stay in modal and show validation toast. |
| Valid return | Task status becomes `Returned`, app returns to `view-qa`, toast appears. |

## 13. Export Contract

These IDs are implemented in `src/testability.ts`.

| Control | Required `data-testid` | Accessible label |
| --- | --- | --- |
| Page root | `view-export` | - |
| Create export form | `export-create-form` | - |
| Project select | `export-project-select` | `Export project` |
| Batch select | `export-batch-select` | `Export batch` |
| Status select | `export-status-select` | `Export status filter` |
| Format select | `export-format-select` | `Export format` |
| Submit export | `export-submit` | - |
| Export history table | `export-history-table` | - |
| Download job button | `export-download-{jobId}` | `Download CSV for {jobId}` |

Behavior:

| Case | Expected result |
| --- | --- |
| Submit export form | Adds a new export job to `export-history-table` and shows a toast. |
| Download job button | Triggers the mocked CSV download behavior for the selected job. |

## 14. Users Contract

Page root: `view-users`.

| Area / control | Required `data-testid` |
| --- | --- |
| Users table | `users-table` |
| User row | `users-row-{userSlug}` |
| User role badge | `users-role-{userSlug}` |
| User status badge | `users-status-{userSlug}` |

## 15. Audit Log Contract

Page root: `view-audit`.

| Area / control | Required `data-testid` |
| --- | --- |
| Audit table | `audit-table` |
| Audit row | `audit-row-{auditId}` |
| Audit action cell | `audit-action-{auditId}` |
| Audit entity cell | `audit-entity-{auditId}` |

## 16. Change Password Contract

These IDs are implemented in `src/testability.ts`.

| Control | Required `data-testid` | Accessible label |
| --- | --- | --- |
| Page root | `view-changePassword` | - |
| Form | `change-password-form` | - |
| Current password input | `current-password-input` | `Current password` |
| New password input | `new-password-input` | `New password` |
| Confirm password input | `confirm-password-input` | `Confirm new password` |
| Cancel button | `change-password-cancel` | - |
| Submit button | `change-password-submit` | - |

Behavior:

| Case | Expected result |
| --- | --- |
| Cancel | Return to `view-dashboard`. |
| Mismatched confirmation | Stay on `view-changePassword` and show validation toast. |
| Valid update | Show success toast and return to `view-dashboard`. |

## 17. Accessible Label Contract

Interactive form controls should have one of:

1. A visible `<label>` associated with `htmlFor` and `id`.
2. A wrapping `<label>`.
3. A stable `aria-label` when a visible label is not practical.

Stable accessible labels currently required:

| Control | Label |
| --- | --- |
| Nav buttons | `Navigate to {label}` |
| Role buttons | `Switch to {ROLE} role` |
| Profile menu button | `Open profile menu` |
| Login email | `Login email` |
| Login password | `Login password` |
| Demo account buttons | `Use {ROLE} demo account` |
| Export selects | `Export project`, `Export batch`, `Export status filter`, `Export format` |
| Export download button | `Download CSV for {jobId}` |
| Password inputs | `Current password`, `New password`, `Confirm new password` |

## 18. Selector Policy

Allowed:

```ts
page.getByTestId("login-email");
page.getByTestId("view-dashboard");
page.getByTestId(`task-open-annotation-${taskId}`);
page.getByRole("button", { name: "Open profile menu" });
page.getByLabel("Export project");
```

Disallowed:

```ts
page.locator(".bg-blue-600");
page.locator("div > section:nth-child(2) button");
page.locator("//button[contains(text(), 'Approve')]");
page.locator("[class*=rounded-xl]");
```

## 19. Duplicate Test ID Guard

Add this helper to E2E smoke tests and run it on each major route after the view is loaded:

```ts
async function expectNoDuplicateTestIds(page) {
  const duplicates = await page.evaluate(() => {
    const counts = new Map();
    for (const el of document.querySelectorAll("[data-testid]")) {
      const id = el.getAttribute("data-testid");
      counts.set(id, (counts.get(id) || 0) + 1);
    }

    return Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([id, count]) => ({ id, count }));
  });

  expect(duplicates).toEqual([]);
}
```

Exception: duplicated IDs are never allowed in a rendered DOM. Conditional elements may reuse a constant only if they cannot be rendered at the same time.

## 20. Example Playwright Flows

Login as ADMIN:

```ts
await page.goto("/#/login");
await page.getByTestId("login-email").fill("admin@vsf.local");
await page.getByTestId("login-password").fill("admin-demo-2026");
await page.getByTestId("login-submit").click();
await expect(page.getByTestId("view-dashboard")).toBeVisible();
await expect(page).toHaveURL(/#\/dashboard$/);
```

Open export:

```ts
await page.getByTestId("nav-export").click();
await expect(page.getByTestId("view-export")).toBeVisible();
await page.getByTestId("export-submit").click();
await expect(page.getByTestId("export-history-table")).toBeVisible();
```

QA return validation:

```ts
await page.getByTestId("role-switch-qa").click();
await page.getByTestId("nav-qaReview").click();
await page.getByTestId("qa-return-open").click();
await expect(page.getByTestId("qa-return-modal")).toBeVisible();
await page.getByTestId("qa-return-confirm").click();
await expect(page.getByTestId("toast-region")).toBeVisible();
```

Annotation submit validation:

```ts
await page.getByTestId("role-switch-annotator").click();
await page.getByTestId("nav-annotation").click();
await page.getByTestId("annotation-submit").click();
await expect(page.getByTestId("toast-region")).toBeVisible();
```

## 21. PR Acceptance Checklist

A UI PR is not considered E2E-testable until these pass:

- [ ] Every page root has the required `view-*` ID.
- [ ] Every interactive control used by a test has a unique `data-testid`.
- [ ] Shared selectors are added to `src/testability.ts` when reused across components.
- [ ] Dynamic selectors use stable IDs such as task ID, project ID, user slug, export job ID, or audit ID.
- [ ] No duplicate `data-testid` exists in any rendered route state.
- [ ] Role-specific navigation is covered for ADMIN, ANNOTATOR, and QA.
- [ ] Login success and failure paths are covered.
- [ ] Project import wizard happy path is covered.
- [ ] Annotation validation and submit paths are covered.
- [ ] QA approve and return paths are covered.
- [ ] Export job creation is covered.
- [ ] Tests do not rely on CSS classes, layout position, or mutable visible copy.

## 22. Implementation Status

Implemented in `src/testability.ts` today:

- Core shell IDs.
- View root ID helper.
- Navigation and role switch helpers.
- Login selectors.
- Export selectors.
- Change password selectors.

Required by this spec but still expected to be added to components/constants:

- Dashboard control IDs.
- Project list and wizard IDs.
- Annotator task table IDs.
- Annotation workspace IDs.
- QA queue and QA review IDs.
- Profile menu action IDs.
- Users and audit table IDs.

When adding these IDs, update `src/testability.ts` first and consume constants from components instead of duplicating string literals inline.
