/**
 * Vitest + RTL mẫu — LoginPage render. Mẫu để Test/QA bám theo.
 * Mock useAuth/navigate để test cô lập (không gọi API thật).
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@/app/providers/ThemeProvider";
import { LoginPage } from "./LoginPage";
import "@/i18n/config";

vi.mock("@/app/providers/AuthProvider", async (orig) => {
  const actual = await orig<typeof import("@/app/providers/AuthProvider")>();
  return {
    ...actual,
    useAuth: () => ({ session: null, login: vi.fn(), logout: vi.fn() }),
  };
});

function renderLogin() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("LoginPage", () => {
  it("hiển thị form đăng nhập với email + password", () => {
    renderLogin();
    expect(screen.getByRole("button", { name: /đăng nhập|sign in/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("admin@vsf.local")).toBeInTheDocument();
  });

  it("hiển thị ghi chú tài khoản mock", () => {
    renderLogin();
    expect(screen.getByText(/admin@vsf.local/)).toBeInTheDocument();
  });
});
