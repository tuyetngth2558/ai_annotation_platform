/** ToastProvider — toast dùng chung qua context (thay prop-drilling showToast). */
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckSquare } from "lucide-react";

interface ToastCtx {
  showToast: (message: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);

  const showToast = useCallback((message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  return (
    <Ctx.Provider value={{ showToast }}>
      {children}
      <div className="fixed right-5 bottom-5 z-50 flex flex-col gap-2 pointer-events-none" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="w-full max-w-xs bg-gray-900 rounded-lg p-3.5 flex items-start gap-2.5 pointer-events-auto animate-slide-up"
            style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}
          >
            <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckSquare size={11} className="text-white" />
            </div>
            <p className="text-[13px] text-gray-200 leading-relaxed">{t.message}</p>
          </div>
        ))}
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
