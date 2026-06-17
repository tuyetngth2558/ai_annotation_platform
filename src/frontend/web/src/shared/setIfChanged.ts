import type { Dispatch, SetStateAction } from "react";

/**
 * Chỉ gọi setState khi dữ liệu MỚI khác dữ liệu HIỆN TẠI (so sánh JSON nông).
 * Dùng cho auto-refresh ngầm: tránh re-render + nhấp nháy khi poll về data y hệt.
 *
 * Lưu ý: so sánh bằng JSON.stringify — đủ cho payload list/detail thuần dữ liệu
 * (không hàm/Date). Thứ tự key từ API ổn định nên an toàn.
 */
export function setIfChanged<T>(setter: Dispatch<SetStateAction<T>>, next: NoInfer<T>): void {
  setter((prev) => {
    try {
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    } catch {
      return next;
    }
  });
}
