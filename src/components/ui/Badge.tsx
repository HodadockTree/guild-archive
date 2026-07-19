import type { ReactNode } from "react";

type BadgeTone = "brand" | "muted" | "strong";

const toneClasses: Record<BadgeTone, string> = {
  brand: "bg-[var(--brand)] text-[var(--text-primary)]",
  muted: "bg-[var(--surface-muted)] text-[var(--text-secondary)]",
  strong: "bg-[var(--brand-strong)] text-white",
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
