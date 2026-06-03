# Contributing Guide

## Mục tiêu

Tài liệu này giúp mọi người trong team push code và docs theo cùng một chuẩn.

## 1. Trước khi push

- Pull nhánh mới nhất
- Kiểm tra file mình sửa nằm đúng thư mục
- Đặt tên file dễ hiểu
- Với docs: ghi rõ phiên bản, owner, ngày cập nhật nếu cần

## 2. Quy ước branch

- `main`: ổn định
- `dev`: tích hợp
- `feature/...`: phát triển tính năng
- `docs/...`: cập nhật tài liệu
- `fix/...`: sửa lỗi

Ví dụ:

- `feature/import-dataset`
- `feature/annotation-workspace`
- `docs/ba-research-plan-update`

## 3. Quy ước commit

Dùng commit message ngắn, rõ nghĩa:

- `chore: create repository structure`
- `docs: add screen specification for MVP`
- `feat: add import dataset API`
- `fix: validate source status before submit`

## 4. Quy ước tài liệu

- Tài liệu BA đặt trong `docs/03_ba/`
- Tài liệu sơ đồ đặt trong `docs/04_diagrams/`
- Tài liệu test đặt trong `docs/06_test_qa/`
- Tài liệu DevOps đặt trong `docs/07_devops/`

## 5. Quy ước review

Trước khi merge:

- BA check logic nghiệp vụ
- UI/UX check flow màn hình nếu có ảnh hưởng giao diện
- Dev check tính khả thi kỹ thuật
- Test/QA check acceptance criteria và test impact

## 6. Không nên làm

- Không push file tạm hoặc file build nặng
- Không đặt tài liệu mới lung tung ở root nếu đã có thư mục phù hợp
- Không đổi cấu trúc repo mà không thông báo team
