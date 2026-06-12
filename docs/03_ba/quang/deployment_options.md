# Phương Án Triển Khai Vivipedia Annotation Tool (MVP & Scale)

> **⚠️ Research only — không phải baseline triển khai MVP 4 tuần**
>
> Tài liệu này là **nghiên cứu so sánh chi phí** (Streamlit/Hugging Face, v.v.) từ giai đoạn đầu dự án.
> **Baseline triển khai đã chốt** theo scaffold: **FastAPI + React + ARQ worker**, deploy theo:
>
> - `ai_annotation_platform-feat-scaffold-base/docs/05_architecture/tech-selection/07-deployment.md`
> - `ai_annotation_platform-feat-scaffold-base/docs/05_architecture/tech-selection/08-llm-provider.md` (Gemini 2.5 Flash qua `LLMProvider`)
>
> Giữ file này để tham khảo cost/scale tương lai; **Dev không implement theo Option Streamlit/HF** trong sprint MVP.

---

Tài liệu này phân tích 3 phương án (Option) triển khai hệ thống annotation dữ liệu RAG, từ mức kiểm thử miễn phí đến hệ thống SaaS thương mại quy mô lớn, dựa trên các tiêu chí: **Chi phí (Cost)**, **API (LLM & Search)**, và **Khả năng mở rộng (Scalability)**.

---

## Bảng So Sánh Tổng Quan

| Tiêu chí | Option 1: Zero-Cost MVP | Option 2: Managed Container | Option 3: Enterprise Serverless |
| :--- | :--- | :--- | :--- |
| **Mục tiêu** | Kiểm thử nhanh, tối ưu chi phí | Khởi chạy thực tế, đông người dùng | Thương mại hóa SaaS, chịu tải lớn |
| **Ứng dụng chính** | Streamlit / Gradio | Streamlit / FastAPI | Next.js + FastAPI |
| **Hosting** | Hugging Face Spaces ($0) | Render / Railway ($5 - $7) | Vercel + AWS Lambda/Cloud Run |
| **LLM API** | Gemini AI Studio (Free) | Gemini AI Studio (Paid) | OpenRouter / Direct Enterprise |
| **Web Search** | DuckDuckGo Search ($0) | Tavily Starter ($15 - $29) | Tavily / Google Search API |
| **Ước tính phí** | **$0 / tháng** | **~$20 - $45 / tháng** | **$150+ / tháng** (theo lượng dùng) |
| **Khả năng scale** | Thấp - Trung bình | Trung bình - Cao | Vô hạn (Serverless) |

---

## Chi Tiết Các Phương Án Triển Khai

### 🚀 OPTION 1: Serverless & Zero-Cost MVP (Tối Ưu Chi Phí)
*Phù hợp cho giai đoạn thử nghiệm nội bộ, lượng dữ liệu nhỏ, cần đưa ra thị trường nhanh nhất với chi phí bằng $0.*

#### 1. Kiến Trúc & Công Nghệ
*   **Frontend & Backend:** Viết ứng dụng web bằng **Streamlit** (Python). Streamlit cho phép chuyển đổi giao diện Tkinter hiện tại sang giao diện Web chỉ mất khoảng 100-150 dòng code.
*   **Hosting:** Deploy lên **Hugging Face Spaces** ở gói CPU Basic (Hoàn toàn miễn phí, chạy 24/7). Không bị giới hạn thời gian chạy (timeout) câu lệnh như Vercel/AWS Lambda miễn phí.

#### 2. Cấu Hình API
*   **LLM API:** Sử dụng trực tiếp **Gemini API qua Google AI Studio** bản Free Tier.
    *   *Hạn mức:* 15 Requests/phút, 1500 Requests/ngày.
    *   *Chi phí:* $0.
*   **Web Search:** Sử dụng thư viện Python **`duckduckgo-search`** để tự cào kết quả từ DuckDuckGo thay vì Tavily.
    *   *Chi phí:* $0.

#### 3. Đánh Giá
*   **Chi phí:** **$0 / tháng**.
*   **Scalability (Khả năng scale):** Thấp. Nếu nhiều hơn 2-3 người cùng bấm chạy annotation cùng một lúc, hệ thống sẽ bị chậm (do CPU của Hugging Face miễn phí có giới hạn) hoặc bị chạm ngưỡng Rate Limit 15 RPM của Gemini Free Tier.

---

### ⚖️ OPTION 2: Managed Container & Pay-as-you-go (Cân Bằng Nhất)
*Phù hợp khi bắt đầu có người dùng thực tế bên ngoài, cần chạy ổn định, chuyên nghiệp nhưng vẫn kiểm soát tốt dòng tiền.*

#### 1. Kiến Trúc & Công Nghệ
*   **Frontend & Backend:** Ứng dụng Streamlit hoặc viết API Backend tách riêng bằng **FastAPI** và Frontend bằng HTML/JS đơn giản.
*   **Hosting:** Triển khai dưới dạng Docker container lên các nền tảng PaaS như **Render.com** hoặc **Railway.app**.
    *   *Cấu hình khuyến nghị:* 1 CPU, 512MB hoặc 1GB RAM. Chạy liên tục ổn định.
    *   *Chi phí hosting:* $5 - $7 / tháng.

#### 2. Cấu Hình API
*   **LLM API:** Kích hoạt gói trả phí (Pay-as-you-go) trên **Google AI Studio** với model **Gemini 2.5 Flash**.
    *   *Chi phí:* $0.075 / 1 triệu input tokens và $0.30 / 1 triệu output tokens. 
    *   *Ưu điểm:* Không còn giới hạn 1500 RPD, tốc độ phản hồi cực nhanh, chi phí siêu rẻ (chạy 100 bài viết đầy đủ chỉ tốn khoảng $1 - $2 tiền API).
*   **Web Search:** Sử dụng **Tavily Search API** gói Starter ($15/tháng cho 5.000 lượt search) để đảm bảo chất lượng tìm kiếm học thuật/chính phủ tối ưu nhất cho RAG.

#### 3. Đánh Giá
*   **Chi phí:** **~$20 - $45 / tháng** (bao gồm hosting và tiền sử dụng API thực tế).
*   **Scalability (Khả năng scale):** Trung bình - Cao. Máy chủ Render/Railway có thể dễ dàng tăng tài nguyên (scale up) khi số lượng người dùng đồng thời tăng lên. Gói Gemini API trả phí đáp ứng thoải mái hàng vạn request mỗi ngày.

---

### 🏢 OPTION 3: Enterprise Web App & Serverless (Quy Mô Doanh Nghiệp)
*Phù hợp khi xây dựng ứng dụng SaaS thương mại chuyên nghiệp, lượng người dùng lớn, đòi hỏi bảo mật cao và khả năng scale tự động.*

#### 1. Kiến Trúc & Công Nghệ
*   **Frontend:** Viết bằng **React / Next.js**, deploy lên **Vercel** (Free hoặc Pro - $20/tháng). Giao diện tải nhanh, mượt mà và bảo mật.
*   **Backend:** Viết bằng **FastAPI**, đóng gói Docker và deploy lên **Google Cloud Run** hoặc **AWS Lambda** (kết hợp API Gateway).
    *   *Cấu chế hoạt động:* Serverless backend tự động bật lên khi có request và tắt đi khi không dùng (scale-to-zero). Không sợ timeout vì Cloud Run hỗ trợ timeout lên tới 60 phút.
    *   *Chi phí hosting:* Tính theo mili-giây CPU thực tế chạy, cực kỳ rẻ khi rảnh rỗi.

#### 2. Cấu Hình API
*   **LLM API:** Kết nối qua **OpenRouter** hoặc trực tiếp **Gemini Enterprise API (Google Cloud Vertex AI)**.
    *   Cho phép linh hoạt chuyển đổi giữa Gemini 2.5 Flash (tiết kiệm), Gemini 2.5 Pro (khi cần suy nghĩ sâu nâng cao) và DeepSeek R1 (khi cần reasoning phức tạp).
*   **Web Search:** Sử dụng **Tavily Scale Tier** hoặc **Google Custom Search JSON API** / **Bing Search API** để có hạn mức hàng vạn lượt tìm kiếm mỗi ngày.

#### 3. Đánh Giá
*   **Chi phí:** Từ **$150+ / tháng** (chủ yếu là chi phí cố định cho các API tìm kiếm quy mô lớn và phí Next.js Pro).
*   **Scalability (Khả năng scale):** Vô hạn. Cả Vercel, Cloud Run và Vertex AI đều tự động scale ngang (scale out) để phục vụ hàng triệu người dùng cùng lúc mà không sợ bị sập server hay nghẽn mạng.

---

## 🧩 Lựa Chọn LLM API & Tính Linh Hoạt (Flexibility)

Để tránh việc phụ thuộc độc quyền vào một nhà cung cấp (Vendor Lock-in) và cho phép linh hoạt đổi model tùy theo nhu cầu và ngân sách, chúng ta nên thiết kế lớp kết nối API chuẩn hóa theo định dạng **OpenAI Chat Completion**. 

Dưới đây là 3 Option API linh hoạt có thể thay đổi nhanh bằng cách đổi `Base URL`, `API Key`, và `Model Name` trong file cấu hình:

### 1. Google AI Studio (Gemini API) — Tối Ưu Cho Tốc Độ & Chi Phí Thấp
*   **Các Model:** `gemini-2.5-flash` (nhanh/rẻ), `gemini-2.5-pro` (chất lượng cao/thinking).
*   **Lý do chọn:** Chi phí đầu vào rẻ nhất hiện nay. Hỗ trợ cửa sổ ngữ cảnh khổng lồ (2M+ tokens) rất tốt nếu cần nhồi file RAG cực lớn.
*   **Base URL:** `https://generativelanguage.googleapis.com/v1beta/openai/` (Google hỗ trợ sẵn endpoint tương thích OpenAI).

### 2. DeepSeek API (Chính Thức) — Tối Ưu Cho Reasoning & Kinh Tế
*   **Các Model:** `deepseek-chat` (v4/flash), `deepseek-reasoner` (r1/pro).
*   **Lý do chọn:** Model `deepseek-reasoner` (R1) có chất lượng reasoning ngang ngửa o1 nhưng giá chỉ bằng 1/10 ($0.55/1M input, $2.19/1M output). Cực kỳ hữu dụng để fact-check các thông tin mang tính suy luận phức tạp.
*   **Base URL:** `https://api.deepseek.com/v1/`

### 3. OpenRouter API — Linh Hoạt Tuyệt Đối (Khuyên Dùng Cho SaaS)
*   **Các Model:** Mọi model trên thế giới (Claude 3.5 Sonnet, GPT-4o, Gemini 2.5, DeepSeek R1, Llama 3...).
*   **Lý do chọn:** Chỉ cần tích hợp **duy nhất 1 API Key** và **1 Base URL**. Việc đổi nhà cung cấp (từ Google sang Anthropic hay DeepSeek) hoàn toàn được thực hiện thông qua việc thay đổi chuỗi tên model gửi lên (ví dụ: `anthropic/claude-3.5-sonnet`, `deepseek/deepseek-r1`).
*   **Base URL:** `https://openrouter.ai/api/v1/`

---

## 📊 Ước Tính Chi Phí Một Lần Chạy (Per-Run Cost Estimation)

Để tính toán chi phí thực tế, chúng ta giả lập **một lượt chạy tiêu chuẩn** đối với một bài viết trung bình (khoảng **6-8 claims**):
*   **Tổng số Input Tokens:** **100,000 tokens** (bao gồm System Prompt ~7.5k tokens gửi lặp lại nhiều lần cho các claim + dữ liệu từ nguồn RAG cào được).
*   **Tổng số Output Tokens:** **10,000 tokens** (bao gồm JSON kết quả và các khối reasoning của 6-8 claims).

### Bảng Chi Phí Cho 1 Bài Viết (Tiêu Chuẩn 100k Input / 10k Output)

| Nhà cung cấp | Tên Model sử dụng | Đơn giá Input / 1M | Đơn giá Output / 1M | Chi phí / 1 Bài viết (USD) | Chi phí / 1 Bài viết (VNĐ) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Google AI Studio** | `gemini-2.5-flash` | $0.075 | $0.30 | **$0.0105** | **~260 VNĐ** |
| **Google AI Studio** | `gemini-2.5-pro` | $1.25 | $5.00 | **$0.1750** | **~4,300 VNĐ** |
| **DeepSeek API** | `deepseek-chat` (v4) | $0.14 | $0.28 | **$0.0168** | **~420 VNĐ** |
| **DeepSeek API** | `deepseek-reasoner` (R1)| $0.55 | $2.19 | **$0.0769** | **~1,900 VNĐ** |
| **OpenRouter** | `anthropic/claude-3.5-sonnet` | $3.00 | $15.00 | **$0.4500** | **~11,000 VNĐ** |

*Tỷ giá ước tính: 1 USD = 25,000 VNĐ. Nếu sử dụng Gemini API ở Free Tier, chi phí là $0.*

### 💡 Giải Pháp Tối Ưu Hóa Chi Phí: Prompt Caching
Cả **Google Gemini** và **DeepSeek** đều hỗ trợ cơ chế **Prompt Caching** (lưu trữ ngữ cảnh hệ thống):
*   **Gemini:** Giảm **50%** giá Input tokens đối với phần prompt trùng lặp được cache (chứa System Prompt + Header bài viết).
*   **DeepSeek:** Giảm tới **90%** giá Input tokens (chỉ còn $0.014/1M cho DeepSeek V4 và $0.14/1M cho R1 đối với phần cache hit).
*   **Kết quả:** Do cấu trúc tool gửi liên tục các claim của cùng một bài viết chung một ngữ cảnh hệ thống, nếu tận dụng tốt Prompt Caching, chi phí thực tế cho mỗi bài viết có thể **giảm tiếp từ 40% đến 70%** so với bảng tính trên.

### 🔍 Ước Tính Chi Phí Cho Web Search (Per-Search Cost Estimation)

Để fact-check một bài viết trung bình có 6-8 claims, hệ thống sẽ thực hiện tối đa **6-8 lượt tìm kiếm web** (mỗi claim thực hiện 1 lần search). 

Dưới đây là so sánh chi phí giữa các giải pháp Web Search:

| Nhà cung cấp | Gói dịch vụ | Hạn mức miễn phí | Đơn giá vượt định mức / gói trả phí | Chi phí cho 1 Bài viết (6-8 searches) | Chi phí cho 100 Bài viết (~700 searches) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DuckDuckGo SDK** | Free API | Không giới hạn cứng | **$0** (Không mất phí) | **0 VNĐ** | **0 VNĐ** |
| **Tavily Search API** | Gói Free | 1,000 searches / tháng | **$0** (Khóa nếu vượt hạn mức) | **0 VNĐ** (trong hạn mức) | **0 VNĐ** (trong hạn mức) |
| **Tavily Search API** | Gói Starter | Không có | **$15 / tháng** (Cho 5,000 searches) | **~$0.02** (~500 VNĐ) | **~$2.10** (~52,000 VNĐ) |
| **Google Custom Search**| Gói JSON API | 100 searches / ngày | **$5 / 1,000 searches** | **~$0.035** (~870 VNĐ) | **~$3.50** (~87,000 VNĐ) |
| **Bing Search API** | Gói S1 (Azure) | 1,000 searches / tháng | **$3 / 1,000 searches** | **~$0.021** (~520 VNĐ) | **~$2.10** (~52,000 VNĐ) |

#### 💡 Khuyến nghị tối ưu Web Search cho MVP:
1. **Giai đoạn thử nghiệm:** Dùng **Tavily Free** (1.000 searches/tháng, đủ chạy ~130 bài viết) kết hợp cấu hình thư viện **DuckDuckGo SDK** làm phương án dự phòng (Fallback) khi hết hạn mức.
2. **Giai đoạn thương mại:** Sử dụng **Bing Search API** hoặc mua gói **Tavily Starter $15/tháng**. Gói này đủ dung lượng để chạy từ 600 - 800 bài viết mỗi tháng, chi phí trung bình cực kỳ rẻ (chỉ ~500 VNĐ / bài viết).

---

## Khuyến Nghị Lộ Trình Cho MVP

> [!IMPORTANT]
> 1. **Giai đoạn 1 (Ngay bây giờ):** Chọn **Option 1**. Chuyển đổi giao diện Tkinter sang **Streamlit**, deploy lên **Hugging Face Spaces** và sử dụng **Google AI Studio Gemini API Free Tier** + **DuckDuckGo Search** để chạy test thử nghiệm với chi phí $0.
> 2. **Giai đoạn 2 (Sau 1 tháng):** Khi bắt đầu đưa cho đội ngũ cộng tác viên chạy annotation số lượng lớn, chuyển sang **Option 2**. Chuyển Gemini API sang gói trả phí (Pay-as-you-go) và nâng cấp máy chủ lên Render/Railway để tránh bị gián đoạn dịch vụ.
> 3. **Kiến Trúc Code:** Chuẩn hóa toàn bộ hàm gọi LLM sang dạng tương thích OpenAI (như hàm `_call_openrouter` hiện tại đang làm) để khi cần đổi model chỉ việc truyền lại cấu hình `API_KEY`, `BASE_URL` và `MODEL` là xong.
