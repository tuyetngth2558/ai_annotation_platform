# Kế hoạch & Hướng dẫn Triển khai DevOps — MVP v0.4 (PDF-native)
**Dự án:** VSF AI Annotation Platform MVP  
**Phân vùng:** `docs/07_devops/tuananh/README.md`  
**Đối tượng:** Đội ngũ DevOps (Tuấn Anh, Khởi, Nhi)  

---

## 1. Bối cảnh Kỹ thuật & Yêu cầu Hạ tầng (MVP v0.4)

Theo cập nhật mới nhất từ BA (Kha & Quang), MVP đã chuyển dịch từ nhập file CSV/JSON phẳng sang **Nhập gói PDF (PDF Bundle Import)**. Thay đổi này tác động lớn đến hạ tầng DevOps:

1.  **Hệ thống Lưu trữ (Storage)**: Phải hỗ trợ lưu trữ tệp tin nhị phân (PDF gốc gồm: `answer_pdf`, `source_ref_pdf`, `source_content_pdf`). Giải pháp đề xuất cho MVP là **MinIO** (tương thích S3 API, dễ deploy bằng Docker) hoặc **AWS S3**.
2.  **Môi trường chạy bộ Parser & OCR (Backend Environment)**: Backend (Python/FastAPI) sẽ xử lý tác vụ trích xuất văn bản từ PDF. DevOps cần chuẩn bị các gói thư viện hệ điều hành (như `poppler-utils`, `tesseract-ocr` nếu cần chạy OCR) tích hợp sẵn trong Docker Container.
3.  **Cơ sở dữ liệu (Database)**: Sử dụng **PostgreSQL** để lưu trữ các bảng quan hệ phức tạp (ERD v0.4) và hỗ trợ lưu trường JSONB (cho `PDF_PARSE_RESULT`, `metadata_json`, `audit_log`).
4.  **Bảo mật LLM & Khóa API (Secrets)**: Tích hợp API key của LLM provider. Bắt buộc cấu hình mã hóa khóa này khi lưu trữ (Encryption-at-Rest).

---

## 2. Phân công Vai trò & Nhiệm vụ Chi tiết (DevOps Team)

### 2.1. Tuấn Anh (CI/CD, DB, Storage, Release)
*   **Thiết lập Storage**: Deploy cụm **MinIO** trên Staging/Dev, cấu hình bucket `pdf-bundles` và phân quyền Access Key/Secret Key cho ứng dụng.
*   **Triển khai DB**: Cài đặt và tối ưu hóa cụm **PostgreSQL**, phân chia schema rõ ràng.
*   **Pipeline CI/CD**: Xây dựng luồng tự động bằng **GitHub Actions**:
    *   *CI*: Tự động chạy Lint (ESLint/Flake8), chạy Unit Test khi có PR vào nhánh `main`/`develop`.
    *   *CD*: Tự động build Docker Image, push lên Registry (Docker Hub/GHCR) và deploy trực tiếp lên server Staging khi merge PR.
*   **Đóng gói & Release**: Quản lý Dockerize toàn bộ source code (Frontend, Backend). Phụ trách tag version và release tuần 4.

### 2.2. Khởi (Hạ tầng, Staging, Logs, Secrets)
*   **Thiết lập Hạ tầng**: Cấu hình VPS/Server cài đặt Docker & Docker Compose cho môi trường Dev và Staging. Cấu hình Nginx làm Reverse Proxy, cài đặt SSL (Let's Encrypt).
*   **Secret Management**: Cài đặt cấu hình biến môi trường (`.env` bảo mật). Hướng dẫn lập trình viên sử dụng thư viện mã hóa API Key (ví dụ dùng `cryptography` trong Python hoặc `pgcrypto` trong Postgres).
*   **Giám sát Logs trung tâm**: Thiết lập luồng log thu thập từ Docker. Trong MVP, cấu hình log ghi ra file có rotation hoặc sử dụng công cụ tối giản như **Grafana Loki** / **EFK** để Admin xem logs.

### 2.3. Nhi (Vận hành, Migration, Backup)
*   **Database Migration**: Hỗ trợ nhóm Dev thiết lập công cụ migration (ví dụ **Alembic** cho Python hoặc **Knex/Prisma** cho Node). Đảm bảo pipeline CD tự động chạy migration trước khi khởi động code mới.
*   **Quản lý Env & Domain**: Quản lý cấu hình DNS, sub-domain cho môi trường dev (`dev.annotation.vsf...`) và staging (`staging.annotation.vsf...`).
*   **Hệ thống Backup**: Viết script backup tự động (cronjob) cho database (sử dụng `pg_dump` mỗi ngày) và thư mục tệp tin MinIO, nén và lưu trữ sang server backup riêng biệt.

---

## 3. Lộ trình Triển khai DevOps (4 Tuần)

```mermaid
gantt
    title Lộ trình DevOps MVP (4 Tuần)
    dateFormat  YYYY-MM-DD
    section Tuần 1: Nền tảng
    Setup Server Dev/Staging & Nginx        :active, 2026-06-08, 3d
    Deploy PostgreSQL & MinIO               :active, 2026-06-11, 3d
    Setup Secret Management & Env Baseline  : 2026-06-13, 2d
    section Tuần 2: CI/CD & Logic
    Dockerize App (FE & BE)                : 2026-06-15, 3d
    Setup GitHub Actions (CI - Lint/Test)  : 2026-06-18, 2d
    Config LLM Conn Variables              : 2026-06-20, 2d
    section Tuần 3: Deploy & Logs
    CD Pipeline (Auto deploy Staging)      : 2026-06-22, 3d
    Setup Central Logging & Audit logs     : 2026-06-25, 2d
    Setup DB Migrations                    : 2026-06-27, 2d
    section Tuần 4: Vận hành & Release
    Backup & Restore Validation            : 2026-06-29, 2d
    UAT & Performance Tuning               : 2026-07-01, 3d
    Final Release Checklist & Packaging    : 2026-07-04, 2d
```

---

## 4. Hướng dẫn Kỹ thuật Chi tiết cho Từng Phân Hệ

### 4.1. Đóng gói Ứng dụng (Dockerization)
Cần viết `Dockerfile` đa giai đoạn (multi-stage build) để tối ưu dung lượng ảnh (image size).

*   **Dockerfile Backend (Python/FastAPI gợi ý)**:
    ```dockerfile
    FROM python:3.10-slim AS builder
    WORKDIR /app
    RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        poppler-utils \
        tesseract-ocr \
        libtesseract-dev \
        && rm -rf /var/lib/apt/lists/*
    COPY requirements.txt .
    RUN pip install --no-cache-dir --user -r requirements.txt

    FROM python:3.10-slim
    WORKDIR /app
    RUN apt-get update && apt-get install -y --no-install-recommends \
        poppler-utils \
        tesseract-ocr \
        libpq5 \
        && rm -rf /var/lib/apt/lists/*
    COPY --from=builder /root/.local /root/.local
    COPY . .
    ENV PATH=/root/.local/bin:$PATH
    EXPOSE 8000
    CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
    ```

### 4.2. Thiết lập Môi trường Lưu trữ (MinIO Setup) & docker-compose đầy đủ

> **Lưu ý:** File `docker-compose.yml` dưới đây là cấu hình đầy đủ cho môi trường Staging, bao gồm tất cả services.

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:1.25-alpine
    container_name: nginx_proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
      - frontend
    networks:
      - app_network

  frontend:
    image: ghcr.io/vsf/annotation-frontend:${APP_VERSION:-latest}
    container_name: frontend
    environment:
      - NEXT_PUBLIC_API_URL=${API_URL}
    networks:
      - app_network

  backend:
    image: ghcr.io/vsf/annotation-backend:${APP_VERSION:-latest}
    container_name: backend
    environment:
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/annotation_db
      - MINIO_ENDPOINT=minio:9000
      - MINIO_ACCESS_KEY=${MINIO_ROOT_USER}
      - MINIO_SECRET_KEY=${MINIO_ROOT_PASSWORD}
      - MINIO_BUCKET_PDF=pdf-bundles
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - LLM_API_KEY=${LLM_API_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      minio:
        condition: service_healthy
    networks:
      - app_network

  minio:
    image: minio/minio:RELEASE.2023-09-07T01-16-20Z
    container_name: minio_storage
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - app_network

  postgres:
    image: postgres:15-alpine
    container_name: db_postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: annotation_db
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d annotation_db"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app_network

networks:
  app_network:
    driver: bridge

volumes:
  minio_data:
  pg_data:
```

### 4.3. Nginx Config (Reverse Proxy + Upload size cho PDF)

> **Quan trọng:** PDF bundle có thể lên đến hàng chục MB. Phải cấu hình `client_max_body_size` đủ lớn, nếu không Nginx sẽ trả `413 Request Entity Too Large` khi upload.

Tạo file `nginx/nginx.conf`:
```nginx
events { worker_connections 1024; }

http {
    client_max_body_size 200M;  # cho phép upload PDF bundle lớn

    upstream backend {
        server backend:8000;
    }

    upstream frontend {
        server frontend:3000;
    }

    server {
        listen 80;
        server_name staging.annotation.vsf.vn;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl;
        server_name staging.annotation.vsf.vn;

        ssl_certificate     /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        # API routes
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_read_timeout 300s;   # PDF parsing có thể chậm
        }

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
        }
    }
}
```

### 4.4. Quản lý Secret & Mã hóa API Key

Tạo file `.env.example` (commit vào git, không commit `.env` thật):
```dotenv
# App
APP_VERSION=latest
API_URL=https://staging.annotation.vsf.vn/api

# Database
DB_USER=annotation_user
DB_PASSWORD=CHANGE_ME

# MinIO (Object Storage)
MINIO_ROOT_USER=CHANGE_ME
MINIO_ROOT_PASSWORD=CHANGE_ME

# Encryption (dùng Fernet key — tạo bằng: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
ENCRYPTION_KEY=CHANGE_ME

# LLM Provider
LLM_API_KEY=CHANGE_ME
LLM_PROVIDER=openai
```

**Quy tắc bảo mật:**
- Tuyệt đối không hardcode API Key hay DB Password vào Git.
- Sử dụng **GitHub Secrets** để truyền biến vào CD và Docker container.
- Khi Admin lưu LLM Connection, Backend dùng `Fernet` (`cryptography` Python) với `ENCRYPTION_KEY` từ env để mã hóa cột `api_key` trước khi ghi xuống Postgres.

### 4.5. Async PDF Parsing — Background Job

PDF parsing (đặc biệt file lớn hoặc nhiều file trong một bundle) **không nên chạy synchronous** trong request cycle vì sẽ gây timeout.

**Giải pháp MVP đề xuất:** Dùng **FastAPI Background Tasks** (tích hợp sẵn, không cần thêm broker):

```python
# Trong API endpoint upload bundle
from fastapi import BackgroundTasks

@router.post("/bundles/upload")
async def upload_bundle(files: list[UploadFile], background_tasks: BackgroundTasks):
    bundle_id = create_bundle_record()
    background_tasks.add_task(parse_pdf_bundle, bundle_id)
    return {"bundle_id": bundle_id, "status": "queued"}
```

Frontend poll `GET /bundles/{bundle_id}/status` để theo dõi tiến trình parse.

> **Nếu scale sau MVP:** Chuyển sang **Celery + Redis** khi cần retry logic, priority queue hoặc distributed workers.

### 4.6. GitHub Actions — CI/CD Workflow

Tạo file `.github/workflows/ci-cd.yml`:
```yaml
name: CI/CD Pipeline

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  ci:
    name: Lint & Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with: { python-version: '3.10' }

      - name: Install dependencies
        run: pip install -r src/backend/requirements.txt

      - name: Lint (Flake8)
        run: flake8 src/backend/

      - name: Run Tests
        run: pytest src/backend/tests/

  cd:
    name: Build & Deploy Staging
    runs-on: ubuntu-latest
    needs: ci
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build & Push Backend Image
        uses: docker/build-push-action@v5
        with:
          context: src/backend
          push: true
          tags: ghcr.io/vsf/annotation-backend:${{ github.sha }}

      - name: Deploy to Staging
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /opt/annotation
            export APP_VERSION=${{ github.sha }}
            docker compose pull
            docker compose run --rm backend alembic upgrade head
            docker compose up -d
```

> **Điểm quan trọng:** CD pipeline chạy `alembic upgrade head` **trước** khi khởi động code mới để đảm bảo schema DB luôn đồng bộ.

### 4.7. Cơ chế Backup dữ liệu (Nhi thực hiện)
Tạo script `backup.sh` chạy định kỳ bằng cronjob lúc 2:00 AM hàng ngày:
```bash
#!/bin/bash
BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_CONTAINER="db_postgres"
DB_NAME="annotation_db"
DB_USER="annotation_user"
MINIO_CONTAINER="minio_storage"

# 1. Backup Database (PostgreSQL)
docker exec $DB_CONTAINER pg_dump -U $DB_USER -d $DB_NAME -F c -b -v \
  -f /tmp/db_backup_$TIMESTAMP.dump
docker cp $DB_CONTAINER:/tmp/db_backup_$TIMESTAMP.dump $BACKUP_DIR/

# 2. Backup MinIO PDF files (mirror toàn bộ bucket ra local)
docker exec $MINIO_CONTAINER mc mirror /data/pdf-bundles \
  $BACKUP_DIR/minio_$TIMESTAMP/

# 3. Nén toàn bộ
tar -czf $BACKUP_DIR/backup_$TIMESTAMP.tar.gz \
  $BACKUP_DIR/db_backup_$TIMESTAMP.dump \
  $BACKUP_DIR/minio_$TIMESTAMP/

# 4. Xóa file tạm và backup cũ hơn 7 ngày
rm -f $BACKUP_DIR/db_backup_$TIMESTAMP.dump
rm -rf $BACKUP_DIR/minio_$TIMESTAMP/
find $BACKUP_DIR -type f -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: backup_$TIMESTAMP.tar.gz"
```

---

## 5. Checklist Bắt đầu — Tuấn Anh làm theo thứ tự này

### Bước 1: Tạo cấu trúc thư mục infra trong repo
```
infra/
├── docker-compose.yml          ← copy từ section 4.2
├── docker-compose.dev.yml      ← override cho local dev (port expose thêm)
├── nginx/
│   └── nginx.conf              ← copy từ section 4.3
├── scripts/
│   ├── backup.sh               ← copy từ section 4.7
│   └── init_minio_bucket.sh   ← script tạo bucket lần đầu (xem dưới)
└── .env.example                ← copy từ section 4.4
```

### Bước 2: Script tạo MinIO bucket lần đầu (`init_minio_bucket.sh`)
Chạy một lần sau khi MinIO container đã up:
```bash
#!/bin/bash
# Chạy: bash infra/scripts/init_minio_bucket.sh
MINIO_CONTAINER="minio_storage"
MINIO_ALIAS="local"
BUCKET_NAME="pdf-bundles"

# Cài mc (MinIO client) vào container nếu chưa có
docker exec $MINIO_CONTAINER sh -c "
  mc alias set $MINIO_ALIAS http://localhost:9000 \$MINIO_ROOT_USER \$MINIO_ROOT_PASSWORD &&
  mc mb --ignore-existing $MINIO_ALIAS/$BUCKET_NAME &&
  mc anonymous set private $MINIO_ALIAS/$BUCKET_NAME
"
echo "Bucket '$BUCKET_NAME' ready."
```

### Bước 3: Tạo GitHub Actions workflow
Tạo `.github/workflows/ci-cd.yml` — copy từ section 4.6.
Cần thêm các GitHub Secrets sau vào repo settings:
| Secret name | Giá trị |
|---|---|
| `STAGING_HOST` | IP hoặc domain của server staging |
| `STAGING_USER` | SSH user (thường là `ubuntu` hoặc `root`) |
| `STAGING_SSH_KEY` | Private key SSH (PEM format) |

### Bước 4: Chờ unblock từ team trước khi làm tiếp
| Cần chờ | Từ ai |
|---|---|
| Tên GitHub repo/org để điền vào `ghcr.io/vsf/...` | Quản lý dự án |
| Backend models + Alembic init để có migration | Backend dev |
| VPS/server staging — IP + SSH access | Khởi |
| DNS domain staging trỏ đúng | Nhi |

---

## 6. Danh sách Đầu ra Nghiệm thu (UAT Deliverables)
Đội DevOps cần đảm bảo bàn giao đủ 5 hạng mục sau ở cuối tuần 4:
1.  **Hạ tầng chạy thực tế**: Link URL truy cập môi trường Staging (FE, BE API Swagger).
2.  **Thông tin cấu hình**: File cấu hình mẫu `.env.example` và guideline cấu hình Secrets.
3.  **CI/CD Pipeline**: Các file định nghĩa workflow `.github/workflows/` hoạt động tốt.
4.  **Tài liệu hướng dẫn vận hành**: Hướng dẫn deploy mới, update phiên bản và quy trình phục hồi dữ liệu từ bản backup.
5.  **Hệ thống Log trung tâm**: Endpoint truy cập xem logs hoạt động ổn định cho Admin.
