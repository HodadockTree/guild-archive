"use client";

import Link from "next/link";
import { useState } from "react";
import { ActivityDetailModal, type ActivityDetail } from "@/src/components/ActivityDetailModal";
import { AppHeader } from "@/src/components/ui/AppHeader";
import { Badge } from "@/src/components/ui/Badge";
import { Surface } from "@/src/components/ui/Surface";
import { formatDateRange, formatFullDate, formatMonth } from "@/src/lib/displayFormat";
import {
  memberProfileActivityTypeLabels,
  type MemberProfileActivityType,
  type MemberProfileData,
} from "@/src/lib/memberProfile";

type ActivityFilter = "all" | MemberProfileActivityType;

function displayDate(date: string | null) {
  return date ? formatFullDate(date) : "-";
}

export function MemberProfilePage({ profile }: { profile: MemberProfileData }) {
  const [selectedActivity, setSelectedActivity] = useState<ActivityDetail | null>(null);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [expandedActivityMonths, setExpandedActivityMonths] = useState<Set<string>>(
    () =>
      new Set(
        profile.activities[0]?.date
          ? [profile.activities[0].date.slice(0, 7)]
          : [],
      ),
  );
  const { member, summary } = profile;
  const mostFrequentLabel = summary.mostFrequentTypes.length
    ? summary.mostFrequentTypes
        .map((type) => memberProfileActivityTypeLabels[type])
        .join(", ")
    : "-";
  const maxMonthlyCount = Math.max(
    1,
    ...profile.monthlyParticipation.map((item) => item.count),
  );
  const activityFilterItems = [
    { type: "all" as const, label: "전체", count: summary.totalActivityCount },
    ...profile.typeCounts,
  ];
  const filteredActivities =
    activityFilter === "all"
      ? profile.activities
      : profile.activities.filter((activity) => activity.type === activityFilter);
  const emptyFilterLabel =
    activityFilter === "all"
      ? null
      : memberProfileActivityTypeLabels[activityFilter];
  const activityGroups = Array.from(
    filteredActivities.reduce((groups, activity) => {
      const month = activity.date.slice(0, 7);
      groups.set(month, [...(groups.get(month) ?? []), activity]);
      return groups;
    }, new Map<string, typeof profile.activities>()),
    ([month, activities]) => ({ month, activities }),
  ).sort((first, second) => second.month.localeCompare(first.month));

  const toggleActivityMonth = (month: string) => {
    setExpandedActivityMonths((current) => {
      const next = new Set(current);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  };

  const selectActivityFilter = (filter: ActivityFilter) => {
    const nextActivities =
      filter === "all"
        ? profile.activities
        : profile.activities.filter((activity) => activity.type === filter);

    setActivityFilter(filter);
    setExpandedActivityMonths(
      new Set(nextActivities[0]?.date ? [nextActivities[0].date.slice(0, 7)] : []),
    );
  };

  const focusActivityMonth = (month: string) => {
    const activity = document.querySelector<HTMLButtonElement>(
      `[data-activity-month="${month}"]`,
    );

    activity?.scrollIntoView({ behavior: "smooth", block: "center" });
    activity?.focus({ preventScroll: true });
  };

  return (
    <main className="app-shell">
      <AppHeader
        currentPath="/members"
        eyebrow="길드원 개인 활동 기록"
        title={`${member.nickname}님의 기록`}
      />

      <div className="space-y-3">
        <Link
          aria-label="길드원 목록으로 돌아가기"
          className="ui-focus-ring inline-flex size-11 items-center justify-center rounded-[var(--radius-control)] text-xl text-[var(--color-text-accent)] transition-colors hover:bg-[var(--color-bg-interactive)]"
          href="/"
        >
          <span aria-hidden="true">←</span>
        </Link>

        <Surface className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={member.status === "active" ? "status" : "neutral"}>
              {member.status === "active" ? "활동 중" : "탈퇴"}
            </Badge>
            <p className="ui-supporting-text">
              가입일 {displayDate(member.joinedAt || null)}
              {member.leftAt ? ` · 탈퇴일 ${displayDate(member.leftAt)}` : ""}
            </p>
          </div>

          <section aria-labelledby="member-summary-title" className="mt-5 border-t border-[var(--color-border-subtle)] pt-5">
            <h2 className="ui-section-title" id="member-summary-title">함께한 기록 요약</h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 lg:grid-cols-5">
              <div className="col-span-2 lg:col-span-1">
                <dt className="ui-caption">총 참여 활동</dt>
                <dd className="ui-metric-section mt-1">{summary.totalActivityCount}회</dd>
              </div>
              <div>
                <dt className="ui-caption">함께한 기간</dt>
                <dd className="ui-metric-inline mt-1">{summary.togetherDayCount ? `${summary.togetherDayCount}일${member.status === "active" ? "째" : "간"}` : "-"}</dd>
              </div>
              <div>
                <dt className="ui-caption">처음 참여</dt>
                <dd className="ui-body-text mt-1 font-semibold text-[var(--color-text-primary)]">{displayDate(summary.firstActivityDate)}</dd>
              </div>
              <div>
                <dt className="ui-caption">최근 참여</dt>
                <dd className="ui-body-text mt-1 font-semibold text-[var(--color-text-primary)]">{displayDate(summary.recentActivityDate)}</dd>
              </div>
              <div>
                <dt className="ui-caption">가장 많이 함께한 활동</dt>
                <dd className="ui-body-text mt-1 font-semibold text-[var(--color-text-primary)]">{mostFrequentLabel}</dd>
              </div>
            </dl>
          </section>
        </Surface>
      </div>

      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <Surface className="p-5">
            <h2 className="ui-section-title">활동 종류별 기록</h2>
            <ul className="mt-4 grid grid-cols-2 gap-2">
              {activityFilterItems.map((item) => {
                const isSelected = activityFilter === item.type;

                return (
                  <li key={item.type}>
                    <button
                      aria-label={`${item.label} 활동 ${item.count}회 보기`}
                      aria-pressed={isSelected}
                      className={`ui-focus-ring flex min-h-14 w-full items-center justify-between gap-2 rounded-[var(--radius-control)] border px-3 py-2 text-left transition-colors ${
                        isSelected
                          ? "border-[var(--color-border-interactive)] bg-[var(--color-bg-interactive)]"
                          : "border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] hover:border-[var(--color-border-interactive)] hover:bg-[var(--color-bg-interactive)]"
                      }`}
                      onClick={() => selectActivityFilter(item.type)}
                      type="button"
                    >
                      <span className={`ui-body-text ${isSelected ? "font-semibold text-[var(--color-text-accent)]" : "font-medium"}`}>{item.label}</span>
                      <span className="ui-metric-inline shrink-0">{item.count}회</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Surface>

          <Surface className="p-5">
            <h2 className="ui-section-title">월별 참여 기록</h2>
            {profile.monthlyParticipation.length ? (
              <ul className="mt-4 max-h-72 divide-y divide-[var(--color-border-subtle)] overflow-y-auto rounded-[var(--radius-card)] bg-[var(--color-bg-muted)] px-2">
                {profile.monthlyParticipation.map((item) => (
                  <li key={item.month}>
                    <button
                      aria-label={`${formatMonth(item.month)} 개인 활동 기록으로 이동`}
                      className="ui-focus-ring grid min-h-11 w-full cursor-pointer grid-cols-[minmax(4.75rem,auto)_minmax(4rem,1fr)_auto] items-center gap-3 rounded-[var(--radius-control)] px-2 text-left transition-colors hover:bg-[var(--color-bg-interactive)]"
                      onClick={() => focusActivityMonth(item.month)}
                      type="button"
                    >
                      <span className="text-sm font-medium text-[var(--color-text-accent)] underline decoration-[var(--color-border-interactive)] underline-offset-4">{formatMonth(item.month)}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-[var(--color-bg-surface)]">
                        <span className="block h-full rounded-full bg-[var(--color-brand-primary)]" style={{ width: `${(item.count / maxMonthlyCount) * 100}%` }} />
                      </span>
                      <span className="ui-caption text-right text-[var(--color-text-secondary)]">{item.count}회</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ui-empty-state mt-4 px-4 py-5">표시할 가입 기간 정보가 없습니다.</p>
            )}
          </Surface>
        </div>

        <section aria-labelledby="activity-list-title">
          <h2 className="ui-section-title" id="activity-list-title">개인 활동 기록</h2>
          {filteredActivities.length ? (
            <div className="mt-3 divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)]">
              {activityGroups.map(({ month, activities }) => {
                const isExpanded = expandedActivityMonths.has(month);
                const groupId = `member-activities-${month}`;

                return (
                  <section className="py-2" key={month}>
                    <button
                      aria-controls={groupId}
                      aria-expanded={isExpanded}
                      className="ui-focus-ring flex min-h-11 w-full items-center justify-between gap-3 rounded-[var(--radius-control)] px-2 text-left transition-colors hover:bg-[var(--color-bg-interactive)]"
                      data-activity-month={month}
                      onClick={() => toggleActivityMonth(month)}
                      type="button"
                    >
                      <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {formatMonth(month)} · {activities.length}회
                      </span>
                      <span aria-hidden className="shrink-0 text-sm text-[var(--color-text-accent)]">
                        {isExpanded ? "▴" : "▾"}
                      </span>
                    </button>

                    {isExpanded ? (
                      <ul className="mt-2 space-y-2" id={groupId}>
                        {activities.map((activity) => (
                          <li key={activity.id}>
                            <button className="ui-focus-ring block min-h-11 w-full cursor-pointer rounded-[var(--radius-card)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-4 py-3 text-left transition-colors hover:border-[var(--color-border-interactive)] hover:bg-[var(--color-bg-interactive)]" onClick={() => setSelectedActivity(activity)} type="button">
                              <span className="ui-caption block">{formatDateRange(activity.date, activity.endDate)}</span>
                              <span className="ui-card-title mt-1 block break-words">{activity.title}</span>
                              <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                                <Badge tone="neutral">{activity.label}</Badge>
                                <span className="ui-caption">함께한 길드원 {activity.participantCount}명</span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </section>
                );
              })}
            </div>
          ) : profile.activities.length ? (
            <p className="ui-empty-state mt-3 px-5 py-10">
              참여한 {emptyFilterLabel} 기록이 없습니다.
            </p>
          ) : (
            <p className="ui-empty-state mt-3 px-5 py-10">아직 함께한 활동 기록이 없습니다.</p>
          )}
        </section>
      </div>

      <ActivityDetailModal activity={selectedActivity} onClose={() => setSelectedActivity(null)} />
    </main>
  );
}
