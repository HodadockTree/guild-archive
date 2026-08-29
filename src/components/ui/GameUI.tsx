import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import Link from "next/link";

const gameNavigation = [
  { href: "/", label: "홈" },
  { href: "/archive", label: "월별 기록" },
  { href: "/viewer", label: "월간 리포트" },
  { href: "/admin", label: "관리 화면" },
] as const;

export function GameWindowHeader() {
  return (
    <header className="game-window-header">
      <div className="game-window-titlebar">
        <span aria-hidden="true" className="game-window-emblem">N</span>
        <div>
          <p className="game-window-title">냥춘 길드 아카이브</p>
          <p className="game-window-subtitle">GUILD ACTIVITY MENU</p>
        </div>
      </div>
      <nav aria-label="주요 화면" className="game-window-nav">
        {gameNavigation.map((item) => (
          <Link
            aria-current={item.href === "/" ? "page" : undefined}
            className={`game-window-tab ui-focus-ring ${item.href === "/" ? "game-window-tab-active" : ""}`}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

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
