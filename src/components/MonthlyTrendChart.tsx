"use client";

import { useState } from "react";
import { formatMonth } from "@/src/lib/displayFormat";
import type { MonthlyHighlightCategory } from "@/src/types";
import { monthlyHighlightCategoryBadgeClasses } from "@/src/lib/monthlyHighlights";

export type MonthlyTrend = {
  month: string;
  activityCount: number;
  participantMemberCount: number;
  representativeHighlights?: Array<{
    id: string;
    category: MonthlyHighlightCategory;
    title: string;
  }>;
};

function getShortMonthLabel(month: string) {
  const [, monthNumber] = month.split("-");
  return monthNumber ? `${Number(monthNumber)}월` : month;
}

export function MonthlyTrendChart({
  description,
  emptyMessage,
  onSelectMonth,
  title,
  trends,
  unit,
  valueKey,
}: {
  description: string;
  emptyMessage: string;
  onSelectMonth?: (month: string) => void;
  title: string;
  trends: MonthlyTrend[];
  unit: string;
  valueKey: "activityCount" | "participantMemberCount";
}) {
  const [openHighlightMonth, setOpenHighlightMonth] = useState<string | null>(null);
  const maxValue = Math.max(...trends.map((trend) => trend[valueKey]), 0);

  return (
    <section className="min-w-0 rounded-md border border-sky-100 bg-white p-5 shadow-sm shadow-sky-100/50">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>

      {trends.length === 0 || maxValue === 0 ? (
        <p className="mt-5 rounded-md border border-dashed border-sky-200 bg-sky-50 px-4 py-8 text-center text-sm text-slate-500">
          {emptyMessage}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto pb-1">
          <div className={`flex h-64 items-end gap-3 border-b border-sky-100 pb-3 sm:min-w-0 ${trends.length > 4 ? "min-w-[32rem]" : "min-w-0"}`}>
            {trends.map((trend, index) => {
              const value = trend[valueKey];
              const height = Math.max(8, Math.round((value / maxValue) * 100));
              const highlights = trend.representativeHighlights ?? [];
              const content = (
                <>
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1 rounded-md bg-slate-900 px-2 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus:opacity-100"
                    role="tooltip"
                  >
                    {formatMonth(trend.month)} · {valueKey === "activityCount" ? "활동" : "함께한 길드원"} {value}{unit}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    {value}{unit}
                  </span>
                  <span className="flex h-44 w-full items-end justify-center">
                    <span
                      aria-hidden="true"
                      className="w-7 max-w-[70%] rounded-sm bg-sky-300 transition-colors group-hover:bg-[var(--brand-strong)] group-focus:bg-[var(--brand-strong)]"
                      style={{ height: `${height}%` }}
                    />
                  </span>
                  <span className="w-full truncate text-center text-xs text-slate-500">
                    {getShortMonthLabel(trend.month)}
                  </span>
                </>
              );

              return (
                <div className="relative flex min-w-12 flex-1" key={trend.month}>
                  <button
                    aria-label={`${formatMonth(trend.month)} ${valueKey === "activityCount" ? "활동" : "함께한 길드원"} ${value}${unit}, 월별 요약으로 이동`}
                    className="ui-focus-ring group relative flex w-full cursor-pointer flex-col items-center gap-2 rounded-sm"
                    onClick={() => onSelectMonth?.(trend.month)}
                    type="button"
                  >
                    {content}
                  </button>
                  {highlights.length > 0 ? (
                    <div
                      className="group/highlight absolute left-1/2 z-20 -translate-x-1/2"
                      style={{ bottom: `calc(2.25rem + ${height * 0.11}rem)` }}
                    >
                      <button
                        aria-expanded={openHighlightMonth === trend.month}
                        aria-label={`${formatMonth(trend.month)} 주요 기록 ${highlights.length}건 확인`}
                        className="ui-focus-ring block size-4 rounded-full border-2 border-white bg-amber-400 shadow-sm transition hover:scale-110 focus-visible:scale-110"
                        onClick={() =>
                          setOpenHighlightMonth((month) =>
                            month === trend.month ? null : trend.month,
                          )
                        }
                        type="button"
                      />
                      <div
                        className={`absolute top-6 z-30 w-52 rounded-md bg-slate-900 p-3 text-left text-white shadow-lg transition-opacity group-hover/highlight:visible group-hover/highlight:opacity-100 group-focus-within/highlight:visible group-focus-within/highlight:opacity-100 ${
                          index === 0
                            ? "left-0"
                            : index === trends.length - 1
                              ? "right-0"
                              : "left-1/2 -translate-x-1/2"
                        } ${
                          openHighlightMonth === trend.month
                            ? "visible opacity-100"
                            : "invisible opacity-0"
                        }`}
                        role="tooltip"
                      >
                        <p className="text-xs font-semibold">{formatMonth(trend.month)} 주요 기록</p>
                        <ul className="mt-2 grid gap-1.5">
                          {highlights.slice(0, 2).map((highlight) => (
                            <li className="flex items-start gap-1.5 text-xs" key={highlight.id}>
                              <span
                                aria-hidden="true"
                                className={`mt-1 size-2 shrink-0 rounded-full ${monthlyHighlightCategoryBadgeClasses[highlight.category]}`}
                              />
                              <span>{highlight.title}</span>
                            </li>
                          ))}
                          {highlights.length > 2 ? (
                            <li className="text-xs text-slate-300">
                              외 {highlights.length - 2}건
                            </li>
                          ) : null}
                        </ul>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export function RecentMonthlyTrendChart({ trends }: { trends: MonthlyTrend[] }) {
  const maxValue = Math.max(
    ...trends.flatMap((trend) => [trend.activityCount, trend.participantMemberCount]),
    0,
  );
  const chartWidth = 720;
  const chartHeight = 190;
  const plotLeft = 34;
  const plotRight = 686;
  const plotTop = 28;
  const plotBottom = 142;
  const plotHeight = plotBottom - plotTop;
  const getX = (index: number) =>
    trends.length <= 1
      ? chartWidth / 2
      : plotLeft + ((plotRight - plotLeft) * index) / (trends.length - 1);
  const getY = (value: number) =>
    plotBottom - (value / Math.max(maxValue, 1)) * plotHeight;
  const activityPoints = trends
    .map((trend, index) => `${getX(index)},${getY(trend.activityCount)}`)
    .join(" ");
  const memberPoints = trends
    .map((trend, index) => `${getX(index)},${getY(trend.participantMemberCount)}`)
    .join(" ");

  return (
    <section className="h-full min-w-0 rounded-md border border-sky-100 bg-white p-5 shadow-sm shadow-sky-100/50">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">최근 6개월 활동 흐름</h2>
        <p className="mt-1 text-sm text-slate-500">월별 활동 횟수와 활동 참여 인원을 비교합니다.</p>
      </div>

      <div aria-label="그래프 범례" className="mt-4 flex flex-wrap gap-5 text-xs text-slate-700">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-sky-300" />활동 횟수</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[var(--brand-strong)]" />활동 참여 인원</span>
      </div>

      {trends.length === 0 ? (
        <p className="mt-5 rounded-md border border-dashed border-sky-200 bg-sky-50 px-4 py-8 text-center text-sm text-slate-500">최근 활동 기록이 아직 없습니다.</p>
      ) : (
        <div className="mt-3 min-w-0 overflow-hidden">
          <svg
            aria-label="최근 6개월 활동 횟수와 활동 참여 인원 변화"
            className="block h-auto w-full"
            role="img"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          >
            {[0.25, 0.5, 0.75].map((ratio) => {
              const y = plotBottom - plotHeight * ratio;
              return <line className="stroke-sky-100" key={ratio} x1={plotLeft} x2={plotRight} y1={y} y2={y} />;
            })}
            <polyline fill="none" pointerEvents="none" points={activityPoints} stroke="var(--color-sky-300)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
            <polyline fill="none" pointerEvents="none" points={memberPoints} stroke="var(--brand-strong)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />

            {trends.map((trend, index) => {
              const x = getX(index);
              const activityY = getY(trend.activityCount);
              const memberY = getY(trend.participantMemberCount);
              const hitWidth = chartWidth / trends.length;
              const hitLeft = index * hitWidth;
              const tooltipWidth = 174;
              const tooltipX = Math.min(
                chartWidth - tooltipWidth / 2,
                Math.max(tooltipWidth / 2, x),
              );
              const pointDistance = Math.abs(activityY - memberY);
              const collisionOffset = Math.max(0, 24 - pointDistance) * 0.55;
              const memberLabelY = Math.max(12, memberY - 12 - collisionOffset);
              let activityLabelY = Math.min(158, activityY + 19 + collisionOffset);

              if (Math.abs(activityLabelY - memberLabelY) < 22) {
                activityLabelY = Math.min(158, memberLabelY + 24);
              }

              return (
                <a
                  aria-label={`${formatMonth(trend.month)} 월간 리포트 보기`}
                  className="group outline-none"
                  href={`/viewer?month=${trend.month}`}
                  key={trend.month}
                >
                  <title>{`${formatMonth(trend.month)} · 활동 횟수 ${trend.activityCount}회 · 활동 참여 인원 ${trend.participantMemberCount}명`}</title>
                  <rect className="fill-transparent" height="178" width={hitWidth} x={hitLeft} y="4" />
                  <circle className="fill-white stroke-sky-300 transition group-hover:fill-sky-50 group-hover:stroke-sky-500 group-focus:fill-sky-50 group-focus:stroke-sky-500" cx={x} cy={activityY} r="5" strokeWidth="3" />
                  <circle className="fill-white stroke-[var(--brand-strong)] transition group-hover:fill-sky-50 group-hover:stroke-sky-600 group-focus:fill-sky-50 group-focus:stroke-sky-600" cx={x} cy={memberY} r="5" strokeWidth="3" />
                  <text className="fill-sky-700 stroke-white stroke-2 text-[10px] font-semibold transition [paint-order:stroke] group-hover:fill-sky-900 group-focus:fill-sky-900 sm:text-[11px]" pointerEvents="none" strokeLinejoin="round" textAnchor="middle" x={x} y={activityLabelY}>
                    {trend.activityCount}회
                  </text>
                  <text className="fill-[var(--brand-strong)] stroke-white stroke-2 text-[10px] font-semibold transition [paint-order:stroke] group-hover:fill-sky-900 group-focus:fill-sky-900 sm:text-[11px]" pointerEvents="none" strokeLinejoin="round" textAnchor="middle" x={x} y={memberLabelY}>
                    {trend.participantMemberCount}명
                  </text>
                  <text className="fill-slate-500 text-[11px] font-medium transition group-hover:fill-sky-700 group-focus:fill-sky-700 sm:text-xs" textAnchor="middle" x={x} y="181">
                    {getShortMonthLabel(trend.month)}
                  </text>
                  <g className="pointer-events-none opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100" role="tooltip">
                    <rect fill="#0f172a" height="38" rx="6" width={tooltipWidth} x={tooltipX - tooltipWidth / 2} y="2" />
                    <text className="fill-white text-[10px] font-medium" textAnchor="middle" x={tooltipX} y="17">
                      {formatMonth(trend.month)}
                    </text>
                    <text className="fill-white text-[10px]" textAnchor="middle" x={tooltipX} y="31">
                      활동 {trend.activityCount}회 · 참여 {trend.participantMemberCount}명
                    </text>
                  </g>
                </a>
              );
            })}
          </svg>
        </div>
      )}
    </section>
  );
}
