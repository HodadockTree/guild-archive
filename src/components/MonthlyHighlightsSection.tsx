"use client";

import { useState } from "react";
import type { MonthlyHighlight } from "@/src/types";
import { getMonthlyHighlightDateText } from "@/src/lib/monthlyHighlights";
import {
  monthlyHighlightCategoryBadgeClasses,
  monthlyHighlightCategoryLabels,
} from "@/src/lib/monthlyHighlights";
import { Surface } from "@/src/components/ui/Surface";

type PublicMonthlyHighlight = Pick<
  MonthlyHighlight,
  | "id"
  | "category"
  | "title"
  | "startDate"
  | "endDate"
  | "dateText"
  | "description"
>;

export function MonthlyHighlightsSection({
  highlights,
}: {
  highlights: PublicMonthlyHighlight[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (highlights.length === 0) {
    return null;
  }

  const hiddenCount = Math.max(0, highlights.length - 2);
  const visibleHighlights = isExpanded ? highlights : highlights.slice(0, 2);

  return (
    <Surface variant="section">
      <div>
        <h2 className="ui-section-title">
          이달의 주요 기록
        </h2>
      </div>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {visibleHighlights.map((highlight) => (
          <li
            className="rounded-md bg-[var(--color-bg-interactive)] p-4"
            key={highlight.id}
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-1 text-xs ${monthlyHighlightCategoryBadgeClasses[highlight.category]}`}
                >
                  {monthlyHighlightCategoryLabels[highlight.category]}
                </span>
                {getMonthlyHighlightDateText(highlight) ? (
                  <span className="ui-caption">
                    {getMonthlyHighlightDateText(highlight)}
                  </span>
                ) : null}
              </div>
              <h3 className="ui-card-title mt-2">
                {highlight.title}
              </h3>
              {highlight.description ? (
                <p className="ui-body-text mt-2 whitespace-pre-wrap">
                  {highlight.description}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 ? (
        <button
          aria-expanded={isExpanded}
          className="ui-focus-ring mx-auto mt-4 block min-h-11 rounded-md px-4 py-2 text-sm font-semibold text-[var(--color-text-accent)] transition hover:bg-[var(--color-bg-muted)]"
          onClick={() => setIsExpanded((expanded) => !expanded)}
          type="button"
        >
          {isExpanded ? "주요 기록 접기" : `주요 기록 ${hiddenCount}건 더보기`}
        </button>
      ) : null}
    </Surface>
  );
}
