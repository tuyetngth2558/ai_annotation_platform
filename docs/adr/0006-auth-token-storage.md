# ADR 0006 — Lưu trữ auth token ở frontend

**Trạng thái:** Accepted (MVP) · **Ngày:** 2026-06-09

## Bối cảnh

Auth tự viết (JWT, [ADR 0003](0003-self-written-auth.md)). FE cần lưu access token để gửi
kèm request. Hai hướng phổ biến:
- **localStorage + Bearer header** (hiện đang dùng cho mock).
- **httpOnly cookie** (cookie server set, JS không đọc được).

## So sánh

| | localStorage + Bearer | httpOnly cookie |
|---|---|---|
| Chống XSS đọc token | ❌ JS đọc được → XSS lấy được token | ✅ JS không đọc được |
| Chống CSRF | ✅ không tự gửi theo request | ⚠️ cần CSRF token/SameSite |
| Đơn giản triển khai | ✅ | ⚠️ cần cấu hình cookie/CORS |
| Hợp API stateless/mobile sau này | ✅ | ⚠️ cookie kém tiện cho mobile |

## Quyết định

**MVP: localStorage + Bearer header** (giữ hiện trạng). Vì:
- Tool **nội bộ**, không public internet, bề mặt tấn công hẹp.
- Đơn giản, hợp luồng JWT stateless đã chọn.
- React tự escape JSX (chống XSS cơ bản); không dùng `dangerouslySetInnerHTML`.

**Đánh đổi đã biết:** nếu có lỗ hổng XSS, token trong localStorage có thể bị lấy. Chấp nhận
ở MVP nội bộ; **xem lại trước khi mở ra ngoài internet**.

## Việc cần làm khi nâng cấp (trước production công khai)

- [ ] Cân nhắc chuyển sang **httpOnly cookie + SameSite=strict + CSRF token** nếu hệ thống
      ra internet công khai hoặc xử lý data nhạy cảm hơn.
- [ ] Refresh token: lưu an toàn (httpOnly cookie), access token TTL ngắn.
- [ ] CSP header chặn inline script (giảm rủi ro XSS).
- [ ] Rà soát mọi chỗ render nội dung do user nhập (tránh XSS).

## Hệ quả
- `apiClient.ts` lưu token ở localStorage (`vsf-access-token`) — chấp nhận có chủ đích.
- Khi làm auth thật (OQ-006), quyết định này được xem lại theo môi trường triển khai.

## Liên quan
[ADR 0003](0003-self-written-auth.md) · [06-auth](../05_architecture/tech-selection/06-auth.md) · OQ-006
