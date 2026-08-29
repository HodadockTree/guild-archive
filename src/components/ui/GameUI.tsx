import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import Link from "next/link";

type GamePanelProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export function GamePanel({ children, className = "", ...props }: GamePanelProps) {
  return (
    <section className={`game-panel ${className}`} {...props}>
      {children}
    </section>
  );
}

export function GamePanelHeader({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <header className="game-panel-header">
      <div className="min-w-0">
        <h2 className="game-panel-title">{title}</h2>
        {description ? <p className="game-panel-description">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function GameButton({
  children,
  className = "",
  href,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { href?: string }) {
  const classes = `game-button ui-focus-ring ${className}`;

  if (href) {
    return (
      <Link className={classes} href={href}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

export function GameTab({
  active = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={`game-tab ui-focus-ring ${active ? "game-tab-active" : ""} ${className}`}
      {...props}
    />
  );
}

export function GameStat({
  description,
  label,
  onClick,
  value,
}: {
  description?: string;
  label: string;
  onClick?: () => void;
  value: string;
}) {
  const content = (
    <>
      <dt className="game-stat-label">{label}</dt>
      <dd className="game-stat-value">{value}</dd>
      {description ? <span className="game-stat-description">{description}</span> : null}
    </>
  );

  return onClick ? (
    <div
      className="game-stat ui-focus-ring"
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
    >
      {content}
    </div>
  ) : (
    <div className="game-stat">{content}</div>
  );
}
