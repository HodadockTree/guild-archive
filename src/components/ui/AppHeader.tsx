import { ButtonLink } from "@/src/components/ui/ButtonLink";

type AppPath = "/" | "/archive" | "/viewer" | "/admin" | "/members";

const navigation: Array<{ href: AppPath; label: string }> = [
  { href: "/", label: "홈" },
  { href: "/archive", label: "월별 기록" },
  { href: "/viewer", label: "월간 리포트" },
];

export function AppHeader({
  currentPath,
  description,
  eyebrow,
  title,
}: {
  currentPath: AppPath;
  description?: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="border-b border-[var(--border)] pb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            {eyebrow}
          </p>
          <h1 className="ui-page-title">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              {description}
            </p>
          ) : null}
        </div>
        <nav aria-label="주요 화면" className="flex flex-wrap gap-2">
          {navigation.map((item) => (
            <ButtonLink
              aria-current={item.href === currentPath ? "page" : undefined}
              href={item.href}
              key={item.href}
              variant={item.href === currentPath ? "primary" : "secondary"}
            >
              {item.label}
            </ButtonLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
