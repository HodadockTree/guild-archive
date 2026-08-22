"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type {
  DashboardActivitySummary,
  DashboardMemberSummary,
  DashboardStats,
} from "@/src/lib/dashboardStats";
import {
  ActivityDetailModal,
  type ActivityDetail,
} from "@/src/components/ActivityDetailModal";
import { DashboardSummaryModal } from "@/src/components/DashboardSummaryModal";
import { AppHeader } from "@/src/components/ui/AppHeader";
import { RecentMonthlyTrendChart } from "@/src/components/MonthlyTrendChart";
import { MemberActivityPanel } from "@/src/components/MemberActivityPanel";
import { AirshipParticipationChart } from "@/src/components/AirshipParticipationChart";
import {
  formatDateRange,
  formatFullDate,
  formatMonth,
  formatMonthDay,
} from "@/src/lib/displayFormat";

type DashboardState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; dashboard: DashboardStats };

type SummaryModalKey =
  | "activeMembers"
  | "currentMonthActivities"
  | "currentMonthParticipants"
  | "memberMonthActivities"
  | "allActivities"
  | "allMembers";

type RecentActivityFilter = "all" | "airship" | "siege" | "other";

const recentActivityFilterLabels: Record<RecentActivityFilter, string> = {
  all: "전체",
  airship: "비공정",
  siege: "점령전",
  other: "이벤트",
};

function getMonthLabel(month: string) {
  return formatMonth(month);
}

function getDisplayDate(date: string) {
  return formatMonthDay(date);
}

const GUILD_STARTED_AT = { year: 2026, monthIndex: 0, day: 22 } as const;

function getGuildAgeDays(today: Date) {
  const todayDate = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const startedDate = Date.UTC(
    GUILD_STARTED_AT.year,
    GUILD_STARTED_AT.monthIndex,
    GUILD_STARTED_AT.day,
  );
  const elapsedDays = Math.floor((todayDate - startedDate) / 86_400_000) + 1;

  return elapsedDays > 0 ? elapsedDays : null;
}

function SummaryCard({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick?: () => void;
}) {
  const isClickable = Boolean(onClick);

  return (
    <div
      className={`flex min-h-28 flex-col justify-center rounded-md border border-sky-100 bg-white px-4 py-4 shadow-sm shadow-sky-100/50 transition hover:border-sky-200 hover:bg-sky-50/40 ${
        isClickable
          ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2"
          : ""
      }`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick || (event.key !== "Enter" && event.key !== " ")) {
          return;
        }

        event.preventDefault();
        onClick();
      }}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-2 text-3xl font-bold text-slate-900">{value}</dd>
    </div>
  );
}

function getDurationLabel(member: DashboardMemberSummary) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(member.joinedAt)) {
    return "-";
  }

  const endDate = /^\d{4}-\d{2}-\d{2}$/.test(member.leftAt ?? "")
    ? member.leftAt
    : new Date().toISOString().slice(0, 10);

  if (!endDate) {
    return "-";
  }

  const startTime = new Date(`${member.joinedAt}T00:00:00`).getTime();
  const endTime = new Date(`${endDate}T00:00:00`).getTime();

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) {
    return "-";
  }

  const dayCount = Math.floor((endTime - startTime) / 86_400_000) + 1;
  return member.leftAt ? `${dayCount}일` : `${dayCount}일째`;
}

function MemberList({
  emptyMessage,
  members,
  showLeftAt = true,
}: {
  emptyMessage: string;
  members: DashboardMemberSummary[];
  showLeftAt?: boolean;
}) {
  if (members.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-sky-200 bg-sky-50 px-4 py-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="hidden overflow-hidden rounded-md border border-sky-100 sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-sky-50 text-xs font-semibold text-slate-500">
            <tr>
              <th className="px-4 py-3">닉네임</th>
              <th className="px-4 py-3">가입일</th>
              {showLeftAt ? <th className="px-4 py-3">탈퇴일</th> : null}
              <th className="px-4 py-3">함께한 기간</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-100 bg-white">
            {members.map((member) => (
              <tr key={member.id}>
                <td className="px-4 py-3 font-semibold text-slate-900">
                  <Link aria-label={`${member.nickname} 개인 기록 페이지 보기`} className="ui-focus-ring inline-flex min-h-11 items-center rounded-md px-2 py-1 transition hover:bg-sky-100" href={`/members/${encodeURIComponent(member.id)}`}>
                    {member.nickname}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {member.joinedAt ? formatFullDate(member.joinedAt) : "-"}
                </td>
                {showLeftAt ? (
                  <td className="px-4 py-3 text-slate-600">
                    {member.leftAt ? formatFullDate(member.leftAt) : "-"}
                  </td>
                ) : null}
                <td className="px-4 py-3 text-slate-700">
                  {getDurationLabel(member)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-2 sm:hidden">
        {members.map((member) => (
        <li
          className="rounded-md border border-sky-100 bg-sky-50 px-4 py-3"
          key={member.id}
        >
          <Link aria-label={`${member.nickname} 개인 기록 페이지 보기`} className="ui-focus-ring inline-flex min-h-11 items-center rounded-md px-2 py-1 font-semibold text-slate-900 transition hover:bg-sky-100" href={`/members/${encodeURIComponent(member.id)}`}>
            {member.nickname}
          </Link>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            가입일 {member.joinedAt ? formatFullDate(member.joinedAt) : "-"} ·{" "}
            {showLeftAt ? `탈퇴일 ${member.leftAt ? formatFullDate(member.leftAt) : "-"} · ` : ""}
            {getDurationLabel(member)}
          </p>
        </li>
      ))}
      </ul>
    </div>
  );
}

function ParticipantChipList({
  emptyMessage,
  members,
  onSelectMember,
}: {
  emptyMessage: string;
  members: DashboardMemberSummary[];
  onSelectMember: (member: DashboardMemberSummary, trigger: HTMLButtonElement) => void;
}) {
  if (members.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-sky-200 bg-sky-50 px-4 py-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {members.map((member) => (
        <li key={member.id}>
          <button
            aria-label={`${member.nickname} 활동 기록 보기`}
            className="ui-focus-ring min-h-11 max-w-full cursor-pointer rounded-md bg-sky-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-sky-100"
            onClick={(event) => onSelectMember(member, event.currentTarget)}
            type="button"
          >
            {member.nickname}
          </button>
        </li>
      ))}
    </ul>
  );
}

function ActivitySummaryList({
  activities,
  emptyMessage,
  onSelectActivity,
}: {
  activities: DashboardActivitySummary[];
  emptyMessage: string;
  onSelectActivity: (activity: ActivityDetail) => void;
}) {
  if (activities.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-sky-200 bg-sky-50 px-4 py-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {activities.map((activity) => (
        <li key={activity.id}>
          <button
            className="w-full rounded-md border border-sky-100 bg-white px-4 py-3 text-left text-sm shadow-sm shadow-sky-100/40 transition hover:border-sky-200 hover:bg-sky-50/50 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2"
            onClick={() => onSelectActivity(activity)}
            type="button"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs text-slate-500">
                  {formatDateRange(activity.date, activity.endDate)}
                </p>
                <h3 className="mt-1 font-semibold leading-6 text-slate-900">
                  {activity.title}
                </h3>
                {activity.label.startsWith("점령전 (") ? (
                  <p className="mt-1 text-slate-600">{activity.label}</p>
                ) : null}
              </div>
              <span className="w-fit shrink-0 rounded-md bg-sky-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                참여 {activity.participantCount}명
              </span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function CumulativeSummaryCard({
  description,
  label,
  onClick,
  value,
}: {
  description?: string;
  label: string;
  onClick?: () => void;
  value: string;
}) {
  const isClickable = Boolean(onClick);

  return (
    <div
      className={`rounded-md bg-sky-50 px-4 py-4 transition ${
        isClickable
          ? "cursor-pointer hover:bg-sky-100/70 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2"
          : ""
      }`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick || (event.key !== "Enter" && event.key !== " ")) {
          return;
        }

        event.preventDefault();
        onClick();
      }}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className={`mt-1 font-bold text-slate-900 ${label === "길드 시작일" ? "text-xl sm:text-2xl" : "text-2xl"}`}>{value}</dd>
      {description ? (
        <p className="mt-1 text-xs font-medium text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}

function ActivityCard({
  activity,
  onSelect,
  showTitle = true,
}: {
  activity: DashboardActivitySummary;
  onSelect: (activity: ActivityDetail) => void;
  showTitle?: boolean;
}) {
  return (
    <li>
      <button
      className="ui-focus-ring flex w-full cursor-pointer flex-col rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-4 py-3 text-left shadow-sm shadow-sky-100/50 transition hover:border-sky-300 hover:bg-[var(--surface-muted)]"
        onClick={() => onSelect(activity)}
        type="button"
      >
      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500">
              {activity.endDate
                ? formatDateRange(activity.date, activity.endDate)
                : getDisplayDate(activity.date)}
            </span>
          </div>
          <span className="shrink-0 rounded-md bg-sky-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {activity.participantCount}명
          </span>
        </div>

        {showTitle ? (
          <h3 className="mt-3 text-base font-semibold leading-6 text-slate-900">
            {activity.title}
          </h3>
        ) : null}
        {activity.memo ? (
          <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {activity.memo}
          </p>
        ) : null}
      </div>
      </button>
    </li>
  );
}

export default function DashboardPage() {
  const [currentMonth] = useState(() =>
    new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 7),
  );
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    status: "loading",
  });
  const [guildAgeDays, setGuildAgeDays] = useState<number | null>(null);
  const [selectedActivity, setSelectedActivity] =
    useState<ActivityDetail | null>(null);
  const mostActivityTriggerRef = useRef<HTMLButtonElement>(null);
  const restoreMostActivityFocusRef = useRef(false);
  const [selectedSummaryModal, setSelectedSummaryModal] =
    useState<SummaryModalKey | null>(null);
  const [selectedMonthMemberId, setSelectedMonthMemberId] =
    useState<string | null>(null);
  const [memberReturnModal, setMemberReturnModal] =
    useState<SummaryModalKey>("currentMonthParticipants");
  const [recentActivityFilter, setRecentActivityFilter] =
    useState<RecentActivityFilter>("all");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setGuildAgeDays(getGuildAgeDays(new Date()));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      setDashboardState({ status: "loading" });

      try {
        const response = await fetch("/api/dashboard", { cache: "no-store" });
        const data: unknown = await response.json();

        if (
          !response.ok ||
          typeof data !== "object" ||
          data === null ||
          !("dashboard" in data)
        ) {
          throw new Error("홈 데이터를 불러오지 못했습니다.");
        }

        if (isActive) {
          setDashboardState({
            status: "success",
            dashboard: data.dashboard as DashboardStats,
          });
        }
      } catch (error) {
        if (isActive) {
          setDashboardState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "홈 데이터를 불러오지 못했습니다.",
          });
        }
      }
    }

    loadDashboard();

    return () => {
      isActive = false;
    };
  }, []);

  const dashboard =
    dashboardState.status === "success" ? dashboardState.dashboard : null;
  const selectedMonthMember = dashboard?.allMembers.find(
    (member) => member.id === selectedMonthMemberId,
  );
  const selectedMemberInitialData =
    dashboard && selectedMonthMember
      ? {
          member: selectedMonthMember,
          activities: dashboard.allActivities.filter((activity) =>
            activity.participantIds.includes(selectedMonthMember.id),
          ),
        }
      : undefined;
  const currentMonthTypeCounts = dashboard?.currentMonthActivities.reduce(
    (counts, activity) => {
      counts[activity.statsType] += 1;
      return counts;
    },
    { airship: 0, siege: 0, other: 0 },
  );
  const currentMonthTotalParticipation =
    dashboard?.currentMonthActivities.reduce(
      (total, activity) => total + activity.participantCount,
      0,
    ) ?? 0;
  const currentMonthAverageParticipation =
    dashboard && dashboard.currentMonthActivityCount > 0
      ? (
          currentMonthTotalParticipation / dashboard.currentMonthActivityCount
        ).toFixed(1)
      : null;
  const currentMonthMostParticipated = dashboard
    ? [...dashboard.currentMonthActivities].sort((a, b) => {
        const participantOrder = b.participantCount - a.participantCount;
        return participantOrder || b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
      })[0] ?? null
    : null;
  const visibleRecentActivities =
    dashboard?.allActivities
      .filter((activity) => {
        if (recentActivityFilter === "all") return true;
        return activity.statsType === recentActivityFilter;
      })
      .slice(0, recentActivityFilter === "airship" ? 12 : 6) ?? [];

  return (
    <main className="app-shell">
      <AppHeader
        currentPath="/"
        description="길드의 현재 현황과 쌓여온 활동 기록을 한눈에 살펴보세요."
        eyebrow="냥춘 길드 활동 아카이브"
        title="냥춘 활동 대시보드"
      />

      {dashboardState.status === "loading" ? (
        <section className="rounded-md border border-sky-100 bg-white px-5 py-10 text-center shadow-sm shadow-sky-100/50">
          <h2 className="text-lg font-semibold text-slate-900">
            대시보드 데이터를 불러오는 중입니다.
          </h2>
        </section>
      ) : null}

      {dashboardState.status === "error" ? (
        <section className="rounded-md border border-red-100 bg-red-50 px-5 py-10 text-center">
          <h2 className="text-lg font-semibold text-red-800">
            대시보드 데이터를 불러오지 못했습니다.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-red-700">
            {dashboardState.message}
          </p>
        </section>
      ) : null}

      {dashboard ? (
        <>
          <section>
            <dl className="grid gap-3 sm:grid-cols-3">
              <SummaryCard
                label="현재 길드원 수"
                value={`${dashboard.activeMemberCount}명`}
                onClick={() => setSelectedSummaryModal("activeMembers")}
              />
              <SummaryCard
                label="이번 달 활동"
                value={`${dashboard.currentMonthActivityCount}회`}
                onClick={() => setSelectedSummaryModal("currentMonthActivities")}
              />
              <SummaryCard
                label="이번 달 참여 인원"
                value={`${dashboard.currentMonthParticipantMemberCount}명`}
                onClick={() => {
                  setSelectedMonthMemberId(null);
                  setSelectedSummaryModal("currentMonthParticipants");
                }}
              />
            </dl>
          </section>

          <section className="rounded-md border border-sky-100 bg-white p-5 shadow-sm shadow-sky-100/50">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                냥춘 누적 기록
              </h2>
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              <CumulativeSummaryCard
                description={guildAgeDays ? `길드 운영 ${guildAgeDays}일째` : undefined}
                label="길드 시작일"
                value="2026년 1월 22일"
              />
              <CumulativeSummaryCard
                label="전체 활동"
                onClick={() => setSelectedSummaryModal("allActivities")}
                value={`${dashboard.totalActivityCount}회`}
              />
              <CumulativeSummaryCard
                label="함께했던 길드원"
                onClick={() => setSelectedSummaryModal("allMembers")}
                value={`${dashboard.totalMemberCount}명`}
              />
            </dl>
          </section>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(20rem,1fr)] lg:items-stretch">
            <RecentMonthlyTrendChart trends={dashboard.monthlyTrends} />

            <section className="flex min-w-0 flex-col rounded-md border border-sky-100 bg-white p-5 shadow-sm shadow-sky-100/50 lg:h-full">
              <h2 className="text-lg font-semibold text-slate-900">이번 달 활동 요약</h2>
              <dl className="mt-4 grid flex-1 grid-cols-2 content-between gap-4">
                <div className="flex min-h-16 flex-col justify-center rounded-md bg-sky-50 px-3 py-2.5">
                  <dt className="text-xs font-medium text-slate-600">비공정</dt>
                  <dd className="font-bold text-slate-900">{currentMonthTypeCounts?.airship ?? 0}회</dd>
                </div>
                <div className="flex min-h-16 flex-col justify-center rounded-md bg-sky-50 px-3 py-2.5">
                  <dt className="text-xs font-medium text-slate-600">점령전</dt>
                  <dd className="font-bold text-slate-900">{currentMonthTypeCounts?.siege ?? 0}회</dd>
                </div>
                <div className="flex min-h-16 flex-col justify-center rounded-md bg-sky-50 px-3 py-2.5">
                  <dt className="text-xs font-medium text-slate-600">참여 합계</dt>
                  <dd className="font-bold text-slate-900">
                    {currentMonthTotalParticipation}회
                  </dd>
                </div>
                <div className="flex min-h-16 flex-col justify-center rounded-md bg-sky-50 px-3 py-2.5">
                  <dt className="text-xs font-medium text-slate-600">활동당 평균</dt>
                  <dd className="font-bold text-slate-900">
                    {currentMonthAverageParticipation
                      ? `${currentMonthAverageParticipation}명`
                      : "0명"}
                  </dd>
                </div>
                <div className="col-span-2 min-w-0 rounded-md bg-sky-50 px-3 py-3">
                  <dt className="text-xs font-medium text-slate-600">최다 참여 활동</dt>
                  <dd className="mt-1 min-w-0">
                    {currentMonthMostParticipated ? (
                      <button
                        aria-label={`${currentMonthMostParticipated.title} 활동 상세 보기`}
                        className="ui-focus-ring flex w-full min-w-0 cursor-pointer items-center justify-between gap-3 rounded-md py-1 text-left transition hover:bg-sky-100/70"
                        onClick={() => {
                          restoreMostActivityFocusRef.current = true;
                          setSelectedActivity(currentMonthMostParticipated);
                        }}
                        ref={mostActivityTriggerRef}
                        type="button"
                      >
                        <span className="min-w-0">
                          <span className="block text-xs text-slate-400">
                            {currentMonthMostParticipated.endDate
                              ? formatDateRange(
                                  currentMonthMostParticipated.date,
                                  currentMonthMostParticipated.endDate,
                                )
                              : getDisplayDate(currentMonthMostParticipated.date)}
                          </span>
                          <span className="mt-0.5 block break-words font-bold leading-5 text-slate-900">
                            {currentMonthMostParticipated.title}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-md bg-sky-100 px-2 py-1 text-sm font-semibold text-[var(--brand-strong)]">
                          {currentMonthMostParticipated.participantCount}명
                        </span>
                      </button>
                    ) : (
                      <span className="font-bold text-slate-900">기록 없음</span>
                    )}
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(20rem,1fr)]">
            <AirshipParticipationChart activities={dashboard.currentMonthActivities} />
            <section className="rounded-md border border-sky-100 bg-white p-5 shadow-sm shadow-sky-100/50">
              <h2 className="text-lg font-semibold text-slate-900">이번 달 자주 함께한 길드원</h2>
              <p className="mt-1 text-sm text-slate-500">바나몽·반아몽을 제외한 활동별 참여 기록입니다.</p>
              <div className="mt-4 space-y-4">
                {(["airship", "siege"] as const).map((type) => {
                  const participants = dashboard.currentMonthTopParticipants[type];
                  return (
                    <div className="rounded-md bg-sky-50 px-4 py-3" key={type}>
                      <h3 className="text-sm font-semibold text-slate-700">
                        {type === "airship" ? "비공정에서 자주 함께한 길드원" : "점령전에서 자주 함께한 길드원"}
                      </h3>
                      {participants.length > 0 ? (
                        <ol className="mt-2 space-y-2">
                          {participants.map((participant) => (
                            <li className="flex items-center justify-between gap-3 text-sm" key={participant.id}>
                              <span className="min-w-0 truncate text-slate-700">{participant.nickname}</span>
                              <strong className="shrink-0 text-[var(--brand-strong)]">{participant.count}회</strong>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="mt-2 text-sm text-slate-500">기록 없음</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  최근 활동
                </h2>
              </div>
              <Link
                className="w-fit rounded-md border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
                href={`/viewer?month=${currentMonth}`}
              >
                이번 달 전체 보기
              </Link>
            </div>

            <div
              aria-label="최근 활동 종류"
              className="flex w-full gap-1 overflow-x-auto rounded-md bg-sky-50 p-1 sm:w-fit"
              role="group"
            >
              {(Object.entries(recentActivityFilterLabels) as [RecentActivityFilter, string][]).map(
                ([value, label]) => (
                  <button
                    aria-pressed={recentActivityFilter === value}
                    className={`ui-focus-ring min-h-10 shrink-0 rounded-md px-3 text-sm font-medium transition ${
                      recentActivityFilter === value
                        ? "bg-white text-[var(--brand-strong)] shadow-sm"
                        : "text-slate-600 hover:bg-white/70"
                    }`}
                    key={value}
                    onClick={() => setRecentActivityFilter(value)}
                    type="button"
                  >
                    {label}
                  </button>
                ),
              )}
            </div>

            {visibleRecentActivities.length === 0 ? (
              <p className="rounded-md border border-dashed border-sky-200 bg-white px-5 py-10 text-center text-sm text-slate-500">
                선택한 종류의 활동 기록이 없습니다.
              </p>
            ) : (
              recentActivityFilter === "airship" ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {(["아우로라", "오션헤븐"] as const).map((track) => {
                    const trackActivities = visibleRecentActivities.filter(
                      (activity) => activity.label === track,
                    );
                    return (
                      <section className="rounded-md bg-sky-50/70 p-3" key={track}>
                        <h3 className="px-1 pb-3 text-sm font-semibold text-slate-700">{track}</h3>
                        {trackActivities.length > 0 ? (
                          <ul className="grid gap-3">
                            {trackActivities.map((activity) => (
                              <ActivityCard
                                activity={activity}
                                key={activity.id}
                                onSelect={(selected) => {
                                  restoreMostActivityFocusRef.current = false;
                                  setSelectedActivity(selected);
                                }}
                                showTitle={false}
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
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleRecentActivities.map((activity) => (
                    <ActivityCard
                      activity={activity}
                      key={activity.id}
                      onSelect={(selected) => {
                        restoreMostActivityFocusRef.current = false;
                        setSelectedActivity(selected);
                      }}
                    />
                  ))}
                </ul>
              )
            )}
          </section>

          {selectedSummaryModal === "activeMembers" ? (
            <DashboardSummaryModal
              disableEscapeClose={Boolean(selectedActivity)}
              onClose={() => setSelectedSummaryModal(null)}
              title={`현재 길드원 ${dashboard.activeMemberCount}명`}
            >
              <MemberList
                emptyMessage="현재 활동중인 길드원이 없습니다."
                members={dashboard.activeMembers}
                showLeftAt={false}
              />
            </DashboardSummaryModal>
          ) : null}

          {selectedSummaryModal === "currentMonthActivities" ? (
            <DashboardSummaryModal
              disableEscapeClose={Boolean(selectedActivity)}
              onClose={() => setSelectedSummaryModal(null)}
              title={`${getMonthLabel(new Date().toISOString().slice(0, 7))} 전체 활동`}
            >
              <ActivitySummaryList
                activities={dashboard.currentMonthActivities}
                emptyMessage="이번 달에 기록된 활동이 아직 없습니다."
                onSelectActivity={(activity) => {
                  setSelectedActivity(activity);
                }}
              />
            </DashboardSummaryModal>
          ) : null}

          {selectedSummaryModal === "currentMonthParticipants" ? (
            <DashboardSummaryModal
              disableEscapeClose={Boolean(selectedActivity)}
              description="이번 달 활동에 한 번 이상 함께한 길드원입니다."
              onClose={() => setSelectedSummaryModal(null)}
              title="함께한 길드원"
            >
              <ParticipantChipList
                emptyMessage="이번 달에 함께한 길드원이 아직 없습니다."
                members={dashboard.currentMonthParticipantMembers}
                onSelectMember={(member) => {
                  setSelectedMonthMemberId(member.id);
                  setMemberReturnModal("currentMonthParticipants");
                  setSelectedSummaryModal("memberMonthActivities");
                }}
              />
            </DashboardSummaryModal>
          ) : null}

          {selectedSummaryModal === "memberMonthActivities" && selectedMonthMember ? (
            <DashboardSummaryModal
              disableEscapeClose={Boolean(selectedActivity)}
              onClose={() => {
                setSelectedMonthMemberId(null);
                setSelectedSummaryModal(memberReturnModal);
                requestAnimationFrame(() => {
                  const label = `${selectedMonthMember.nickname} 활동 기록 보기`;
                  const trigger = Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
                    .find((button) => button.getAttribute("aria-label") === label);
                  trigger?.focus();
                });
              }}
              title={`${selectedMonthMember.nickname}님의 활동 기록`}
            >
              <Link
                className="ui-focus-ring mb-4 inline-flex min-h-11 items-center rounded-md border border-sky-200 bg-white px-3 py-2 text-sm font-semibold text-[var(--brand-strong)] transition hover:border-sky-300 hover:bg-sky-50"
                href={`/members/${encodeURIComponent(selectedMonthMember.id)}`}
              >
                개인 기록 보기
              </Link>
              <MemberActivityPanel
                initialData={selectedMemberInitialData}
                memberId={selectedMonthMember.id}
              />
            </DashboardSummaryModal>
          ) : null}

          {selectedSummaryModal === "allActivities" ? (
            <DashboardSummaryModal
              disableEscapeClose={Boolean(selectedActivity)}
              description="지금까지 기록된 활동 내역입니다."
              onClose={() => setSelectedSummaryModal(null)}
              title="전체 활동"
            >
              <ActivitySummaryList
                activities={dashboard.allActivities}
                emptyMessage="아직 기록된 활동이 없습니다."
                onSelectActivity={(activity) => {
                  setSelectedActivity(activity);
                }}
              />
            </DashboardSummaryModal>
          ) : null}

          {selectedSummaryModal === "allMembers" ? (
            <DashboardSummaryModal
              disableEscapeClose={Boolean(selectedActivity)}
              description="지금까지 냥춘에 함께했던 길드원 목록입니다."
              onClose={() => setSelectedSummaryModal(null)}
              title="함께한 길드원"
            >
              <MemberList
                emptyMessage="아직 함께한 길드원 기록이 없습니다."
                members={dashboard.allMembers}
              />
            </DashboardSummaryModal>
          ) : null}

          <ActivityDetailModal
            activity={selectedActivity}
            onClose={() => {
              setSelectedActivity(null);
              if (restoreMostActivityFocusRef.current) {
                restoreMostActivityFocusRef.current = false;
                requestAnimationFrame(() => mostActivityTriggerRef.current?.focus());
              }
            }}
          />
        </>
      ) : null}
    </main>
  );
}
