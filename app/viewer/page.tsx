"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ActivityLog, MonthlyHighlight } from "@/src/types";
import {
  conquestTypes,
  getActivityDisplayTitle,
  getKnownConquestTypes,
  getMonthlyActivityLabel,
} from "@/src/lib/activityLabels";
import { getActivityStatsType } from "@/src/lib/activityStats";
import {
  getMostParticipatedActivity,
  type MonthlyReport,
} from "@/src/lib/monthlyReport";
import {
  ActivityDetailModal,
  type ActivityDetail,
} from "@/src/components/ActivityDetailModal";
import { AppHeader } from "@/src/components/ui/AppHeader";
import {
  formatDateRange,
  formatMonth,
  formatMonthDay,
} from "@/src/lib/displayFormat";
import { MonthlyHighlightsSection } from "@/src/components/MonthlyHighlightsSection";
import { MonthlyActivityCalendar } from "@/src/components/MonthlyActivityCalendar";

type MonthSummary = {
  month: string;
};

type MonthsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; months: MonthSummary[] };

type ReportState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "success";
      report: MonthlyReport;
      hasData: boolean;
      highlights: MonthlyHighlight[];
    };

type MonthlyActivityFilter = "all" | "airship" | "siege" | "other";

const monthlyActivityFilterLabels: Record<MonthlyActivityFilter, string> = {
  all: "전체",
  airship: "비공정",
  siege: "점령전",
  other: "이벤트",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthLabel(month: string) {
  return formatMonth(month);
}

function getDisplayDate(date: string) {
  return formatMonthDay(date);
}

function getSiegeRoundLabel(activity: ActivityLog) {
  return activity.title?.trim().match(/^(\d+회차)(?:\s|$)/)?.[1] ?? "점령전";
}

function toActivityDetail(
  activity: ActivityLog & {
    participantNames?: string[];
    participantKnownMemberIds?: string[];
  },
) {
  return {
    id: activity.id,
    date: activity.date,
    endDate: activity.endDate,
    label: getMonthlyActivityLabel(activity),
    title: getActivityDisplayTitle(activity),
    participantCount: activity.participantIds.length,
    participants: activity.participantIds.map((memberId, index) => ({
      id: memberId,
      nickname: activity.participantNames?.[index] ?? `알 수 없는 길드원 ${memberId.slice(0, 6)}`,
      isKnownMember: activity.participantKnownMemberIds?.includes(memberId) ?? true,
    })),
    memo: activity.memo?.trim() || undefined,
  };
}

function MonthlyActivityCard({
  activity,
  compactAirship = false,
  onSelect,
}: {
  activity: MonthlyReport["activities"][number];
  compactAirship?: boolean;
  onSelect: () => void;
}) {
  const statsType = getActivityStatsType(activity.type);
  const isSiege = statsType === "siege";
  const conquestLabel = getKnownConquestTypes(activity.conquestTypes).join(" · ");

  return (
    <li className="flex flex-col overflow-hidden rounded-md border border-sky-100 bg-white shadow-sm shadow-sky-100/50 transition hover:border-sky-200 hover:bg-sky-50/40">
      <button
        className="ui-focus-ring flex w-full flex-1 cursor-pointer flex-col text-left"
        onClick={onSelect}
        type="button"
      >
        <div className="flex flex-1 flex-col px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <span>
                {activity.endDate
                  ? formatDateRange(activity.date, activity.endDate)
                  : getDisplayDate(activity.date)}
              </span>
              {isSiege ? (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <strong className="text-slate-700">{getSiegeRoundLabel(activity)}</strong>
                </>
              ) : null}
            </div>
            <span className="shrink-0 rounded-md bg-sky-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {activity.participantIds.length}명
            </span>
          </div>
          {isSiege ? (
            <h3 className="mt-3 text-base font-semibold leading-6 text-slate-900">
              {conquestLabel || "점령전 종류 미기록"}
            </h3>
          ) : compactAirship ? null : (
            <h3 className="mt-3 text-base font-semibold leading-6 text-slate-900">
              {getActivityDisplayTitle(activity)}
            </h3>
          )}
          {activity.memo?.trim() ? (
            <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {activity.memo.trim()}
            </p>
          ) : null}
        </div>
      </button>
    </li>
  );
}

function subscribeLocation(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);

  return () => {
    window.removeEventListener("popstate", onStoreChange);
  };
}

function getServerMonthSnapshot() {
  return "";
}

function getMonthSnapshot() {
  return new URLSearchParams(window.location.search).get("month") ?? "";
}

function ReportMonthSelect({
  monthOptions,
  onChange,
  value,
}: {
  monthOptions: string[];
  onChange: (month: string) => void;
  value: string;
}) {
  return (
    <label className="flex w-full max-w-48 flex-col gap-1 text-sm font-medium text-[var(--text-secondary)]">
      <span className="sr-only">리포트 월</span>
      <select
        aria-label="리포트 월"
        className="ui-focus-ring min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-white px-3 py-2 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {monthOptions.map((month) => (
          <option key={month} value={month}>
            {getMonthLabel(month)}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function ViewerPage() {
  const [selectedMonth, setSelectedMonth] = useState("");
  const [monthsState, setMonthsState] = useState<MonthsState>({
    status: "loading",
  });
  const [reportState, setReportState] = useState<ReportState>({
    status: "idle",
  });
  const [selectedActivity, setSelectedActivity] =
    useState<ActivityDetail | null>(null);
  const [activityFilter, setActivityFilter] =
    useState<MonthlyActivityFilter>("all");
  const queryMonth = useSyncExternalStore<string>(
    subscribeLocation,
    getMonthSnapshot,
    getServerMonthSnapshot,
  );

  useEffect(() => {
    let isActive = true;

    async function loadMonths() {
      setMonthsState({ status: "loading" });

      try {
        const response = await fetch("/api/archive/months", {
          cache: "no-store",
        });
        const data: unknown = await response.json();

        if (
          !response.ok ||
          typeof data !== "object" ||
          data === null ||
          !("months" in data) ||
          !Array.isArray(data.months)
        ) {
          throw new Error("월 목록을 불러오지 못했습니다.");
        }

        if (isActive) {
          setMonthsState({
            status: "success",
            months: data.months as MonthSummary[],
          });
        }
      } catch (error) {
        if (isActive) {
          setMonthsState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "월 목록을 불러오지 못했습니다.",
          });
        }
      }
    }

    loadMonths();

    return () => {
      isActive = false;
    };
  }, []);

  const serverMonths = useMemo(
    () =>
      monthsState.status === "success"
        ? monthsState.months.map((summary) => summary.month)
        : [],
    [monthsState],
  );
  const currentMonth = today().slice(0, 7);
  const reportMonth = selectedMonth || queryMonth || serverMonths[0] || currentMonth;
  const monthOptions = useMemo(
    () =>
      Array.from(
        new Set([reportMonth, currentMonth, ...serverMonths].filter(Boolean)),
      ).sort((a, b) => b.localeCompare(a)),
    [currentMonth, reportMonth, serverMonths],
  );

  useEffect(() => {
    if (!reportMonth) {
      return;
    }

    let isActive = true;

    async function loadReport() {
      setReportState({ status: "loading" });

      try {
        const response = await fetch(
          `/api/archive/months/${encodeURIComponent(reportMonth)}`,
          { cache: "no-store" },
        );
        const data: unknown = await response.json();

        if (
          !response.ok ||
          typeof data !== "object" ||
          data === null ||
          !("report" in data) ||
          !("hasData" in data)
        ) {
          throw new Error("월간 리포트를 불러오지 못했습니다.");
        }

        if (isActive) {
          setReportState({
            status: "success",
            report: data.report as MonthlyReport,
            hasData: Boolean(data.hasData),
            highlights:
              "highlights" in data && Array.isArray(data.highlights)
                ? (data.highlights as MonthlyHighlight[])
                : [],
          });
        }
      } catch (error) {
        if (isActive) {
          setReportState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "월간 리포트를 불러오지 못했습니다.",
          });
        }
      }
    }

    loadReport();

    return () => {
      isActive = false;
    };
  }, [reportMonth]);

  const monthlyReport =
    reportState.status === "success" ? reportState.report : null;
  const monthlyHighlights =
    reportState.status === "success" ? reportState.highlights : [];
  const hasReportData =
    reportState.status === "success" ? reportState.hasData : false;
  const mostParticipatedActivity = monthlyReport
    ? getMostParticipatedActivity(monthlyReport.activities)
    : null;
  const monthlyActivities = monthlyReport
    ? [...monthlyReport.activities].sort((a, b) => {
        const dateOrder = b.date.localeCompare(a.date);
        return dateOrder === 0 ? b.id.localeCompare(a.id) : dateOrder;
      })
    : [];
  const visibleActivities = monthlyActivities.filter((activity) =>
    activityFilter === "all"
      ? true
      : getActivityStatsType(activity.type) === activityFilter,
  );
  const conquestCounts = new Map(
    monthlyReport?.conquestSummaries.map((summary) => [summary.label, summary.count]) ?? [],
  );
  const recordedConquestSummaries = conquestTypes
    .map((label) => ({ label, count: conquestCounts.get(label) ?? 0 }))
    .filter((summary) => summary.count > 0)
    .sort((first, second) => second.count - first.count);
  const averageParticipation = monthlyReport?.totalActivities
    ? monthlyReport.totalParticipationCount / monthlyReport.totalActivities
    : 0;
  const averageParticipationLabel = Number(averageParticipation.toFixed(1)).toString();
  const memberParticipationRate = monthlyReport?.monthMemberCount
    ? Math.round(
        (monthlyReport.monthParticipantMemberCount /
          monthlyReport.monthMemberCount) *
          100,
      )
    : 0;
  const activityComposition = monthlyReport
    ? [
        { label: "비공정", count: monthlyReport.airshipCount },
        { label: "점령전", count: monthlyReport.siegeCount },
        { label: "이벤트", count: monthlyReport.otherCount },
      ].map((item) => ({
        ...item,
        percentage: monthlyReport.totalActivities
          ? Math.round((item.count / monthlyReport.totalActivities) * 100)
          : 0,
      }))
    : [];

  return (
    <main className="app-shell">
      <AppHeader
        currentPath="/viewer"
        eyebrow="월간 활동 리포트"
        title="냥춘 활동 리포트"
      />

      {monthsState.status === "error" ? (
        <section className="rounded-md border border-red-100 bg-red-50 px-5 py-6">
          <h2 className="text-lg font-semibold text-red-800">
            월 목록을 불러오지 못했습니다.
          </h2>
          <p className="mt-2 text-sm text-red-700">{monthsState.message}</p>
        </section>
      ) : null}

      {reportState.status === "loading" ? (
        <section className="rounded-md border border-sky-100 bg-white p-5 shadow-sm shadow-sky-100/50">
          <h2 className="text-lg font-semibold text-slate-900">
            월간 리포트를 불러오는 중입니다.
          </h2>
        </section>
      ) : null}

      {reportState.status === "error" ? (
        <section className="rounded-md border border-red-100 bg-red-50 px-5 py-6">
          <h2 className="text-lg font-semibold text-red-800">
            월간 리포트를 불러오지 못했습니다.
          </h2>
          <p className="mt-2 text-sm text-red-700">{reportState.message}</p>
        </section>
      ) : null}

      {monthlyReport && !hasReportData ? (
        <section className="rounded-md border border-dashed border-sky-200 bg-white px-5 py-10 text-center">
          <div className="mb-6 flex justify-center">
            <ReportMonthSelect
              monthOptions={monthOptions}
              onChange={setSelectedMonth}
              value={reportMonth}
            />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            {getMonthLabel(reportMonth)} 활동 기록이 없습니다.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            다른 월을 선택하면 기록된 활동을 볼 수 있습니다.
          </p>
        </section>
      ) : null}

      {monthlyReport && hasReportData ? (
        <>
          <section className="space-y-5 rounded-md border border-sky-100 bg-white p-5 shadow-sm shadow-sky-100/50">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">
                  {getMonthLabel(reportMonth)} 활동 리포트
                </h2>
              <p className="text-sm leading-6 text-slate-600">
                이번 달에는 {monthlyReport.totalActivities}회의 활동이 기록되었고,{" "}
                {monthlyReport.participantMemberCount}명의 길드원이 한 번 이상 함께했습니다.
              </p>
              </div>
              <ReportMonthSelect
                monthOptions={monthOptions}
                onChange={setSelectedMonth}
                value={reportMonth}
              />
            </div>

            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="flex min-h-24 flex-col justify-center rounded-md bg-sky-50 px-4 py-4">
                <dt className="text-xs font-medium text-slate-500">이번 달 활동</dt>
                <dd className="mt-1 text-2xl font-bold text-slate-900">
                  {monthlyReport.totalActivities}회
                </dd>
              </div>
              <div className="flex min-h-24 flex-col justify-center rounded-md bg-sky-50 px-4 py-4">
                <dt className="text-xs font-medium text-slate-500">함께한 길드원</dt>
                <dd className="mt-1 text-2xl font-bold text-slate-900">
                  {monthlyReport.participantMemberCount}명
                </dd>
              </div>
              <div className="flex min-h-24 flex-col justify-center rounded-md bg-sky-50 px-4 py-4">
                <dt className="text-xs font-medium text-slate-500">최다 참여 활동</dt>
                <dd className="mt-1 min-w-0 text-slate-900">
                  {mostParticipatedActivity ? (
                    <>
                      <span className="block line-clamp-2 text-base font-bold leading-6">
                        {getActivityDisplayTitle(mostParticipatedActivity)}
                      </span>
                      <span className="block text-sm font-semibold text-[var(--brand-strong)]">
                        {mostParticipatedActivity.participantIds.length}명
                      </span>
                    </>
                  ) : (
                    <span className="text-2xl font-bold">없음</span>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <MonthlyHighlightsSection
            highlights={monthlyHighlights}
            key={reportMonth}
          />

          <section className="rounded-md border border-sky-100 bg-white p-5 shadow-sm shadow-sky-100/50">
            <h2 className="text-lg font-semibold text-slate-900">이번 달 참여 분석</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="flex min-h-24 flex-col justify-center rounded-md bg-sky-50 px-4 py-4">
                <dt className="text-xs font-medium text-slate-500">참여 합계</dt>
                <dd className="mt-1 text-2xl font-bold text-slate-900">
                  {monthlyReport.totalParticipationCount}회
                </dd>
              </div>
              <div className="flex min-h-24 flex-col justify-center rounded-md bg-sky-50 px-4 py-4">
                <dt className="text-xs font-medium text-slate-500">활동당 평균</dt>
                <dd className="mt-1 text-2xl font-bold text-slate-900">
                  {monthlyReport.totalActivities === 0
                    ? "0명"
                    : `${averageParticipationLabel}명`}
                </dd>
              </div>
              <div className="flex min-h-24 flex-col justify-center rounded-md bg-sky-50 px-4 py-4">
                <dt className="text-xs font-medium text-slate-500">길드원 참여율</dt>
                <dd className="mt-1 text-2xl font-bold text-slate-900">
                  {memberParticipationRate}%
                </dd>
                <p className="mt-1 text-xs text-slate-500">
                  {monthlyReport.monthParticipantMemberCount}명 /{" "}
                  {monthlyReport.monthMemberCount}명 · 해당 월 소속 기준
                </p>
              </div>
            </dl>
          </section>

          <section>
            <div className="rounded-md border border-sky-100 bg-white p-5 shadow-sm shadow-sky-100/50">
              <h2 className="text-lg font-semibold text-slate-900">
                활동 구성
              </h2>
              <dl className="mt-4 space-y-3">
                {activityComposition.map(({ label, count, percentage }) => (
                  <div className={count === 0 ? "text-slate-400" : "text-slate-900"} key={label}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <dt>{label}</dt>
                      <dd className={count === 0 ? "font-medium" : "font-bold"}>
                        {count}회 · {percentage}%
                      </dd>
                    </div>
                    {count > 0 ? (
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sky-50" aria-hidden="true">
                        <div className="h-full rounded-full bg-[var(--brand-strong)]" style={{ width: `${percentage}%` }} />
                      </div>
                    ) : null}
                  </div>
                ))}
              </dl>

              <h3 className="mt-5 text-sm font-semibold text-slate-900">
                점령전
              </h3>
              {recordedConquestSummaries.length > 0 ? (
                <dl className="mt-3 grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-3">
                  {recordedConquestSummaries.map(({ label, count }) => (
                    <div
                      className="rounded-md bg-[var(--surface-muted)] px-3 py-2.5 text-slate-900"
                      key={label}
                    >
                      <dt>{label}</dt>
                      <dd className="font-semibold">{count}회</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-3 rounded-md bg-slate-50 px-3 py-4 text-sm text-slate-500">
                  이번 달 기록 없음
                </p>
              )}
            </div>

          </section>

          <MonthlyActivityCalendar
            activities={monthlyReport.activities}
            month={reportMonth}
            onSelectActivity={(activity) =>
              setSelectedActivity(toActivityDetail(activity))
            }
          />

          <section className="rounded-md border border-sky-100 bg-white p-5 shadow-sm shadow-sky-100/50">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {getMonthLabel(reportMonth)} 활동
                </h2>
                <p className="mt-1 text-sm text-slate-500">선택한 달에 기록된 활동만 표시합니다.</p>
              </div>
              <div
                aria-label="월간 활동 종류"
                className="flex w-full gap-1 overflow-x-auto rounded-md bg-sky-50 p-1 sm:w-fit"
                role="group"
              >
                {(Object.entries(monthlyActivityFilterLabels) as [MonthlyActivityFilter, string][]).map(
                  ([value, label]) => (
                    <button
                      aria-pressed={activityFilter === value}
                      className={`ui-focus-ring min-h-10 shrink-0 rounded-md px-3 text-sm font-medium transition ${
                        activityFilter === value
                          ? "bg-white text-[var(--brand-strong)] shadow-sm"
                          : "text-slate-600 hover:bg-white/70"
                      }`}
                      key={value}
                      onClick={() => setActivityFilter(value)}
                      type="button"
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
            </div>
            {visibleActivities.length === 0 ? (
              <p className="mt-3 rounded-md border border-dashed border-sky-200 bg-sky-50 px-3 py-5 text-center text-sm text-slate-500">
                선택한 종류의 활동 기록이 없습니다.
              </p>
            ) : activityFilter === "airship" ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {(["아우로라", "오션헤븐"] as const).map((airshipLabel) => {
                  const airshipActivities = visibleActivities.filter(
                    (activity) => getMonthlyActivityLabel(activity) === airshipLabel,
                  );

                  return (
                    <section className="rounded-md bg-sky-50/70 p-3" key={airshipLabel}>
                      <h3 className="px-1 pb-3 text-sm font-semibold text-slate-700">{airshipLabel}</h3>
                      {airshipActivities.length > 0 ? (
                        <ul className="grid gap-3">
                          {airshipActivities.map((activity) => (
                            <MonthlyActivityCard
                              activity={activity}
                              compactAirship
                              key={activity.id}
                              onSelect={() => setSelectedActivity(toActivityDetail(activity))}
                            />
                          ))}
                        </ul>
                      ) : (
                        <p className="rounded-md border border-dashed border-sky-200 bg-white px-4 py-6 text-center text-sm text-slate-500">기록 없음</p>
                      )}
                    </section>
                  );
                })}
              </div>
            ) : (
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visibleActivities.map((activity) => (
                  <MonthlyActivityCard
                    activity={activity}
                    key={activity.id}
                    onSelect={() => setSelectedActivity(toActivityDetail(activity))}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      <ActivityDetailModal
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />
    </main>
  );
}
