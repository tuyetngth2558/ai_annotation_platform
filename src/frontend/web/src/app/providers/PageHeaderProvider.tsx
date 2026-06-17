/**
 * PageHeaderProvider — mỗi trang đăng ký tiêu đề/mô tả/nút hành động, AppLayout render
 * lên thanh header app (thay chỗ "VSF Annotation"). Dùng hook usePageHeader trong trang.
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";

export interface PageHeaderConfig {
  title: string;
  description?: string;
  /** Phần tử nằm TRƯỚC tiêu đề (vd nút back hình tròn). */
  leading?: ReactNode;
  /** Nút hành động bên phải header (vd "Tạo Project"). */
  action?: ReactNode;
  /** true → action căn giữa thanh header (dùng cho stepper); mặc định nằm phải. */
  actionCenter?: boolean;
}

interface PageHeaderCtx {
  header: PageHeaderConfig | null;
  setHeader: (cfg: PageHeaderConfig | null) => void;
}

const Ctx = createContext<PageHeaderCtx | null>(null);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<PageHeaderConfig | null>(null);
  const value = useMemo(() => ({ header, setHeader }), [header]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePageHeaderSlot(): PageHeaderCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePageHeaderSlot phải dùng trong PageHeaderProvider");
  return ctx;
}

/**
 * Hook tiện dụng cho từng trang: khai báo tiêu đề/mô tả/nút; tự dọn khi rời trang.
 * Truyền `deps` để cập nhật khi action/title thay đổi (vd ẩn/hiện nút theo data).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function usePageHeader(cfg: PageHeaderConfig, deps: unknown[] = []) {
  const { setHeader } = usePageHeaderSlot();
  const apply = useCallback(() => setHeader(cfg), [setHeader, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    apply();
    return () => setHeader(null);
  }, [apply, setHeader]);
}
