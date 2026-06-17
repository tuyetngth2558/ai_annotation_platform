/**
 * ColumnFilter — nút lọc nhỏ gắn ngay trên header cột bảng.
 * Bấm icon phễu → popover danh sách giá trị (radio); icon đổi màu khi đang lọc.
 */
import { useEffect, useRef, useState } from "react";
import { Filter, Check } from "lucide-react";

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface Props {
  label: string;              // tên cột (hiện cạnh icon)
  options: FilterOption[];    // giá trị có thể lọc (KHÔNG gồm "Tất cả")
  value: string;             // "" = tất cả
  onChange: (value: string) => void;
}

export function ColumnFilter({ label, options, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = value !== "";

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const pick = (v: string) => { onChange(v); setOpen(false); };

  return (
    <span className="relative inline-flex items-center gap-1" ref={ref}>
      {label}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={`Lọc theo ${label}`}
        className={`grid place-items-center w-5 h-5 rounded transition-colors ${
          active ? "bg-vsf-600 text-white" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        }`}
      >
        <Filter size={11} />
      </button>

      {open && (
        <div className="absolute z-30 top-7 left-0 w-52 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden normal-case">
          <div className="max-h-64 overflow-y-auto py-1 text-xs font-normal text-slate-700">
            <button
              type="button"
              onClick={() => pick("")}
              className="w-full flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-slate-50"
            >
              <span>Tất cả</span>
              {value === "" && <Check size={13} className="text-vsf-600" />}
            </button>
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => pick(o.value)}
                className="w-full flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-vsf-50"
              >
                <span className="truncate">
                  {o.label}
                  {o.count != null && <span className="ml-1 text-slate-400">({o.count})</span>}
                </span>
                {value === o.value && <Check size={13} className="text-vsf-600 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </span>
  );
}
