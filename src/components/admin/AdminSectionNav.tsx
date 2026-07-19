"use client";

export type AdminSection = "activity" | "members" | "data";

const sections: Array<{ id: AdminSection; label: string }> = [
  { id: "activity", label: "활동 기록" },
  { id: "members", label: "길드원 관리" },
  { id: "data", label: "데이터 관리" },
];

export function AdminSectionNav({
  activeSection,
  onChange,
}: {
  activeSection: AdminSection;
  onChange: (section: AdminSection) => void;
}) {
  return (
    <nav
      aria-label="관리 작업"
      className="ui-surface flex gap-1 overflow-x-auto p-1"
      role="tablist"
    >
      {sections.map((section) => {
        const isActive = activeSection === section.id;

        return (
          <button
            aria-selected={isActive}
            className={`ui-focus-ring min-h-11 min-w-fit flex-1 rounded-[var(--radius-control)] px-4 py-2 text-sm font-semibold transition ${
              isActive
                ? "border-b-2 border-[var(--brand-strong)] bg-[var(--surface-muted)] text-[var(--text-primary)]"
                : "border-b-2 border-transparent bg-white text-[var(--text-secondary)] hover:bg-neutral-50 hover:text-[var(--text-primary)]"
            }`}
            key={section.id}
            onClick={() => onChange(section.id)}
            role="tab"
            type="button"
          >
            {section.label}
          </button>
        );
      })}
    </nav>
  );
}
