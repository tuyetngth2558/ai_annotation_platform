/** ConfirmDialog — hộp xác nhận đẹp (thay window.confirm mặc định trình duyệt). */
import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" = nút đỏ (xóa); "primary" = nút cam đỏ thương hiệu. */
  variant?: "danger" | "primary";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open, title, message,
  confirmLabel = "Xác nhận", cancelLabel = "Hủy",
  variant = "danger", busy = false,
  onConfirm, onCancel,
}: ConfirmDialogProps) {
  // Esc để đóng.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmCls =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700"
      : "bg-vsf-600 hover:bg-vsf-700";

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Overlay mờ */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] animate-fade-in" onClick={onCancel} />

      <div
        className="relative w-full max-w-sm bg-white rounded-2xl p-5 animate-scale-in"
        style={{ boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onCancel}
          aria-label="Đóng"
          className="absolute top-3 right-3 text-slate-300 hover:text-slate-500 cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-3.5">
          <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            variant === "danger" ? "bg-red-50 text-red-500" : "bg-vsf-50 text-vsf-600"
          }`}>
            <AlertTriangle size={20} />
          </span>
          <div className="min-w-0 pt-0.5">
            <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>
            <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 rounded-lg text-sm font-bold text-white cursor-pointer disabled:opacity-50 ${confirmCls}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
