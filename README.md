# VSF AI Annotation Platform

VSF AI Annotation Platform là nền tảng nội bộ hỗ trợ chuẩn hóa quy trình đánh giá chất lượng đầu ra của mô hình ngôn ngữ lớn (LLM). Hệ thống được định hướng để thay thế cách làm thủ công trên spreadsheet bằng một workflow có cấu trúc, dễ theo dõi và có khả năng mở rộng cho nhiều loại dự án annotation trong tương lai.

Trong giai đoạn MVP hiện tại, dự án tập trung vào một use case duy nhất là **Vivipedia**, với một modality duy nhất là **text**. Mục tiêu là xây dựng được một luồng chạy end-to-end đủ dùng thực tế:

`Import PDF Bundle -> PDF Parsing -> Claim Extraction -> LLM Pre-scoring -> Annotator Review -> QA Review -> Export CSV`

## Mục tiêu MVP

- Chuẩn hóa quy trình annotation theo workflow rõ ràng
- Giảm thao tác thủ công khi review output của LLM
- Cho phép annotator và QA làm việc trên giao diện tập trung
- Xuất dữ liệu sạch phục vụ downstream processing
- Tạo nền tảng để mở rộng sang đa dự án và đa modality trong các phase tiếp theo

## Phạm vi hiện tại

MVP 4 tuần chỉ triển khai:

- `text annotation`
- `PDF Bundle import` gồm Answer PDF, Source Reference PDF và ít nhất 1 Source Content PDF
- `claim-level review`
- `QA Approve / Return`
- `CSV export`

Các hạng mục như dispute workflow, policy center, analytics nâng cao, audio/image workspace và security hardening đầy đủ sẽ được xem xét ở giai đoạn sau.

## Định hướng mở rộng

Mặc dù MVP chỉ build hẹp cho text, hệ thống được định hướng để về sau có thể hỗ trợ:

- nhiều loại dự án annotation
- nhiều loại input như `audio`, `image`
- cấu hình workflow linh hoạt hơn
- tích hợp analytics, policy management và quality control nâng cao

## Cấu trúc thư mục

```text
.
├── .github/                # Template hỗ trợ review và cộng tác
├── docs/                   # Tài liệu dự án
├── infra/                  # Hạ tầng, deploy, env setup
├── scripts/                # Script hỗ trợ import/export/dev
├── src/
│   ├── backend/            # API, services, business logic
│   ├── frontend/           # Web UI
│   └── shared/             # Shared contracts / schemas

```


