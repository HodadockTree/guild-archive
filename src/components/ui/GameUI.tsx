import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import Link from "next/link";

const gameNavigation = [
  { href: "/", icon: "home", label: "홈" },
  { href: "/archive", icon: "calendar", label: "월별" },
  { href: "/viewer", icon: "report", label: "리포트" },
  { href: "/admin", icon: "settings", label: "관리" },
] as const;

export type GameIconName =
  | "activity"
  | "airship"
  | "calendar"
  | "event"
  | "home"
  | "member"
  | "participants"
  | "report"
  | "settings"
  | "siege"
  | "special";

export function GameIcon({ className = "", name }: { className?: string; name: GameIconName }) {
  const paths: Record<GameIconName, ReactNode> = {
    activity: <><path d="M5 12h3l2-6 3 12 2-6h4" /><circle cx="5" cy="12" r="2" /></>,
    airship: <><path d="M3 14h18l-2.7 4H6L3 14Z" /><path d="M7 14V9h7l3 5M10 9V5h4l3 4M5 19.5h14" /></>,
    calendar: <><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4M16 3v4M4 10h16M8 14h2M14 14h2" /></>,
    event: <><path d="m12 3 2.2 5 5.3.5-4 3.6 1.2 5.4-4.7-2.8-4.7 2.8 1.2-5.4-4-3.6L9.8 8 12 3Z" /></>,
    home: <><path d="m3.5 11 8.5-7 8.5 7" /><path d="M6 10v10h12V10M10 20v-6h4v6" /></>,
    member: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21c.5-5 3-7 7.5-7s7 2 7.5 7" /></>,
    participants: <><circle cx="9" cy="8" r="3" /><circle cx="16.5" cy="9" r="2.5" /><path d="M3.5 20c.4-4.5 2.3-6.5 5.5-6.5s5.2 2 5.5 6.5M14 14.5c3.8-.5 5.8 1.2 6.5 5.5" /></>,
    report: <><path d="M5 3h10l4 4v14H5V3Z" /><path d="M15 3v5h4M8 16l2.5-3 2.2 1.8L16 11" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /></>,
    siege: <><path d="M6 20V8l3 2 3-3 3 3 3-2v12H6Z" /><path d="M9 5V3M15 5V3M10 20v-5h4v5" /></>,
    special: <><path d="M12 21s-7-4.3-7-10a4 4 0 0 1 7-2.7A4 4 0 0 1 19 11c0 5.7-7 10-7 10Z" /></>,
  };

  return (
    <svg aria-hidden="true" className={`game-icon ${className}`} fill="none" viewBox="0 0 24 24">
      {paths[name]}
    </svg>
  );
}

export function GameWindowHeader() {
  return (
    <header className="game-window-header">
      <div className="game-window-titlebar">
        <span aria-hidden="true" className="game-window-emblem">N</span>
        <p className="game-window-title">냥춘 길드 아카이브</p>
      </div>
      <nav aria-label="주요 화면" className="game-window-nav">
        {gameNavigation.map((item) => (
          <Link
            aria-current={item.href === "/" ? "page" : undefined}
            className={`game-window-tab ui-focus-ring ${item.href === "/" ? "game-window-tab-active" : ""}`}
            href={item.href}
            key={item.href}
          >
            <GameIcon name={item.icon} />
            <span>{item.label}</span>
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
  icon,
  title,
  variant = "major",
}: {
  action?: ReactNode;
  description?: string;
  icon?: GameIconName;
  title: string;
  variant?: "major" | "strip" | "tab";
}) {
  return (
    <header className={`game-panel-header game-panel-header-${variant}`}>
      <div className="min-w-0">
        <h2 className="game-panel-title">
          {icon ? <GameIcon name={icon} /> : null}
          <span>{title}</span>
        </h2>
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
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
  variant?: "primary" | "pink" | "green";
}) {
  const classes = `game-button game-button-${variant} ui-focus-ring ${className}`;

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
  icon,
  onClick,
  size = "primary",
  tone = "cyan",
  value,
}: {
  description?: string;
  label: string;
  icon: GameIconName;
  onClick?: () => void;
  size?: "primary" | "secondary";
  tone?: "cyan" | "green" | "pink" | "purple" | "yellow" | "gray";
  value: string;
}) {
  const content = (
    <>
      <GameIcon className="game-stat-icon" name={icon} />
      <span className="game-stat-copy">
        <dt className="game-stat-label">{label}</dt>
        <dd className="game-stat-value">{value}</dd>
        {description ? <span className="game-stat-description">{description}</span> : null}
      </span>
    </>
  );

  return onClick ? (
    <div
      className={`game-stat game-stat-${size} game-stat-${tone} ui-focus-ring`}
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
    <div className={`game-stat game-stat-${size} game-stat-${tone}`}>{content}</div>
  );
}
