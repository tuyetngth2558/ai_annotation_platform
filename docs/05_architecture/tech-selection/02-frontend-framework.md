# 02 — Lựa chọn Frontend Framework

**Quyết định:** **React + Vite + TypeScript**
**Trạng thái:** Đã chốt · **Ngày:** 2026-06-08

---

## 1. Bài toán cần giải

Frontend phải dựng được các màn hình trong Screen Spec, trong đó **Annotation Workspace**
là màn phức tạp nhất — quyết định lựa chọn:

| Yêu cầu UI | Nguồn | Hệ quả |
|---|---|---|
| Live composite score (nhập 6 chiều → tính tổng real-time) | AC-6.2, BR-7.2 | State reactive nhiều ô liên động |
| Auto-save mỗi 30s / blur (chạy nền, không giật) | BR-6.1 | Quản side-effect + debounce |
| Khóa ô SC khi source inaccessible (read-only động) | BR-4.1 | State có điều kiện |
| Submit validation (đủ 6 chiều + source status + reason) | BR-6.2 | Form state phức tạp |
| QA diff view (so pre-score vs annotator, highlight ≥0.20) | AC-8.1 | Render so sánh động |
| Đa ngôn ngữ vi/en, dark/light | yêu cầu user | i18n + theme |
| 3 role, route guard, layout khác nhau | docs AC mục 1 | Routing + RBAC ở UI |

**Yếu tố quyết định:** Annotation Workspace **state-heavy** — nhiều ô nhập liên động,
side-effect (auto-save), state có điều kiện (SC lock). Cần framework quản lý state tốt.

---

## 2. Các phương án đã cân nhắc

| Tiêu chí | **React + Vite** | Vue 3 + Vite | Vanilla (giữ prototype) |
|---|---|---|---|
| Quản state phức tạp | ✅ rất tốt (hooks, ecosystem) | ✅ tốt (reactivity) | ❌ tự lắp, dễ spaghetti |
| Reactivity cho live score | ✅ (useState/useMemo) | ✅ tự nhiên nhất | ⚠️ tự viết DOM update |
| Hệ sinh thái / thư viện | ✅ lớn nhất | trung bình | ❌ |
| TypeScript support | ✅ chín | ✅ tốt | ⚠️ |
| Tuyển người / quen thuộc | ✅ phổ biến nhất | khá | — |
| Tái dùng prototype HTML/CSS | ✅ (port markup) | ✅ | ✅ 100% |
| Tốc độ dev (Vite HMR) | ✅ nhanh | ✅ nhanh | — |
| Phù hợp 4 màn + validation | ✅ | ✅ | ❌ khó scale |

---

## 3. Phân tích ưu/nhược chi tiết

### React + Vite + TypeScript (ĐÃ CHỌN)

**Ưu điểm:**
- **Quản state mạnh nhất** cho màn workspace state-heavy: hooks (`useState`, `useMemo`,
  `useEffect`) xử lý live composite, auto-save side-effect, SC lock gọn gàng.
- **Hệ sinh thái lớn nhất** — react-router, react-i18next, testing-library... đều chín,
  tài liệu nhiều, dễ tìm giải pháp khi vướng.
- **Vite** — dev server + HMR rất nhanh, build production gọn (đã verify build 93 module
  trong ~2s).
- **TypeScript** — bắt lỗi sớm, share type với backend (generate từ OpenAPI sau).
- **Phổ biến** — dễ tìm người/onboard, tài liệu học nhiều.
- Tái dùng được markup/CSS từ 4 prototype HTML làm tham chiếu.

**Nhược điểm (và cách bù):**
- **Boilerplate hơn Vue** (phải tự quản nhiều thứ: memo, dependency array) — *Bù:* với
  4 màn MVP thì không đáng kể; lợi ích ecosystem lớn hơn.
- **Dễ re-render thừa** nếu không cẩn thận memo — *Bù:* màn MVP chưa lớn tới mức thành
  vấn đề; tối ưu khi cần.
- Cần build step (không chạy thẳng như vanilla) — *Bù:* Vite làm việc này nhẹ nhàng.

### Vue 3 + Vite (KHÔNG CHỌN)

**Ưu:** reactivity tự nhiên (ref/computed) rất hợp live composite score; SFC gọn; cũng
nhanh với Vite.
**Nhược (lý do không chọn):**
- **Cộng đồng/hệ sinh thái nhỏ hơn React** một chút — ít người quen hơn, ảnh hưởng
  tuyển/onboard.
- Không có lợi thế quyết định nào so với React cho bài toán này; trong khi React phổ biến
  hơn → chọn React để an toàn về nhân lực. *(Nếu team đã thạo Vue sẵn thì Vue cũng là lựa
  chọn hợp lý ngang ngửa.)*

### Vanilla HTML/CSS/JS (KHÔNG CHỌN)

**Ưu:** tái dùng prototype 100%, không cần build tool.
**Nhược (lý do loại):**
- **Annotation Workspace state-heavy sẽ thành spaghetti** — quản tay live score + auto-save
  + SC lock + validation bằng vanilla rất khó maintain trong 4 tuần.
- Không scale nổi 4 màn + i18n + theme + routing + guard.
- Prototype chỉ nên là **tham chiếu UX**, không kéo nguyên vào production.

---

## 3b. Chi phí · Rủi ro · Phương án dự phòng

**Chi phí:** React/Vite/TS đều miễn phí (open-source). Chi phí là thời gian dev; React phổ
biến nên **dễ tuyển/onboard** → giảm chi phí nhân lực. Không license, không lock-in.

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Boilerplate React (memo, dependency array) tốn thời gian | Thấp | 4 màn MVP không đáng kể; lợi ích ecosystem bù lại |
| Re-render thừa nếu không tối ưu | Thấp | Màn MVP chưa lớn; tối ưu khi cần (useMemo/memo) |
| Type FE lệch BE nếu sửa tay | Trung bình | Generate type từ OpenAPI (`openapi-typescript`), không viết tay |
| Bundle size lớn dần | Thấp | Vite code-splitting; theo dõi khi build |

**Phương án dự phòng:** nếu một feature cần thư viện chuyên biệt (vd PDF viewer, rich
editor), hệ sinh thái React lớn nhất → gần như luôn có sẵn. Nếu cần SSR sau này, chuyển
sang Next.js (cùng React) không phải viết lại component.

## 4. Quyết định & lý do cô đọng

> **Chọn React + Vite + TypeScript** vì Annotation Workspace state-heavy (live composite,
> auto-save, SC lock, diff view) cần quản state tốt — React mạnh nhất + hệ sinh thái lớn
> nhất + phổ biến (dễ tuyển/onboard). Vue ngang ngửa nhưng cộng đồng nhỏ hơn. Vanilla bị
> loại vì không scale nổi state phức tạp trong 4 tuần.

## 5. Hệ quả
- Cấu trúc **feature-based co-locate** (xem [ADR 0005](../../adr/0005-feature-based-structure.md)).
- i18n chia theo feature (react-i18next), theme OKLCH qua CSS variables + ThemeProvider.
- Type FE generate từ OpenAPI backend (`openapi-typescript`) — không viết tay, không lệch.
- Prototype HTML giữ làm tham chiếu, không build tiếp.

## 6. Tham chiếu
- ADR: [0001-tech-stack.md](../../adr/0001-tech-stack.md), [0005-feature-based-structure.md](../../adr/0005-feature-based-structure.md)
- Liên quan: [01 — Backend](01-backend-framework.md) (OpenAPI → type FE)
