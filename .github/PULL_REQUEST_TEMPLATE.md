<!-- Tiêu đề PR theo Conventional Commits: <type>(<scope>): <mô tả> -->

## Mô tả

<!-- Làm gì và TẠI SAO. Link issue/ticket nếu có (Fixes #...). -->

## Loại thay đổi

- [ ] feat — tính năng mới
- [ ] fix — sửa bug
- [ ] refactor — cải thiện code
- [ ] docs — tài liệu
- [ ] chore — việc lặt vặt
- [ ] breaking change

## Scope

- [ ] Frontend
- [ ] Backend
- [ ] Docs
- [ ] DevOps
- [ ] Test/QA

## Thay đổi chính

<!-- liệt kê 2-4 ý chính -->
-

## Checklist (bắt buộc)

- [ ] Code đúng [CONVENTIONS.md](../CONVENTIONS.md), đặt đúng feature
- [ ] Backend: `ruff check` sạch · Frontend: `npm run build` pass
- [ ] Có test (hoặc giải thích vì sao không cần)
- [ ] Không commit `.env`/secret; không log secret/PII
- [ ] **✅ Đã cập nhật [docs/PROJECT_STATE.md](../docs/PROJECT_STATE.md)** — ô feature×role
      tương ứng (chống context drift — KHÔNG tick = KHÔNG merge)
- [ ] Nếu chốt quyết định kiến trúc: đã thêm ADR vào `docs/adr/`

## Test

- [ ] Đã test local
- [ ] Đã thêm/cập nhật tests
- [ ] Không cần test (lý do: ___)

## Screenshots (nếu đổi UI)

## Notes cho reviewer

<!-- điểm cần review kỹ, rủi ro còn lại, dependency/follow-up -->
