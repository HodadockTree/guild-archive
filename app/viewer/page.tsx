"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ActivityLog, MonthlyHighlight } from "@/src/types";
import type { AnniversaryMilestone } from "@/src/lib/anniversaries";
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
import { Surface } from "@/src/components/ui/Surface";

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

function getMonthlyAnniversaryLabel(anniversary: AnniversaryMilestone) {
  const milestone = anniversary.milestoneKind === "years"
    ? `${anniversary.milestone}주년`
    : `${anniversary.milestone}일`;

  return anniversary.nickname
    ? `${formatMonthDay(anniversary.date)} · ${anniversary.nickname}님 · 함께한 지 ${milestone}`
    : `${formatMonthDay(anniversary.date)} · 냥춘 · ${milestone}`;
}

const monthlyActivityFilterLabels: Record<MonthlyActivityFilter, string> = {
  all: "전체",
  airship: "비공정",
  siege: "점령전",
  other: "이벤트",
};

function today() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
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
    <li className="flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] transition hover:border-[var(--color-border-interactive)] hover:bg-[var(--color-bg-interactive)]">
      <button
        className="ui-focus-ring flex w-full flex-1 cursor-pointer flex-col text-left"
        onClick={onSelect}
        type="button"
      >
        <div className="flex flex-1 flex-col px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="ui-caption flex min-w-0 flex-wrap items-center gap-1.5">
              <span>
                {activity.endDate
                  ? formatDateRange(activity.date, activity.endDate)
                  : getDisplayDate(activity.date)}
              </span>
              {isSiege ? (
                <>
                  <span aria-hidden="true" className="text-[var(--color-border-default)]">·</span>
                  <strong className="text-[var(--color-text-secondary)]">{getSiegeRoundLabel(activity)}</strong>
                </>
              ) : null}
            </div>
            <span className="ui-caption shrink-0 whitespace-nowrap text-[var(--color-text-secondary)]">
              참여 {activity.participantIds.length}명
            </span>
          </div>
          {isSiege ? (
            <h3 className="ui-card-title mt-2">
              {conquestLabel || "점령전 종류 미기록"}
            </h3>
          ) : compactAirship ? null : (
            <h3 className="ui-card-title mt-2">
              {getActivityDisplayTitle(activity)}
            </h3>
          )}
          {activity.memo?.trim() ? (
            <p className="ui-body-text mt-2 line-clamp-4 whitespace-pre-wrap">
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
    <label className="flex w-full max-w-48 flex-col gap-1 text-sm font-medium text-[var(--color-text-secondary)]">
      <span className="sr-only">리포트 월</span>
      <select
        aria-label="리포트 월"
        className="ui-focus-ring min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm"
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
  const requestedMonth = selectedMonth || queryMonth;
  const reportMonth =
    (requestedMonth && requestedMonth <= currentMonth ? requestedMonth : "") ||
    serverMonths.find((month) => month <= currentMonth) ||
    currentMonth;
  const monthOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [reportMonth, currentMonth, ...serverMonths]
            .filter(Boolean)
            .filter((month) => month <= currentMonth),
        ),
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
        <Surface variant="section">
          <h2 className="ui-section-title">
            월간 리포트를 불러오는 중입니다.
          </h2>
        </Surface>
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
        <section className="ui-empty-state ui-empty-state-surface px-5 py-10">
          <div className="mb-6 flex justify-center">
            <ReportMonthSelect
              monthOptions={monthOptions}
              onChange={setSelectedMonth}
              value={reportMonth}
            />
          </div>
          <h2 className="ui-section-title">
            {getMonthLabel(reportMonth)} 활동 기록이 없습니다.
          </h2>
          <p className="ui-supporting-text mx-auto mt-2 max-w-xl leading-6">
            다른 월을 선택하면 기록된 활동을 볼 수 있습니다.
          </p>
        </section>
      ) : null}

      {monthlyReport && hasReportData ? (
        <>
          <Surface variant="section">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="ui-section-title">
                  {getMonthLabel(reportMonth)} 활동 리포트
                </h2>
              </div>
              <ReportMonthSelect
                monthOptions={monthOptions}
                onChange={setSelectedMonth}
                value={reportMonth}
              />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-[var(--radius-card)] bg-[var(--color-bg-muted)] p-4 sm:grid-cols-3">
              <div className="flex min-h-20 flex-col justify-center">
                <dt className="ui-supporting-text font-medium">이번 달 활동</dt>
                <dd className="ui-metric-hero mt-1 whitespace-nowrap">
                  {monthlyReport.totalActivities}회
                </dd>
              </div>
              <div className="flex min-h-20 flex-col justify-center">
                <dt className="ui-supporting-text font-medium">함께한 길드원</dt>
                <dd className="ui-metric-hero mt-1 whitespace-nowrap">
                  {monthlyReport.participantMemberCount}명
                </dd>
              </div>
              <div className="col-span-2 min-w-0 border-t border-[var(--color-border-subtle)] pt-3 sm:col-span-1 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
                <dt className="ui-caption">최다 참여 활동</dt>
                <dd className="mt-1 min-w-0 text-[var(--color-text-primary)]">
                  {mostParticipatedActivity ? (
                    <>
                      <span className="ui-card-title block line-clamp-2">
                        {getActivityDisplayTitle(mostParticipatedActivity)}
                      </span>
                      <span className="ui-caption mt-1 block text-[var(--color-text-secondary)]">
                        참여 {mostParticipatedActivity.participantIds.length}명
                      </span>
                    </>
                  ) : (
                    <span className="ui-metric-inline">없음</span>
                  )}
                </dd>
              </div>
            </dl>
          </Surface>

          {monthlyReport.newMembers.length > 0 || monthlyReport.anniversaries.length > 0 ? (
            <Surface variant="section">
              <h2 className="ui-section-title">이번 달 변화</h2>
              <div className="mt-3 space-y-4">
                {monthlyReport.newMembers.length > 0 ? (
                  <section>
                    <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">
                      새로 함께한 길드원 · {monthlyReport.newMembers.length}명
                    </h3>
                    <ul className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4">
                      {monthlyReport.newMembers.map((member) => (
                        <li className="min-w-0" key={member.id}>
                          <Link
                            aria-label={`${member.nickname} 개인 기록 페이지 보기`}
                            className="ui-focus-ring flex min-h-11 min-w-0 items-center gap-1.5 rounded-[var(--radius-control)] px-2 py-1.5 text-sm transition hover:bg-[var(--color-bg-interactive)]"
                            href={`/members/${encodeURIComponent(member.id)}`}
                          >
                            <span className="shrink-0 text-xs text-[var(--color-text-muted)]">
                              {formatMonthDay(member.joinedAt)}
                            </span>
                            <span className="min-w-0 break-words font-medium leading-5 text-[var(--color-text-primary)]">
                              {member.nickname}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                {monthlyReport.anniversaries.length > 0 ? (
                  <section>
                    <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">
                      기념일 · {monthlyReport.anniversaries.length}건
                    </h3>
                    <ul className="mt-2 space-y-1">
                      {monthlyReport.anniversaries.map((anniversary) => (
                        <li key={anniversary.id}>
                          {anniversary.memberId ? (
                            <Link
                              aria-label={`${anniversary.nickname} 개인 기록 페이지 보기`}
                              className="ui-focus-ring inline-flex min-h-11 max-w-full items-center rounded-[var(--radius-control)] px-2 py-1 text-sm font-medium leading-5 text-[var(--color-text-primary)] transition hover:bg-[var(--color-bg-interactive)]"
                              href={`/members/${encodeURIComponent(anniversary.memberId)}`}
                            >
                              {getMonthlyAnniversaryLabel(anniversary)}
                            </Link>
                          ) : (
                            <span className="inline-flex min-h-11 items-center px-2 py-1 text-sm font-medium text-[var(--color-text-primary)]">
                              {getMonthlyAnniversaryLabel(anniversary)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            </Surface>
          ) : null}

          <Surface variant="section">
            <h2 className="ui-section-title">이번 달 참여 분석</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 rounded-[var(--radius-card)] bg-[var(--color-bg-muted)] p-4 sm:grid-cols-3">
              <div className="flex min-h-16 flex-col justify-center">
                <dt className="ui-caption">참여 합계</dt>
                <dd className="ui-metric-section mt-1 whitespace-nowrap">
                  {monthlyReport.totalParticipationCount}회
                </dd>
              </div>
              <div className="flex min-h-16 flex-col justify-center">
                <dt className="ui-caption">활동당 평균</dt>
                <dd className="ui-metric-section mt-1 whitespace-nowrap">
                  {monthlyReport.totalActivities === 0
                    ? "0명"
                    : `${averageParticipationLabel}명`}
                </dd>
              </div>
              <div className="col-span-2 flex min-h-16 flex-col justify-center border-t border-[var(--color-border-subtle)] pt-3 sm:col-span-1 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
                <dt className="ui-caption">길드원 참여율</dt>
                <dd className="ui-metric-section mt-1 whitespace-nowrap">
                  {memberParticipationRate}%
                </dd>
                <p className="ui-caption mt-1">
                  {monthlyReport.monthParticipantMemberCount}명 /{" "}
                  {monthlyReport.monthMemberCount}명 · 해당 월 소속 기준
                </p>
              </div>
            </dl>
          </Surface>

          <section>
            <Surface variant="section">
              <h2 className="ui-section-title">
                활동 구성
              </h2>
              <dl className="mt-3 space-y-3 rounded-[var(--radius-card)] bg-[var(--color-bg-muted)] p-4">
                {activityComposition.map(({ label, count, percentage }) => (
                  <div className={count === 0 ? "text-[var(--color-text-muted)]" : "text-[var(--color-text-primary)]"} key={label}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <dt>{label}</dt>
                      <dd>
                        <span className="ui-metric-inline">{count}회</span>
                        <span className="ui-caption ml-1.5">{percentage}%</span>
                      </dd>
                    </div>
                    {count > 0 ? (
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--color-bg-surface)]" aria-hidden="true">
                        <div className="h-full rounded-full bg-[var(--color-brand-strong)]" style={{ width: `${percentage}%` }} />
                      </div>
                    ) : null}
                  </div>
                ))}
              </dl>

              <h3 className="mt-5 text-sm font-semibold text-[var(--color-text-primary)]">
                점령전
              </h3>
              {recordedConquestSummaries.length > 0 ? (
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 rounded-[var(--radius-card)] bg-[var(--color-bg-muted)] p-4 text-sm sm:grid-cols-3">
                  {recordedConquestSummaries.map(({ label, count }) => (
                    <div
                      className="text-[var(--color-text-primary)]"
                      key={label}
                    >
                      <dt>{label}</dt>
                      <dd className="ui-metric-inline mt-1">{count}회</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="ui-empty-state mt-3 py-4">
                  이번 달 기록 없음
                </p>
              )}
            </Surface>

          </section>

          <MonthlyHighlightsSection
            highlights={monthlyHighlights}
            key={reportMonth}
          />

          <MonthlyActivityCalendar
            activities={monthlyReport.activities}
            anniversaries={monthlyReport.calendarAnniversaries}
            month={reportMonth}
            onSelectActivity={(activity) =>
              setSelectedActivity(toActivityDetail(activity))
            }
          />

          <Surface variant="section">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="ui-section-title">
                  {getMonthLabel(reportMonth)} 활동
                </h2>
                <p className="ui-supporting-text mt-1">선택한 달에 기록된 활동만 표시합니다.</p>
              </div>
              <div
                aria-label="월간 활동 종류"
                className="flex w-full gap-1 overflow-x-auto rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] p-1 sm:w-fit"
                role="group"
              >
                {(Object.entries(monthlyActivityFilterLabels) as [MonthlyActivityFilter, string][]).map(
                  ([value, label]) => (
                    <button
                      aria-pressed={activityFilter === value}
                      className={`ui-focus-ring min-h-10 shrink-0 rounded-md px-3 text-sm font-medium transition ${
                        activityFilter === value
                          ? "border border-[var(--color-border-selected)] bg-[var(--color-bg-surface)] text-[var(--color-text-accent)] shadow-sm"
                          : "border border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-interactive)]"
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
              <p className="ui-empty-state mt-3 py-5">
                선택한 종류의 활동 기록이 없습니다.
              </p>
            ) : activityFilter === "airship" ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {(["아우로라", "오션헤븐"] as const).map((airshipLabel) => {
                  const airshipActivities = visibleActivities.filter(
                    (activity) => getMonthlyActivityLabel(activity) === airshipLabel,
                  );

                  return (
                    <section className="rounded-md bg-[var(--color-bg-muted)] p-3" key={airshipLabel}>
                      <h3 className="px-1 pb-3 text-sm font-semibold text-[var(--color-text-secondary)]">{airshipLabel}</h3>
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
                        <p className="ui-empty-state ui-empty-state-surface py-6">기록 없음</p>
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
          </Surface>
        </>
      ) : null}

      <ActivityDetailModal
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />
    </main>
  );
}
