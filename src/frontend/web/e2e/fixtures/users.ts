/** E2E test data — user mock. Khớp backend app/features/auth/service.py. */

export const USERS = {
  admin: { email: "admin@vsf.local", password: "admin-demo-2026", role: "ADMIN" },
  annotator: {
    email: "annotator@vsf.local",
    password: "annotator-demo-2026",
    role: "ANNOTATOR",
  },
  qa: { email: "qa@vsf.local", password: "qa-demo-2026", role: "QA" },
} as const;
