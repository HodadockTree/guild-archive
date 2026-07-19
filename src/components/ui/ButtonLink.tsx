import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type ButtonLinkVariant = "primary" | "secondary";

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "className"> & {
  children: ReactNode;
  className?: string;
  variant?: ButtonLinkVariant;
};

const variantClasses: Record<ButtonLinkVariant, string> = {
  primary:
    "border-transparent bg-[var(--brand)] font-semibold text-[var(--text-primary)] hover:bg-sky-300",
  secondary:
    "border-[var(--border)] bg-white font-medium text-[var(--text-primary)] hover:border-sky-300 hover:bg-[var(--surface-muted)]",
};

export function ButtonLink({
  children,
  className = "",
  variant = "secondary",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={`ui-focus-ring inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border px-3 py-2 text-sm transition ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}
