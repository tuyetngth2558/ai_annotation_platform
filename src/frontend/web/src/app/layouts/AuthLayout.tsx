/** AuthLayout — khung cho trang chưa đăng nhập (login). Căn giữa. */
import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "var(--bg)",
      }}
    >
      <Outlet />
    </div>
  );
}
