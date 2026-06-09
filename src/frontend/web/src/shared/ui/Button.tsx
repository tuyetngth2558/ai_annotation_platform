/** Button — dùng semantic tokens. variant primary/ghost/danger. */
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const styles: Record<Variant, React.CSSProperties> = {
  primary: { background: "var(--primary)", color: "var(--on-primary)", border: "1px solid transparent" },
  ghost: { background: "transparent", color: "var(--ink)", border: "1px solid var(--line)" },
  danger: { background: "var(--danger)", color: "var(--on-primary)", border: "1px solid transparent" },
};

export function Button({ variant = "primary", style, ...rest }: Props) {
  return (
    <button
      {...rest}
      style={{
        minHeight: 40,
        padding: "8px 16px",
        borderRadius: "var(--radius)",
        fontWeight: 600,
        cursor: "pointer",
        ...styles[variant],
        ...style,
      }}
    />
  );
}
