"use client";

import Link from "next/link";
import { formatMonth } from "@/src/lib/displayFormat";

export type MonthlyTrend = {
  month: string;
  activityCount: number;
  participantMemberCount: number;
};

function getShortMonthLabel(month: string) {
  const [, monthNumber] = month.split("-");
  return monthNumber ? `${Number(monthNumber)}월` : month;
}

export function MonthlyTrendChart({
  description,
  emptyMessage,
  linkToReports = false,
  title,
  trends,
  unit,
  valueKey,
}: {
  description: string;
  emptyMessage: string;
  linkToReports?: boolean;
  title: string;
  trends: MonthlyTrend[];
  unit: string;
  valueKey: "activityCount" | "participantMemberCount";
}) {
  const maxValue = Math.max(...trends.map((trend) => trend[valueKey]), 0);

  return (
    <section className="rounded-md border border-sky-100 bg-white p-5 shadow-sm shadow-sky-100/50">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>

      {trends.length === 0 || maxValue === 0 ? (
        <p className="mt-5 rounded-md border border-dashed border-sky-200 bg-sky-50 px-4 py-8 text-center text-sm text-slate-500">
          {emptyMessage}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto pb-1">
          <div className={`flex h-64 items-end gap-3 border-b border-sky-100 pb-3 sm:min-w-0 ${trends.length > 4 ? "min-w-[32rem]" : "min-w-0"}`}>
            {trends.map((trend) => {
              const value = trend[valueKey];
              const height = Math.max(8, Math.round((value / maxValue) * 100));
              const content = (
                <>
                  <span className={`text-xs font-semibold ${value === maxValue ? "text-[var(--brand-strong)]" : "text-slate-500"}`}>
                    {value}{unit}
                  </span>
                  <span className="flex h-44 w-full items-end rounded-sm bg-sky-50">
                    <span
                      aria-hidden="true"
                      className={`w-full rounded-sm ${value === maxValue ? "bg-[var(--brand-strong)]" : "bg-sky-200"}`}
                      style={{ height: `${height}%` }}
                    />
                  </span>
                  <span className="w-full truncate text-center text-xs text-slate-500">
                    {getShortMonthLabel(trend.month)}
                  </span>
                </>
              );

              return linkToReports ? (
                <Link
                  aria-label={`${formatMonth(trend.month)} ${value}${unit} 리포트 보기`}
                  className="ui-focus-ring group flex min-w-12 flex-1 flex-col items-center gap-2 rounded-sm transition hover:bg-sky-50"
                  href={`/viewer?month=${trend.month}`}
                  key={trend.month}
                >
                  {content}
                </Link>
              ) : (
                <div
                  aria-label={`${formatMonth(trend.month)} ${value}${unit}`}
                  className="flex min-w-12 flex-1 flex-col items-center gap-2"
                  key={trend.month}
                >
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
