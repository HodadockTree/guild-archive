import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type ButtonLinkVariant = "primary" | "secondary" | "quiet";

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "className"> & {
  children: ReactNode;
  className?: string;
  variant?: ButtonLinkVariant;
};

const variantClasses: Record<ButtonLinkVariant, string> = {
  primary:
    "border-transparent bg-[var(--color-brand-primary)] font-semibold text-[var(--color-text-primary)] hover:brightness-95",
  secondary:
    "border-[var(--color-border-default)] bg-[var(--color-bg-surface)] font-medium text-[var(--color-text-primary)] hover:border-[var(--color-border-interactive)] hover:bg-[var(--color-bg-interactive)]",
  quiet:
    "border-transparent bg-transparent font-medium text-[var(--color-text-accent)] hover:bg-[var(--color-bg-muted)]",
};

export function ButtonLink({
  children,
  className = "",
  variant = "secondary",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={`ui-focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-control)] border px-3 py-2 text-sm transition ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}
