/**
 * MemberPicker — dropdown chọn thành viên theo 1 role (ANNOTATOR hoặc QA).
 * List user của role đó: người ĐÃ trong project lên trên (mờ + icon thùng rác để gỡ),
 * người CHƯA trong project xuống dưới (rõ + icon add để thêm).
 */
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, Trash2, Check } from "lucide-react";
import type { UserOption } from "@/api/adapters";

interface Row {
  id: string;
  email: string;
  inProject: boolean;
}

interface Props {
  label: string;
  /** Tất cả user thuộc role này (id/email). */
  users: UserOption[];
  /** id user đang là thành viên active của project (theo role này). */
  activeIds: Set<string>;
  disabled?: boolean;
  onAdd: (userId: string) => void | Promise<void>;
  onRemove: (userId: string) => void | Promise<void>;
}

export function MemberPicker({ label, users, activeIds, disabled, onAdd, onRemove }: Props) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Đóng khi click ra ngoài.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Đã thêm lên trên, chưa thêm xuống dưới; trong mỗi nhóm sắp theo email.
  const rows: Row[] = users
    .map((u) => ({ id: u.id, email: u.email, inProject: activeIds.has(u.id) }))
    .sort((a, b) =>
      a.inProject === b.inProject ? a.email.localeCompare(b.email) : a.inProject ? -1 : 1,
    );

  const addedCount = rows.filter((r) => r.inProject).length;

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 hover:border-slate-300 disabled:opacity-50"
      >
        <span className="font-semibold">
          {label}
          <span className="ml-1.5 text-[11px] font-normal text-slate-400">
            {addedCount}/{rows.length} đã thêm
          </span>
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          <div className="max-h-64 overflow-y-auto py-1">
            {rows.length === 0 && (
              <p className="px-3 py-3 text-xs text-slate-400 text-center">Không có user nào thuộc vai trò này.</p>
            )}
            {rows.map((r) => (
              <div
                key={r.id}
                className={`group flex items-center justify-between gap-2 px-2.5 py-1 text-xs transition-colors ${
                  r.inProject ? "text-slate-400 hover:bg-slate-50" : "text-slate-700 hover:bg-vsf-50"
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {r.inProject && <Check size={14} className="flex-shrink-0 text-emerald-500" />}
                  <span className="truncate">{r.email}</span>
                </span>
                {r.inProject ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onRemove(r.id)}
                    title="Gỡ khỏi project"
                    className="flex-shrink-0 grid place-items-center w-6 h-6 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onAdd(r.id)}
                    title="Thêm vào project"
                    className="flex-shrink-0 grid place-items-center w-6 h-6 rounded-lg text-vsf-500 hover:bg-vsf-100 hover:text-vsf-700 disabled:opacity-50"
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
