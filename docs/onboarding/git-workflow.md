# Git Workflow — Quy ước cho team

> Chuẩn hóa cách đẩy code lên GitHub: branch, commit, PR, review. **Mọi người + AI theo
> chung** để lịch sử git sạch và dễ review.

---

## 1. Branch strategy

- **KHÔNG push thẳng `main`.** Luôn làm trên feature branch.
- Đặt tên branch theo loại việc:

| Loại | Mẫu | Ví dụ |
|---|---|---|
| Tính năng | `feat/<feature>-<mô-tả>` | `feat/import-bundle-upload` |
| Sửa bug | `fix/<mô-tả>` | `fix/login-email-validation` |
| Refactor | `refactor/<mô-tả>` | `refactor/scoring-helper` |
| Tài liệu | `docs/<mô-tả>` | `docs/onboarding-guides` |
| Hạ tầng | `chore/<mô-tả>` | `chore/docker-compose-redis` |

```bash
git checkout main && git pull
git checkout -b feat/import-bundle-upload
```

---

## 2. Conventional Commits

Format: `<type>(<scope>): <mô tả>`

| Type | Dùng khi | Ví dụ |
|---|---|---|
| `feat` | thêm tính năng | `feat(import): thêm validate PDF bundle` |
| `fix` | sửa bug | `fix(auth): chấp nhận email .local cho mock login` |
| `chore` | việc lặt vặt (deps, config) | `chore(deps): thêm pydantic[email]` |
| `docs` | tài liệu | `docs(onboarding): thêm guide backend dev` |
| `refactor` | cải thiện code không đổi hành vi | `refactor(scoring): tách composite_score` |
| `test` | thêm/sửa test | `test(annotation): test ngưỡng justification` |
| `perf` | tối ưu hiệu năng | |
| `ci` | CI/CD | `ci: thêm bước lint vào pipeline` |

**Scope** = feature/module (`auth`, `import`, `annotation`, `qa`, `export`, `infra`, `web`...).

**Quy tắc subject:**
- Động từ nguyên thể: "thêm", "sửa", "xóa" (không "đã thêm")
- ≤72 ký tự, không dấu chấm cuối
- Tiếng Việt hoặc Anh, **nhất quán**

**Body** (khi cần): giải thích **tại sao**, không phải làm gì (diff đã rõ làm gì).

**Nhiều loại thay đổi → tách commit:**
```bash
git add src/backend/app/features/import_bundle/
git commit -m "feat(import): thêm endpoint validate bundle"
git add src/backend/tests/
git commit -m "test(import): test validate bundle rules"
```

---

## 3. Trước khi commit (checklist)

- [ ] Code đúng [CONVENTIONS.md](../../CONVENTIONS.md)
- [ ] Backend: `ruff check` sạch · Frontend: `npm run build` pass
- [ ] Có test nếu là logic
- [ ] **Đã cập nhật [docs/PROJECT_STATE.md](../PROJECT_STATE.md)** (ô feature×role)
- [ ] Không commit `.env`/secret
- [ ] Type + scope commit đúng

---

## 4. Push & Pull Request

```bash
git push origin feat/import-bundle-upload
gh pr create --base main --fill        # hoặc tạo PR trên GitHub UI
```

PR dùng template `.github/PULL_REQUEST_TEMPLATE.md` (tự điền sẵn). **Bắt buộc** tick các
checkbox — đặc biệt **"đã cập nhật PROJECT_STATE"** (chốt chặn chống context drift).

**Quy tắc PR:**
- Tiêu đề theo Conventional Commits.
- Mô tả rõ làm gì + tại sao; có screenshot nếu đổi UI.
- 1 PR = 1 việc logic (đừng gộp nhiều feature không liên quan).
- Cần ≥1 review approve trước khi merge (nếu team set branch protection).

---

## 5. Code Review

**Người review kiểm:**
- Đúng convention + đặt đúng feature?
- Có RBAC (backend) / RoleGuard (frontend) đúng role?
- Validate input? Lỗi xử lý đúng (AppError)?
- Có test? Test bám AC/VR?
- Không log secret? Không commit `.env`?
- **PROJECT_STATE đã cập nhật?**

> Có thể chạy `/code-review` (Claude) trên branch để review tự động trước khi nhờ người.

---

## 6. Merge & dọn dẹp

```bash
# Sau khi PR approved + CI pass:
# (merge qua GitHub UI — Squash and merge khuyến nghị để lịch sử gọn)
git checkout main && git pull
git branch -d feat/import-bundle-upload     # xóa branch local đã merge
```

---

## 7. Lưu ý cho AI agents

AI (Claude/Cursor) khi được yêu cầu commit/push:
- Tạo feature branch nếu đang ở `main`.
- Commit message theo Conventional Commits.
- **Cập nhật PROJECT_STATE trước khi báo xong.**
- KHÔNG tự push/merge khi chưa được phép.
- Kết thúc commit message với dòng `Co-Authored-By` nếu AI hỗ trợ (tùy chính sách team).

## Tham chiếu
- Convention code: [CONVENTIONS.md](../../CONVENTIONS.md)
- Trạng thái dự án: [docs/PROJECT_STATE.md](../PROJECT_STATE.md)
- PR template: [.github/PULL_REQUEST_TEMPLATE.md](../../.github/PULL_REQUEST_TEMPLATE.md)
