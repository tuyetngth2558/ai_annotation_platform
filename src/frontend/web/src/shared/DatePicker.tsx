/**
 * DatePicker — ô chọn ngày dùng react-day-picker (thay <input type=date> native).
 * Ngày được chọn: hình TRÒN ĐỎ, không viền. Giá trị in/out dạng "YYYY-MM-DD".
 */
import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { CalendarDays } from "lucide-react";
import "react-day-picker/style.css";

interface DatePickerProps {
  value: string; // "YYYY-MM-DD" | ""
  onChange: (value: string) => void;
  /** Giới hạn: không cho chọn trước ngày này ("YYYY-MM-DD"). */
  min?: string;
  /** Giới hạn: không cho chọn sau ngày này. */
  max?: string;
  placeholder?: string;
  testId?: string;
}

/** "YYYY-MM-DD" → Date (local, tránh lệch timezone). */
function parseISO(v: string): Date | undefined {
  if (!v) return undefined;
  const [y, m, d] = v.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

/** Date → "YYYY-MM-DD" (local). */
function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DatePicker({ value, onChange, min, max, placeholder = "Chọn ngày", testId }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = parseISO(value);

  // Bấm ngoài → đóng popover.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const disabled = [
    ...(min ? [{ before: parseISO(min)! }] : []),
    ...(max ? [{ after: parseISO(max)! }] : []),
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        data-testid={testId}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-left flex items-center justify-between gap-2 bg-white hover:border-slate-300 focus:outline-none focus:border-vsf-500"
      >
        <span className={selected ? "text-slate-800" : "text-slate-400"}>
          {selected ? value : placeholder}
        </span>
        <CalendarDays size={15} className="text-slate-400 shrink-0" />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 bg-white border border-slate-200 rounded-xl p-2 animate-scale-in"
          style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)" }}
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(d) => {
              if (d) onChange(toISO(d));
              setOpen(false);
            }}
            disabled={disabled.length ? disabled : undefined}
            defaultMonth={selected}
            showOutsideDays
            classNames={{
              today: "text-vsf-600 font-bold",
              selected: "vsf-day-selected",
              chevron: "fill-slate-500",
            }}
          />
        </div>
      )}
    </div>
  );
}
