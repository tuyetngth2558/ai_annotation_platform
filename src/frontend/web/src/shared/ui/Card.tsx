/** Card — surface container dùng semantic tokens. */
import type { HTMLAttributes } from "react";

export function Card({ style, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-lg)",
        padding: 24,
        ...style,
      }}
    />
  );
}
