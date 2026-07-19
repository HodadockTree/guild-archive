"use client";

import { type ReactNode, useEffect } from "react";
import { Surface } from "@/src/components/ui/Surface";

type DashboardSummaryModalProps = {
  title: string;
  description?: string;
  children: ReactNode;
  disableEscapeClose?: boolean;
  onClose: () => void;
};

export function DashboardSummaryModal({
  title,
  description,
  children,
  disableEscapeClose = false,
  onClose,
}: DashboardSummaryModalProps) {
  useEffect(() => {
    if (disableEscapeClose) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [disableEscapeClose, onClose]);

  return (
    <div
      aria-labelledby="dashboard-summary-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 px-4 py-4 sm:items-center"
      onClick={onClose}
      role="dialog"
    >
      <Surface
        as="div"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto shadow-xl shadow-slate-900/15"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-sky-100 bg-white px-5 py-4">
          <div className="min-w-0">
            <h2
              className="text-xl font-bold leading-7 text-slate-900"
              id="dashboard-summary-title"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {description}
              </p>
            ) : null}
          </div>
          <button
            aria-label="모달 닫기"
            className="shrink-0 rounded-md border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
            onClick={onClose}
            type="button"
          >
            닫기
          </button>
        </div>

        <div className="px-5 py-5">{children}</div>
      </Surface>
    </div>
  );
}
