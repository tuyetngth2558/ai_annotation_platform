/** ToastProvider — toast popup dùng chung qua context (thay prop-drilling showToast). */
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "info";

interface ToastCtx {
  /** variant tùy chọn; nếu bỏ trống sẽ tự suy ra từ nội dung (lỗi/thành công). */
  showToast: (message: string, variant?: ToastVariant) => void;
}

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

const Ctx = createContext<ToastCtx | null>(null);

// Từ khóa gợi ý lỗi → tự đánh dấu variant "error" khi gọi showToast(message) không kèm variant.
const ERROR_HINTS = [
  "lỗi", "không", "thất bại", "sai", "hết hạn", "tồn tại", "bắt buộc",
  "không hợp lệ", "failed", "error", "⛔",
];

function inferVariant(message: string): ToastVariant {
  const lower = message.toLowerCase();
  if (ERROR_HINTS.some((h) => lower.includes(h))) return "error";
  return "success";
}

const STYLES: Record<
  ToastVariant,
  { bar: string; icon: ReactNode; ring: string }
> = {
  success: {
    bar: "bg-emerald-500",
    ring: "border-emerald-100",
    icon: <CheckCircle2 size={18} className="text-emerald-500" />,
  },
  error: {
    bar: "bg-red-500",
    ring: "border-red-100",
    icon: <XCircle size={18} className="text-red-500" />,
  },
  info: {
    bar: "bg-vsf-500",
    ring: "border-vsf-100",
    icon: <Info size={18} className="text-vsf-500" />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant?: ToastVariant) => {
      const id = `${Date.now()}-${Math.random()}`;
      const v = variant ?? inferVariant(message);
      setToasts((prev) => [...prev, { id, message, variant: v }]);
      // Lỗi để lâu hơn (4.5s) để user kịp đọc; còn lại 3.2s.
      const ttl = v === "error" ? 4500 : 3200;
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), ttl);
    },
    [],
  );

  return (
    <Ctx.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed right-5 top-5 z-[100] flex flex-col gap-2.5 pointer-events-none w-full max-w-sm"
        aria-live="polite"
        role="status"
      >
        {toasts.map((t) => {
          const s = STYLES[t.variant];
          return (
            <div
              key={t.id}
              className={`relative overflow-hidden flex items-start gap-3 bg-white rounded-xl border ${s.ring} pl-4 pr-3 py-3 pointer-events-auto animate-slide-up`}
              style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.02)" }}
            >
              <span className={`absolute left-0 top-0 bottom-0 w-1 ${s.bar}`} />
              <span className="flex-shrink-0 mt-0.5">{s.icon}</span>
              <p className="flex-1 text-[13px] font-medium text-slate-700 leading-snug">
                {t.message}
              </p>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Đóng thông báo"
                className="flex-shrink-0 text-slate-300 hover:text-slate-500 transition-colors mt-0.5"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast phải dùng trong ToastProvider");
  return ctx;
}
