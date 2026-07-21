"use client";

import Link from "next/link";
import { formatMonth } from "@/src/lib/displayFormat";

export type MonthlyTrend = {
  month: string;
  activityCount: number;
  participantMemberCount: number;
};

type TrendInteraction = "none" | "report" | "members";

function getShortMonthLabel(month: string) {
  const [, monthNumber] = month.split("-");
  return monthNumber ? `${Number(monthNumber)}월` : month;
}

export function MonthlyTrendChart({
  description,
  emptyMessage,
  interaction = "none",
  onSelectMembers,
  title,
  trends,
  unit,
  valueKey,
}: {
  description: string;
  emptyMessage: string;
  interaction?: TrendInteraction;
  onSelectMembers?: (month: string, trigger: HTMLButtonElement) => void;
  title: string;
  trends: MonthlyTrend[];
  unit: string;
  valueKey: "activityCount" | "participantMemberCount";
}) {
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
            {trends.map((trend) => {
              const value = trend[valueKey];
              const height = Math.max(8, Math.round((value / maxValue) * 100));
              const content = (
                <>
                  <span className="text-xs font-semibold text-slate-600">
                    {value}{unit}
                  </span>
                  <span className="flex h-44 w-full items-end rounded-sm bg-sky-50">
                    <span
                      aria-hidden="true"
                      className="w-full rounded-sm bg-sky-300 transition group-hover:bg-[var(--brand-strong)]"
                      style={{ height: `${height}%` }}
                    />
                  </span>
                  <span className="w-full truncate text-center text-xs text-slate-500">
                    {getShortMonthLabel(trend.month)}
                  </span>
                </>
              );

              if (interaction === "report") {
                return (
                  <Link
                    aria-label={`${formatMonth(trend.month)} 활동 ${value}회, 월간 리포트 보기`}
                    className="ui-focus-ring group flex min-w-12 flex-1 cursor-pointer flex-col items-center gap-2 rounded-sm transition hover:bg-sky-50"
                    href={`/viewer?month=${trend.month}`}
                    key={trend.month}
                  >
                    {content}
                  </Link>
                );
              }

              if (interaction === "members") {
                return (
                  <button
                    aria-label={`${formatMonth(trend.month)} 함께한 길드원 ${value}명 보기`}
                    className="ui-focus-ring group flex min-w-12 flex-1 cursor-pointer flex-col items-center gap-2 rounded-sm transition hover:bg-sky-50"
                    key={trend.month}
                    onClick={(event) => onSelectMembers?.(trend.month, event.currentTarget)}
                    type="button"
                  >
                    {content}
                  </button>
                );
              }

              return (
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">최근 6개월 활동 흐름</h2>
          <p className="mt-1 text-sm text-slate-500">달력 기준 최근 6개월의 활동과 함께한 길드원을 비교합니다.</p>
        </div>
        <Link className="ui-focus-ring rounded-md border border-sky-100 px-2.5 py-1.5 text-sm font-semibold text-[var(--brand-strong)] transition hover:border-sky-200 hover:bg-sky-50" href="/archive">
          월별 기록 보기 →
        </Link>
      </div>

      <div aria-label="그래프 범례" className="mt-4 flex flex-wrap gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-sky-300" />활동 수</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--brand-strong)]" />함께한 길드원</span>
      </div>

      {trends.length === 0 ? (
        <p className="mt-5 rounded-md border border-dashed border-sky-200 bg-sky-50 px-4 py-8 text-center text-sm text-slate-500">최근 활동 기록이 아직 없습니다.</p>
      ) : (
        <div className="mt-3 min-w-0 overflow-hidden">
          <svg
            aria-label="최근 6개월 활동 수와 함께한 길드원 수 변화"
            className="block h-auto w-full"
            role="img"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          >
            {[0.25, 0.5, 0.75].map((ratio) => {
              const y = plotBottom - plotHeight * ratio;
              return <line className="stroke-sky-100" key={ratio} x1={plotLeft} x2={plotRight} y1={y} y2={y} />;
            })}
            <polyline fill="none" points={activityPoints} stroke="var(--color-sky-300)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
            <polyline fill="none" points={memberPoints} stroke="var(--brand-strong)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />

            {trends.map((trend, index) => {
              const x = getX(index);
              const activityY = getY(trend.activityCount);
              const memberY = getY(trend.participantMemberCount);
              const activityLabelY = activityY <= memberY
                ? Math.max(12, activityY - 10)
                : Math.min(158, activityY + 17);
              const memberLabelY = memberY < activityY
                ? Math.max(12, memberY - 10)
                : Math.min(158, memberY + 17);

              return (
                <g
                  aria-label={`${formatMonth(trend.month)} 활동 수 ${trend.activityCount}회, 함께한 길드원 ${trend.participantMemberCount}명`}
                  className="group outline-none"
                  key={trend.month}
                  role="img"
                  tabIndex={0}
                >
                  <title>{`${formatMonth(trend.month)} · 활동 수 ${trend.activityCount}회 · 함께한 길드원 ${trend.participantMemberCount}명`}</title>
                  <circle className="fill-white stroke-sky-300 transition group-focus:stroke-sky-500" cx={x} cy={activityY} r="5" strokeWidth="3" />
                  <circle className="fill-white stroke-[var(--brand-strong)] transition group-focus:stroke-sky-500" cx={x} cy={memberY} r="5" strokeWidth="3" />
                  <text className="fill-slate-600 text-[10px] font-semibold sm:text-[11px]" textAnchor="middle" x={x} y={activityLabelY}>
                    {trend.activityCount}회
                  </text>
                  <text className="fill-slate-600 text-[10px] font-semibold sm:text-[11px]" textAnchor="middle" x={x} y={memberLabelY}>
                    {trend.participantMemberCount}명
                  </text>
                  <text className="fill-slate-500 text-[11px] font-medium sm:text-xs" textAnchor="middle" x={x} y="181">
                    {getShortMonthLabel(trend.month)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </section>
  );
}
