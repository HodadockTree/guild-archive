import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type SurfaceProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
  muted?: boolean;
  variant?: "section" | "standard" | "muted";
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function Surface<T extends ElementType = "section">({
  as,
  children,
  className = "",
  muted = false,
  variant = "standard",
  ...props
}: SurfaceProps<T>) {
  const Component = as ?? "section";
  const resolvedVariant = muted ? "muted" : variant;

  return (
    <Component
      className={`ui-surface ui-surface-${resolvedVariant} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
