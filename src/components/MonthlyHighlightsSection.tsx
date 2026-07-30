"use client";

import { useState } from "react";
import type { MonthlyHighlight } from "@/src/types";
import { ActivityImage } from "@/src/components/ActivityImage";
import {
  monthlyHighlightCategoryBadgeClasses,
  monthlyHighlightCategoryLabels,
} from "@/src/lib/monthlyHighlights";

type PublicMonthlyHighlight = Pick<
  MonthlyHighlight,
  | "id"
  | "category"
  | "title"
  | "dateText"
  | "description"
  | "imageUrl"
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
    <section className="rounded-md border border-sky-100 bg-white p-5 shadow-sm shadow-sky-100/50">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          이달의 주요 기록
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          게임 업데이트, 이벤트와 길드 소식을 모았습니다.
        </p>
      </div>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {visibleHighlights.map((highlight) => (
          <li
            className="overflow-hidden rounded-md border border-sky-100 bg-sky-50/40"
            key={highlight.id}
          >
            {highlight.imageUrl ? (
              <ActivityImage
                alt={`${highlight.title} 이미지`}
                className="max-h-56 w-full border-b border-sky-100 object-contain"
                src={highlight.imageUrl}
              />
            ) : null}
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-1 text-xs ${monthlyHighlightCategoryBadgeClasses[highlight.category]}`}
                >
                  {monthlyHighlightCategoryLabels[highlight.category]}
                </span>
                {highlight.dateText ? (
                  <span className="text-xs text-slate-500">
                    {highlight.dateText}
                  </span>
                ) : null}
              </div>
              <h3 className="mt-2 text-base font-bold text-slate-900">
                {highlight.title}
              </h3>
              {highlight.description ? (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
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
          className="ui-focus-ring mx-auto mt-4 block min-h-11 rounded-md px-4 py-2 text-sm font-semibold text-[var(--brand-strong)] transition hover:bg-sky-50"
          onClick={() => setIsExpanded((expanded) => !expanded)}
          type="button"
        >
          {isExpanded ? "주요 기록 접기" : `주요 기록 ${hiddenCount}건 더보기`}
        </button>
      ) : null}
    </section>
  );
}
