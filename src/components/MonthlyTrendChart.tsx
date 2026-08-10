"use client";

import { useState } from "react";
import { formatMonth } from "@/src/lib/displayFormat";
import type { MonthlyHighlightCategory } from "@/src/types";

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

type FlowMetric = "activityCount" | "participantMemberCount";

const flowMetricConfig: Record<
  FlowMetric,
  { label: string; shortLabel: string; unit: string }
> = {
  activityCount: { label: "활동 수", shortLabel: "활동", unit: "회" },
  participantMemberCount: {
    label: "함께한 길드원",
    shortLabel: "길드원",
    unit: "명",
  },
};

function getShortMonthLabel(month: string) {
  const [, monthNumber] = month.split("-");
  return monthNumber ? `${Number(monthNumber)}월` : month;
}

export function GuildFlowChart({ trends }: { trends: MonthlyTrend[] }) {
  const [metric, setMetric] = useState<FlowMetric>("activityCount");
  const [activeMonth, setActiveMonth] = useState<string | null>(null);
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonthNumber = currentDate.getMonth() + 1;
  const trendsByMonth = new Map(trends.map((trend) => [trend.month, trend]));
  const visibleTrends = Array.from(
    { length: currentMonthNumber },
    (_, index) => {
      const month = `${currentYear}-${String(index + 1).padStart(2, "0")}`;
      return (
        trendsByMonth.get(month) ?? {
          month,
          activityCount: 0,
          participantMemberCount: 0,
        }
      );
    },
  );
  const config = flowMetricConfig[metric];
  const maxValue = Math.max(...visibleTrends.map((trend) => trend[metric]), 0);
  const peakTrend = visibleTrends.reduce((peak, trend) =>
    trend[metric] > peak[metric] ? trend : peak,
  );
  const chartWidth = 720;
  const chartHeight = 180;
  const plotLeft = 28;
  const plotRight = 692;
  const plotTop = 24;
  const plotBottom = 154;
  const plotHeight = plotBottom - plotTop;
  const getX = (index: number) =>
    visibleTrends.length === 1
      ? chartWidth / 2
      : plotLeft +
        ((plotRight - plotLeft) * index) / (visibleTrends.length - 1);
  const getY = (value: number) =>
    plotBottom - (value / Math.max(maxValue, 1)) * plotHeight;
  const points = visibleTrends
    .map((trend, index) => `${getX(index)},${getY(trend[metric])}`)
    .join(" ");
  const activeIndex = visibleTrends.findIndex(
    (trend) => trend.month === activeMonth,
  );
  const activeTrend = activeIndex >= 0 ? visibleTrends[activeIndex] : null;

  return (
    <section className="min-w-0 rounded-md border border-sky-100 bg-white p-4 shadow-sm shadow-sky-100/40 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">길드 흐름</h2>
          <p className="mt-1 text-sm text-slate-500">
            월별 변화를 지표별로 확인할 수 있습니다.
          </p>
        </div>
        <div
          aria-label="길드 흐름 지표"
          className="inline-flex w-fit rounded-md bg-sky-50 p-1"
          role="tablist"
        >
          {(Object.keys(flowMetricConfig) as FlowMetric[]).map((key) => (
            <button
              aria-controls="guild-flow-panel"
              aria-selected={metric === key}
              className={`ui-focus-ring min-h-10 rounded px-3 text-sm font-semibold transition ${
                metric === key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              id={`guild-flow-tab-${key}`}
              key={key}
              onClick={() => {
                setMetric(key);
                setActiveMonth(null);
              }}
              onKeyDown={(event) => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
                  return;
                }

                event.preventDefault();
                const keys = Object.keys(flowMetricConfig) as FlowMetric[];
                const offset = event.key === "ArrowRight" ? 1 : -1;
                const nextKey = keys[(keys.indexOf(key) + offset + keys.length) % keys.length];
                setMetric(nextKey);
                setActiveMonth(null);
                requestAnimationFrame(() =>
                  document.getElementById(`guild-flow-tab-${nextKey}`)?.focus(),
                );
              }}
              role="tab"
              tabIndex={metric === key ? 0 : -1}
              type="button"
            >
              {flowMetricConfig[key].label}
            </button>
          ))}
        </div>
      </div>

      <div
        aria-labelledby={`guild-flow-tab-${metric}`}
        aria-label={`${config.label} 월별 선 그래프`}
        className="mt-4"
        id="guild-flow-panel"
        role="tabpanel"
      >
        {maxValue === 0 ? (
          <p className="rounded-md border border-dashed border-sky-200 px-4 py-10 text-center text-sm text-slate-500">
            표시할 {config.label} 기록이 아직 없습니다.
          </p>
        ) : (
          <div className="min-w-0">
            <div className="relative h-44">
              <svg
                aria-hidden="true"
                className="absolute inset-0 size-full"
                preserveAspectRatio="none"
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              >
                {[0, 0.5, 1].map((ratio) => {
                  const y = plotBottom - plotHeight * ratio;
                  return (
                    <line
                      className="stroke-sky-100"
                      key={ratio}
                      strokeWidth="1"
                      x1={plotLeft}
                      x2={plotRight}
                      y1={y}
                      y2={y}
                    />
                  );
                })}
                <polyline
                  className="stroke-sky-400"
                  fill="none"
                  points={points}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>

              {visibleTrends.map((trend, index) => {
                const isPeak = trend.month === peakTrend.month;
                const isActive = trend.month === activeMonth;

                return (
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform ${
                      isPeak ? "size-2 bg-amber-400" : "size-1.5 bg-sky-400"
                    } ${isActive ? "scale-150" : ""}`}
                    key={trend.month}
                    style={{
                      left: `${(getX(index) / chartWidth) * 100}%`,
                      top: `${(getY(trend[metric]) / chartHeight) * 100}%`,
                    }}
                  />
                );
              })}

              <div className="absolute inset-0">
                {visibleTrends.map((trend, index) => (
                  <button
                    aria-label={`${getShortMonthLabel(trend.month)} · ${config.shortLabel} ${trend[metric]}${config.unit}`}
                    className="ui-focus-ring absolute inset-y-0 rounded-sm"
                    key={trend.month}
                    onBlur={() => setActiveMonth(null)}
                    onClick={() => setActiveMonth(trend.month)}
                    onFocus={() => setActiveMonth(trend.month)}
                    onMouseEnter={() => setActiveMonth(trend.month)}
                    onMouseLeave={() => setActiveMonth(null)}
                    style={{
                      left: `${(index * 100) / visibleTrends.length}%`,
                      width: `${100 / visibleTrends.length}%`,
                    }}
                    type="button"
                  />
                ))}
              </div>

              {activeTrend ? (
                <div
                  className={`pointer-events-none absolute z-10 -translate-y-[calc(100%+0.5rem)] rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white shadow-sm ${
                    activeIndex === 0
                      ? "translate-x-0"
                      : activeIndex === visibleTrends.length - 1
                        ? "-translate-x-full"
                        : "-translate-x-1/2"
                  }`}
                  role="tooltip"
                  style={{
                    left: `${(getX(activeIndex) / chartWidth) * 100}%`,
                    top: `${(Math.max(getY(activeTrend[metric]), 42) / chartHeight) * 100}%`,
                  }}
                >
                  {getShortMonthLabel(activeTrend.month)} · {config.shortLabel}{" "}
                  {activeTrend[metric]}
                  {config.unit}
                </div>
              ) : null}
            </div>
            <div
              aria-hidden="true"
              className="mt-1 grid text-center text-[11px] text-slate-500 sm:text-xs"
              style={{
                gridTemplateColumns: `repeat(${visibleTrends.length}, minmax(0, 1fr))`,
              }}
            >
              {visibleTrends.map((trend) => (
                <span key={trend.month}>{getShortMonthLabel(trend.month)}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {maxValue > 0 ? (
        <p className="mt-2 text-sm text-slate-600">
          <span className="font-semibold text-slate-800">가장 활발했던 달</span>{" "}
          {getShortMonthLabel(peakTrend.month)} · {config.shortLabel}{" "}
          {peakTrend[metric]}
          {config.unit}
        </p>
      ) : null}
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
