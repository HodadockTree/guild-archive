"use client";

export function Pagination({
  currentPage,
  label,
  onPageChange,
  totalPages,
}: {
  currentPage: number;
  label: string;
  onPageChange: (page: number) => void;
  totalPages: number;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const firstMobilePage = Math.max(1, currentPage - 1);
  const lastMobilePage = Math.min(totalPages, currentPage + 1);

  return (
    <nav aria-label={label} className="flex max-w-full items-center justify-center gap-1 overflow-x-auto py-1">
      <button
        className="ui-focus-ring min-h-11 rounded-md border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-40"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        이전
      </button>
      {firstMobilePage > 1 ? (
        <span className="px-1 text-[var(--text-secondary)] sm:hidden">…</span>
      ) : null}
      {pages.map((page) => (
        <button
          aria-current={page === currentPage ? "page" : undefined}
          aria-label={`${page}페이지`}
          className={`ui-focus-ring size-11 shrink-0 items-center justify-center rounded-md border text-sm font-semibold transition ${
            page < firstMobilePage || page > lastMobilePage ? "hidden sm:inline-flex" : "inline-flex"
          } ${
            page === currentPage
              ? "border-[var(--brand-strong)] bg-[var(--surface-muted)] text-[var(--text-primary)]"
              : "border-[var(--border)] bg-white text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
          }`}
          key={page}
          onClick={() => onPageChange(page)}
          type="button"
        >
          {page}
        </button>
      ))}
      {lastMobilePage < totalPages ? (
        <span className="px-1 text-[var(--text-secondary)] sm:hidden">…</span>
      ) : null}
      <button
        className="ui-focus-ring min-h-11 rounded-md border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-40"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        다음
      </button>
    </nav>
  );
}
