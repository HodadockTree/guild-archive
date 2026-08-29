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
import { MemberActivityPanel } from "@/src/components/MemberActivityPanel";
import { AirshipParticipationChart } from "@/src/components/AirshipParticipationChart";
import { Surface } from "@/src/components/ui/Surface";
import {
  GameButton,
  GameIcon,
  GamePanel,
  GamePanelHeader,
  GameStat,
  GameTab,
  GameWindowHeader,
} from "@/src/components/ui/GameUI";
import {
  formatDateRange,
  formatFullDate,
  formatMonth,
  formatMonthDay,
} from "@/src/lib/displayFormat";
import {
  GUILD_STARTED_AT,
  type UpcomingAnniversary,
} from "@/src/lib/anniversaries";

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

function getAnniversaryMilestoneLabel(anniversary: UpcomingAnniversary) {
  return anniversary.milestoneKind === "years"
    ? `${anniversary.milestone}주년`
    : `${anniversary.milestone}일`;
}

function getAnniversaryRecordLabel(anniversary: UpcomingAnniversary) {
  const milestone = getAnniversaryMilestoneLabel(anniversary);

  return anniversary.nickname
    ? `${anniversary.nickname}님 · 함께한 지 ${milestone}`
    : `냥춘 · 함께한 지 ${milestone}`;
}

function getGuildAgeDays(today: Date) {
  const todayDate = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const [startedYear, startedMonth, startedDay] = GUILD_STARTED_AT
    .split("-")
    .map(Number);
  const startedDate = Date.UTC(startedYear, startedMonth - 1, startedDay);
  const elapsedDays = Math.floor((todayDate - startedDate) / 86_400_000) + 1;

  return elapsedDays > 0 ? elapsedDays : null;
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
      <p className="ui-empty-state px-4 py-8">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="hidden overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-default)] sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-bg-muted)] text-xs font-semibold text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3">닉네임</th>
              <th className="px-4 py-3">가입일</th>
              {showLeftAt ? <th className="px-4 py-3">탈퇴일</th> : null}
              <th className="px-4 py-3">함께한 기간</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
            {members.map((member) => (
              <tr key={member.id}>
                <td className="px-4 py-3 font-semibold text-[var(--color-text-primary)]">
                  <Link aria-label={`${member.nickname} 개인 기록 페이지 보기`} className="ui-focus-ring inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-2 py-1 transition-colors hover:bg-[var(--color-bg-interactive)]" href={`/members/${encodeURIComponent(member.id)}`}>
                    {member.nickname}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                  {member.joinedAt ? formatFullDate(member.joinedAt) : "-"}
                </td>
                {showLeftAt ? (
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {member.leftAt ? formatFullDate(member.leftAt) : "-"}
                  </td>
                ) : null}
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">
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
          className="rounded-[var(--radius-card)] border border-[var(--color-border-default)] bg-[var(--color-bg-muted)] px-4 py-3"
          key={member.id}
        >
          <Link aria-label={`${member.nickname} 개인 기록 페이지 보기`} className="ui-focus-ring inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-2 py-1 font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-interactive)]" href={`/members/${encodeURIComponent(member.id)}`}>
            {member.nickname}
          </Link>
          <p className="ui-body-text mt-1">
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
      <p className="ui-empty-state px-4 py-8">
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
            className="ui-focus-ring min-h-11 max-w-full cursor-pointer rounded-[var(--radius-control)] border border-[var(--color-border-interactive)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm font-medium text-[var(--color-text-accent)] transition-colors hover:border-[var(--color-border-selected)] hover:bg-[var(--color-bg-interactive)]"
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
      <p className="ui-empty-state px-4 py-8">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {activities.map((activity) => (
        <li key={activity.id}>
          <button
            className="ui-focus-ring w-full cursor-pointer rounded-[var(--radius-card)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-4 py-3 text-left transition-colors hover:border-[var(--color-border-interactive)] hover:bg-[var(--color-bg-interactive)]"
            onClick={() => onSelectActivity(activity)}
            type="button"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="ui-caption">
                  {formatDateRange(activity.date, activity.endDate)}
                </p>
                <h3 className="ui-card-title mt-1">
                  {activity.title}
                </h3>
                {activity.label.startsWith("점령전 (") ? (
                  <p className="ui-body-text mt-1">{activity.label}</p>
                ) : null}
              </div>
              <span className="ui-caption w-fit shrink-0">
                참여 {activity.participantCount}명
              </span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ActivityCard({
  activity,
  className = "",
  onSelect,
  showTitle = true,
}: {
  activity: DashboardActivitySummary;
  className?: string;
  onSelect: (activity: ActivityDetail) => void;
  showTitle?: boolean;
}) {
  const isSiege = activity.statsType === "siege";
  const siegeRound = activity.title.match(/^(\d+회차)(?:\s|$)/)?.[1];
  const siegeTypes = activity.label
    .match(/^점령전 \((.+)\)$/)?.[1]
    ?.split(",")
    .map((label) => label.trim())
    .join(" · ");
  const activityIcon = isSiege
    ? "siege"
    : activity.statsType === "airship"
      ? "airship"
      : "event";

  return (
    <li className={`game-list-row game-list-row-${activity.statsType} ${className}`}>
      <button
      className="game-activity-row ui-focus-ring grid w-full cursor-pointer grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 text-left transition"
        onClick={() => onSelect(activity)}
        type="button"
      >
      <span className="game-activity-icon" aria-hidden="true">
        <GameIcon name={activityIcon} />
      </span>
      <span className="min-w-0">
          <span className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="ui-caption">
              {activity.endDate
                ? formatDateRange(activity.date, activity.endDate)
                : getDisplayDate(activity.date)}
            </span>
            {isSiege && siegeRound ? (
              <>
                <span aria-hidden="true" className="text-xs text-[var(--color-border-default)]">·</span>
                <strong className="ui-caption text-[var(--color-text-secondary)]">{siegeRound}</strong>
              </>
            ) : null}
          </span>

        {isSiege ? (
          <span className="ui-card-title mt-0.5 block truncate">
            {siegeTypes || "점령전 종류 미기록"}
          </span>
        ) : (
          <span className="ui-card-title mt-0.5 block truncate">
            {showTitle ? activity.title : activity.label}
          </span>
        )}
        {activity.memo ? (
          <span className="ui-body-text mt-0.5 block line-clamp-1 whitespace-pre-wrap">
            {activity.memo}
          </span>
        ) : null}
      </span>
      <span className="game-activity-count shrink-0 whitespace-nowrap">
        {activity.participantCount}명
      </span>
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
  const filteredRecentActivities =
    dashboard?.allActivities.filter((activity) =>
      recentActivityFilter === "all"
        ? true
        : activity.statsType === recentActivityFilter,
    ) ?? [];
  const visibleRecentActivities = (() => {
    if (recentActivityFilter !== "airship") {
      return filteredRecentActivities.slice(0, 6);
    }

    const auroraActivities = filteredRecentActivities.filter(
      (activity) => activity.label === "아우로라",
    );
    const oceanActivities = filteredRecentActivities.filter(
      (activity) => activity.label === "오션헤븐",
    );
    const trackCount = Math.min(6, auroraActivities.length, oceanActivities.length);

    return [
      ...auroraActivities.slice(0, trackCount),
      ...oceanActivities.slice(0, trackCount),
    ];
  })();

  return (
    <main className="app-shell home-game-ui">
      <div className="game-client-window">
      <GameWindowHeader />
      <div className="game-client-content">

      {dashboardState.status === "loading" ? (
        <Surface className="py-10 text-center" variant="section">
          <h2 className="ui-section-title">
            대시보드 데이터를 불러오는 중입니다.
          </h2>
        </Surface>
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
          <section aria-label="길드 핵심 수치">
            <dl className="game-stat-panel">
              <GameStat
                icon="member"
                label="현재 길드원 수"
                tone="green"
                value={`${dashboard.activeMemberCount}명`}
                onClick={() => setSelectedSummaryModal("activeMembers")}
              />
              <GameStat
                icon="activity"
                label="이번 달 활동"
                tone="yellow"
                value={`${dashboard.currentMonthActivityCount}회`}
                onClick={() => setSelectedSummaryModal("currentMonthActivities")}
              />
              <GameStat
                icon="participants"
                label="이번 달 참여 인원"
                tone="cyan"
                value={`${dashboard.currentMonthParticipantMemberCount}명`}
                onClick={() => {
                  setSelectedMonthMemberId(null);
                  setSelectedSummaryModal("currentMonthParticipants");
                }}
              />
              <GameStat
                description={guildAgeDays ? `길드 운영 ${guildAgeDays}일째` : undefined}
                icon="special"
                label="길드 시작일"
                tone="pink"
                value="2026년 1월 22일"
              />
              <GameStat
                icon="report"
                label="전체 활동"
                tone="purple"
                onClick={() => setSelectedSummaryModal("allActivities")}
                value={`${dashboard.totalActivityCount}회`}
              />
              <GameStat
                icon="participants"
                label="함께했던 길드원"
                tone="gray"
                onClick={() => setSelectedSummaryModal("allMembers")}
                value={`${dashboard.totalMemberCount}명`}
              />
            </dl>
          </section>

          <GamePanel>
            <GamePanelHeader icon="activity" title="이번 달 활동 요약" variant="strip" />
            <div className="game-panel-body">
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 rounded-[var(--radius-card)] bg-[var(--color-bg-muted)] p-4 sm:grid-cols-4">
                <div className="flex min-h-14 flex-col justify-center">
                  <dt className="ui-caption">비공정</dt>
                  <dd className="ui-metric-inline mt-1">{currentMonthTypeCounts?.airship ?? 0}회</dd>
                </div>
                <div className="flex min-h-14 flex-col justify-center">
                  <dt className="ui-caption">점령전</dt>
                  <dd className="ui-metric-inline mt-1">{currentMonthTypeCounts?.siege ?? 0}회</dd>
                </div>
                <div className="flex min-h-14 flex-col justify-center">
                  <dt className="ui-caption">참여 합계</dt>
                  <dd className="ui-metric-section mt-1 whitespace-nowrap">
                    {currentMonthTotalParticipation}회
                  </dd>
                </div>
                <div className="flex min-h-14 flex-col justify-center">
                  <dt className="ui-caption">활동당 평균</dt>
                  <dd className="ui-metric-section mt-1 whitespace-nowrap">
                    {currentMonthAverageParticipation
                      ? `${currentMonthAverageParticipation}명`
                      : "0명"}
                  </dd>
                </div>
                <div className="col-span-2 min-w-0 border-t border-[var(--color-border-subtle)] pt-3 sm:col-span-4">
                  <dt className="ui-caption">최다 참여 활동</dt>
                  <dd className="mt-1 min-w-0">
                    {currentMonthMostParticipated ? (
                      <button
                        aria-label={`${currentMonthMostParticipated.title} 활동 상세 보기`}
                        className="ui-focus-ring mt-1 flex w-full min-w-0 cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-2 text-left transition hover:bg-[var(--color-bg-selected)]"
                        onClick={() => {
                          restoreMostActivityFocusRef.current = true;
                          setSelectedActivity(currentMonthMostParticipated);
                        }}
                        ref={mostActivityTriggerRef}
                        type="button"
                      >
                        <span className="min-w-0">
                          <span className="ui-caption block">
                            {currentMonthMostParticipated.endDate
                              ? formatDateRange(
                                  currentMonthMostParticipated.date,
                                  currentMonthMostParticipated.endDate,
                                )
                              : getDisplayDate(currentMonthMostParticipated.date)}
                          </span>
                          <span className="ui-card-title mt-0.5 block break-words">
                            {currentMonthMostParticipated.title}
                          </span>
                        </span>
                        <span className="ui-caption shrink-0 whitespace-nowrap text-[var(--color-text-secondary)]">
                          참여 {currentMonthMostParticipated.participantCount}명
                        </span>
                      </button>
                    ) : (
                      <span className="ui-metric-inline">기록 없음</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </GamePanel>

          {dashboard.upcomingAnniversaries.length > 0 ? (
            <GamePanel>
              <GamePanelHeader icon="special" title="다가오는 기록" variant="strip" />
              <div className="game-panel-body">
              <ul className="game-row-list game-row-list-pink">
                {dashboard.upcomingAnniversaries.map((anniversary) => (
                  <li key={anniversary.id}>
                    {anniversary.memberId ? (
                      <Link
                        className="ui-focus-ring game-record-row grid min-h-10 w-full grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-2 px-3 py-1.5 transition"
                        href={`/members/${encodeURIComponent(anniversary.memberId)}`}
                      >
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {formatMonthDay(anniversary.date)}
                        </span>
                        <span className="min-w-0 break-words text-sm font-semibold leading-5 text-[var(--color-text-primary)]">
                          {getAnniversaryRecordLabel(anniversary)}
                        </span>
                        <span className="whitespace-nowrap text-xs text-[var(--color-text-muted)]">
                          {anniversary.daysUntil === 0 ? "오늘" : `${anniversary.daysUntil}일 뒤`}
                        </span>
                      </Link>
                    ) : (
                      <p className="game-record-row grid min-h-10 grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-2 px-3 py-1.5">
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {formatMonthDay(anniversary.date)}
                        </span>
                        <span className="min-w-0 break-words text-sm font-semibold leading-5 text-[var(--color-text-primary)]">
                          {getAnniversaryRecordLabel(anniversary)}
                        </span>
                        <span className="whitespace-nowrap text-xs text-[var(--color-text-muted)]">
                          {anniversary.daysUntil === 0 ? "오늘" : `${anniversary.daysUntil}일 뒤`}
                        </span>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              </div>
            </GamePanel>
          ) : null}

          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(20rem,1fr)]">
            <AirshipParticipationChart activities={dashboard.currentMonthActivities} />
            <GamePanel className="min-w-0">
              <GamePanelHeader description="길마를 제외한 활동별 참여 기록입니다." title="이번 달 자주 함께한 길드원" variant="tab" />
              <div className="game-panel-body">
              <div className="game-participant-lists mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {(["airship", "siege"] as const).map((type) => {
                  const participants = dashboard.currentMonthTopParticipants[type];
                  return (
                    <div className="game-sublist" key={type}>
                      <h3 className="game-sublist-title">
                        <GameIcon name={type === "airship" ? "airship" : "siege"} />
                        {type === "airship" ? "비공정" : "점령전"}
                      </h3>
                      {participants.length > 0 ? (
                        <ol className="divide-y divide-[#b8ddf2]">
                          {participants.map((participant) => (
                            <li className="game-compact-row flex items-center justify-between gap-3 text-sm" key={participant.id}>
                              <span className="min-w-0 truncate text-[var(--color-text-secondary)]">{participant.nickname}</span>
                              <strong className="shrink-0 text-[var(--color-text-primary)]">{participant.count}회</strong>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="px-4 py-3 text-sm text-[var(--color-text-muted)]">기록 없음</p>
                      )}
                    </div>
                  );
                })}
              </div>
              </div>
            </GamePanel>
          </div>

          <GamePanel>
            <GamePanelHeader
              action={<GameButton href={`/viewer?month=${currentMonth}`}>이번 달 전체 보기</GameButton>}
              icon="activity"
              title="최근 활동"
            />
            <div className="game-panel-body space-y-4">
            <div
              aria-label="최근 활동 종류"
              className="game-tabs w-full sm:w-fit"
              role="group"
            >
              {(Object.entries(recentActivityFilterLabels) as [RecentActivityFilter, string][]).map(
                ([value, label]) => (
                  <GameTab
                    active={recentActivityFilter === value}
                    aria-pressed={recentActivityFilter === value}
                    key={value}
                    onClick={() => setRecentActivityFilter(value)}
                    type="button"
                  >
                    {label}
                  </GameTab>
                ),
              )}
            </div>

            {visibleRecentActivities.length === 0 ? (
              <p className="ui-empty-state ui-empty-state-surface py-10">
                선택한 종류의 활동 기록이 없습니다.
              </p>
            ) : (
              recentActivityFilter === "airship" ? (
                <div className="grid gap-2 lg:grid-cols-2">
                  {(["아우로라", "오션헤븐"] as const).map((track) => {
                    const trackActivities = visibleRecentActivities.filter(
                      (activity) => activity.label === track,
                    );
                    return (
                      <section className="game-sublist" key={track}>
                        <h3 className="game-sublist-title"><GameIcon name="airship" />{track}</h3>
                        {trackActivities.length > 0 ? (
                          <ul className="game-row-list">
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
                          <p className="ui-empty-state ui-empty-state-surface py-6">기록 없음</p>
                        )}
                      </section>
                    );
                  })}
                </div>
              ) : (
                <ul className="game-row-list">
                  {visibleRecentActivities.map((activity, index) => (
                    <ActivityCard
                      activity={activity}
                      className={index === 0 ? "game-list-row-featured" : ""}
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
            </div>
          </GamePanel>

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
                className="ui-focus-ring mb-4 inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm font-semibold text-[var(--color-text-accent)] transition-colors hover:border-[var(--color-border-interactive)] hover:bg-[var(--color-bg-interactive)]"
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
      </div>
      </div>
    </main>
  );
}
