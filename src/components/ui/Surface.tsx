import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type SurfaceProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
  muted?: boolean;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function Surface<T extends ElementType = "section">({
  as,
  children,
  className = "",
  muted = false,
  ...props
}: SurfaceProps<T>) {
  const Component = as ?? "section";

  return (
    <Component
      className={`ui-surface ${muted ? "ui-surface-muted" : ""} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
