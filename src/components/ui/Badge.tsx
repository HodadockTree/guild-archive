import type { ReactNode } from "react";

type BadgeTone =
  | "neutral"
  | "accent"
  | "status"
  | "brand"
  | "muted"
  | "strong";

const toneClasses: Record<BadgeTone, string> = {
  neutral:
    "bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]",
  accent:
    "bg-[var(--color-brand-primary)] text-[var(--color-text-primary)]",
  status:
    "bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]",
  brand:
    "bg-[var(--color-brand-primary)] text-[var(--color-text-primary)]",
  muted:
    "bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]",
  strong:
    "bg-[var(--color-brand-strong)] text-[var(--color-text-inverse)]",
};

export function Badge({
  children,
  className = "",
  tone = "muted",
}: {
  children: ReactNode;
  className?: string;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
