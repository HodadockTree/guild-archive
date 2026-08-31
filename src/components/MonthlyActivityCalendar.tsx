"use client";

import type { MonthlyReport } from "@/src/lib/monthlyReport";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getMonthlyActivityLabel } from "@/src/lib/activityLabels";
import { getActivityStatsType } from "@/src/lib/activityStats";
import { Surface } from "@/src/components/ui/Surface";
import { formatDateRange } from "@/src/lib/displayFormat";

type MonthlyActivity = MonthlyReport["activities"][number];
type CalendarActivity = {
  activity: MonthlyActivity;
  isRangeStart: boolean;
  isRangeEnd: boolean;
};

const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];
const maxVisibleActivitiesPerDay = 3;

function getCalendarActivityLabel(activity: MonthlyActivity) {
  const statsType = getActivityStatsType(activity.type);

  if (statsType === "siege") {
    return activity.title?.trim().match(/^(\d+회차)(?:\s|$)/)?.[1] ?? "점령전";
  }

  if (statsType === "airship") {
    return getMonthlyActivityLabel(activity);
  }

  return activity.title?.trim() || "이벤트";
}

function getCalendarActivityColors(activity: MonthlyActivity) {
  const statsType = getActivityStatsType(activity.type);

  if (statsType === "siege") return "bg-amber-100 text-amber-900 hover:bg-amber-200";
  if (statsType === "airship") {
    return getMonthlyActivityLabel(activity) === "아우로라"
      ? "bg-violet-100 text-violet-900 hover:bg-violet-200"
      : "bg-cyan-100 text-cyan-900 hover:bg-cyan-200";
  }
  return "bg-rose-100 text-rose-900 hover:bg-rose-200";
}

function getAnniversaryLabel(
  anniversary: MonthlyReport["anniversaries"][number],
) {
  const milestone = anniversary.milestoneKind === "years"
    ? `${anniversary.milestone}주년`
    : `${anniversary.milestone}일`;

  return anniversary.nickname
    ? `${anniversary.nickname} · 함께한 지 ${milestone}`
    : `냥춘 · ${milestone}`;
}

function DayRecordsDialog({
  activities,
  anniversaries,
  dateLabel,
  onClose,
  onSelectActivity,
}: {
  activities: CalendarActivity[];
  anniversaries: MonthlyReport["anniversaries"];
  dateLabel: string;
  onClose: () => void;
  onSelectActivity: (activity: MonthlyActivity) => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const restoreFocusRef = useRef(true);
  const itemCount = activities.length + anniversaries.length;

  useEffect(() => {
    openerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    closeButtonRef.current?.focus();

    return () => {
      if (restoreFocusRef.current) openerRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const dialog = document.getElementById("calendar-day-records-content");
      const focusableElements = dialog?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div
      aria-labelledby="calendar-day-records-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 px-4 py-4 sm:items-center"
      onClick={onClose}
      role="dialog"
    >
      <Surface
        as="div"
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div id="calendar-day-records-content">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-5 py-4">
            <h2
              className="text-lg font-bold text-[var(--color-text-primary)]"
              id="calendar-day-records-title"
            >
              {dateLabel} 기록 · {itemCount}건
            </h2>
            <button
              aria-label="날짜별 기록 닫기"
              className="ui-focus-ring inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-interactive)]"
              onClick={onClose}
              ref={closeButtonRef}
              type="button"
            >
              닫기
            </button>
          </div>
          <ul className="space-y-2 px-5 py-4">
            {activities.map(({ activity }) => (
              <li key={activity.id}>
                <button
                  className={`ui-focus-ring flex min-h-11 w-full items-center justify-between gap-3 rounded-[var(--radius-control)] px-3 py-2 text-left text-sm transition ${getCalendarActivityColors(activity)}`}
                  onClick={() => {
                    restoreFocusRef.current = false;
                    onClose();
                    onSelectActivity(activity);
                  }}
                  type="button"
                >
                  <span className="min-w-0">
                    <strong className="block break-words">{getCalendarActivityLabel(activity)}</strong>
                    <span className="mt-0.5 block text-xs opacity-70">
                      {formatDateRange(activity.date, activity.endDate)}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs opacity-70">
                    참여 {activity.participantIds.length}명
                  </span>
                </button>
              </li>
            ))}
            {anniversaries.map((anniversary) => (
              <li key={anniversary.id}>
                {anniversary.memberId ? (
                  <Link
                    className="ui-focus-ring flex min-h-11 w-full items-center rounded-[var(--radius-control)] border border-dashed border-[var(--color-border-default)] bg-[var(--color-bg-muted)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-interactive)]"
                    href={`/members/${encodeURIComponent(anniversary.memberId)}`}
                  >
                    <span className="break-words">{getAnniversaryLabel(anniversary)}</span>
                  </Link>
                ) : (
                  <span className="flex min-h-11 w-full items-center rounded-[var(--radius-control)] border border-dashed border-[var(--color-border-default)] bg-[var(--color-bg-muted)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)]">
                    {getAnniversaryLabel(anniversary)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Surface>
    </div>
  );
}

export function MonthlyActivityCalendar({
  activities,
  anniversaries,
  month,
  onSelectActivity,
}: {
  activities: MonthlyActivity[];
  anniversaries: MonthlyReport["anniversaries"];
  month: string;
  onSelectActivity: (activity: MonthlyActivity) => void;
}) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [year, monthNumber] = month.split("-").map(Number);

  if (!year || !monthNumber) return null;

  const firstWeekday = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const dayCount = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const activitiesByDay = new Map<number, CalendarActivity[]>();
  const anniversariesByDay = new Map<number, MonthlyReport["anniversaries"]>();
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(dayCount).padStart(2, "0")}`;

  activities.forEach((activity) => {
    const visibleStart = activity.date < monthStart ? monthStart : activity.date;
    const activityEnd = activity.endDate ?? activity.date;
    const visibleEnd = activityEnd > monthEnd ? monthEnd : activityEnd;
    if (visibleStart > visibleEnd) return;

    const startDay = Number(visibleStart.slice(8, 10));
    const endDay = Number(visibleEnd.slice(8, 10));
    for (let day = startDay; day <= endDay; day += 1) {
      activitiesByDay.set(day, [
        ...(activitiesByDay.get(day) ?? []),
        { activity, isRangeStart: day === startDay, isRangeEnd: day === endDay },
      ]);
    }
  });

  anniversaries.forEach((anniversary) => {
    if (!anniversary.date.startsWith(`${month}-`)) return;

    const day = Number(anniversary.date.slice(8, 10));
    anniversariesByDay.set(day, [
      ...(anniversariesByDay.get(day) ?? []),
      anniversary,
    ]);
  });

  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: dayCount }, (_, index) => index + 1),
  ];

  while (cells.length % 7 !== 0) cells.push(null);

  const selectedDayActivities = selectedDay
    ? activitiesByDay.get(selectedDay) ?? []
    : [];
  const selectedDayAnniversaries = selectedDay
    ? anniversariesByDay.get(selectedDay) ?? []
    : [];

  return (
    <>
    <Surface variant="section">
      <h2 className="ui-section-title">활동 달력</h2>
      <p className="ui-supporting-text mt-1">날짜별 활동과 기념일을 함께 살펴볼 수 있습니다.</p>
      <div className="mt-4 min-w-0 overflow-hidden">
        <div className="w-full min-w-0">
          <div className="grid grid-cols-7 border-b border-[var(--color-border-subtle)] text-center text-xs font-semibold text-[var(--color-text-muted)]">
            {weekdayLabels.map((label, index) => (
              <div className={`py-2 ${index === 0 ? "text-rose-500" : index === 6 ? "text-sky-600" : ""}`} key={label}>{label}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 overflow-hidden rounded-b-md border-l border-[var(--color-border-subtle)]">
            {cells.map((day, index) => {
              const dayActivities = day ? activitiesByDay.get(day) ?? [] : [];
              const dayAnniversaries = day ? anniversariesByDay.get(day) ?? [] : [];
              const visibleActivities = dayActivities.slice(0, maxVisibleActivitiesPerDay);
              const remainingSlots = maxVisibleActivitiesPerDay - visibleActivities.length;
              const visibleAnniversaries = dayAnniversaries.slice(0, remainingSlots);
              const hiddenItemCount =
                dayActivities.length + dayAnniversaries.length -
                visibleActivities.length - visibleAnniversaries.length;
              return (
                <div
                  className={`min-h-24 min-w-0 overflow-hidden border-b border-r border-[var(--color-border-subtle)] p-1 sm:min-h-28 sm:p-2 ${day ? "bg-[var(--color-bg-surface)]" : "bg-[var(--color-bg-interactive)]"}`}
                  key={`${day ?? "empty"}-${index}`}
                >
                  {day ? (
                    <>
                      <span className={`text-xs font-semibold ${index % 7 === 0 ? "text-rose-500" : index % 7 === 6 ? "text-sky-600" : "text-[var(--color-text-secondary)]"}`}>{day}</span>
                      <ul className="mt-1.5 space-y-1">
                        {visibleActivities.map(({ activity, isRangeStart, isRangeEnd }) => {
                          const connectsLeft = !isRangeStart && index % 7 !== 0;
                          const connectsRight = !isRangeEnd && index % 7 !== 6;
                          const showsLabel = isRangeStart;

                          return (
                            <li className={`min-w-0 ${connectsLeft ? "-ml-1 sm:-ml-2" : ""} ${connectsRight ? "-mr-1 sm:-mr-2" : ""} ${showsLabel ? "relative z-10" : ""}`} key={activity.id}>
                              <button
                                aria-label={`${getCalendarActivityLabel(activity)} · ${activity.participantIds.length}명`}
                                className={`ui-focus-ring flex min-h-6 w-full min-w-0 items-center overflow-hidden px-1 py-1 text-left text-[10px] transition sm:px-1.5 sm:text-[11px] ${getCalendarActivityColors(activity)} ${connectsLeft ? "rounded-l-none" : "rounded-l"} ${connectsRight ? "rounded-r-none" : "rounded-r"}`}
                                onClick={() => onSelectActivity(activity)}
                                type="button"
                              >
                                {showsLabel ? (
                                  <span className="pointer-events-none flex min-w-0 w-full items-center gap-1 overflow-hidden font-medium">
                                    <span className="min-w-0 truncate">{getCalendarActivityLabel(activity)}</span>
                                    <span className="hidden shrink-0 text-[10px] font-normal opacity-70 sm:inline">{activity.participantIds.length}명</span>
                                  </span>
                                ) : null}
                              </button>
                            </li>
                          );
                        })}
                        {visibleAnniversaries.map((anniversary) => {
                          const milestone = anniversary.milestoneKind === "years"
                            ? `${anniversary.milestone}주년`
                            : `${anniversary.milestone}일`;
                          const label = anniversary.nickname
                            ? `${anniversary.nickname} ${milestone}`
                            : `냥춘 ${milestone}`;

                          return (
                            <li className="min-w-0" key={anniversary.id}>
                              {anniversary.memberId ? (
                                <Link
                                  aria-label={`${label} · 개인 기록 페이지 보기`}
                                  className="ui-focus-ring flex min-h-6 w-full min-w-0 items-center overflow-hidden rounded border border-dashed border-[var(--color-border-default)] bg-[var(--color-bg-muted)] px-1 py-1 text-left text-[10px] text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg-interactive)] sm:px-1.5 sm:text-[11px]"
                                  href={`/members/${encodeURIComponent(anniversary.memberId)}`}
                                >
                                  <span className="truncate">{label}</span>
                                </Link>
                              ) : (
                                <span className="flex min-h-6 w-full min-w-0 items-center overflow-hidden rounded border border-dashed border-[var(--color-border-default)] bg-[var(--color-bg-muted)] px-1 py-1 text-[10px] text-[var(--color-text-muted)] sm:px-1.5 sm:text-[11px]">
                                  <span className="truncate">{label}</span>
                                </span>
                              )}
                            </li>
                          );
                        })}
                        {hiddenItemCount > 0 ? (
                          <li className="relative min-w-0">
                            <button
                              aria-label={`${month.slice(5)}월 ${day}일 기록 전체 보기 · ${dayActivities.length + dayAnniversaries.length}건`}
                              className="ui-focus-ring relative flex min-h-6 w-full items-center rounded px-1 text-left text-[10px] font-semibold text-[var(--color-text-muted)] transition before:absolute before:-inset-y-2 before:inset-x-0 hover:bg-[var(--color-bg-interactive)] sm:text-[11px]"
                              onClick={() => setSelectedDay(day)}
                              title={`${day}일 일정 ${hiddenItemCount}개 더 있음`}
                              type="button"
                            >
                              +{hiddenItemCount}
                            </button>
                          </li>
                        ) : null}
                      </ul>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Surface>
    {selectedDay ? (
      <DayRecordsDialog
        activities={selectedDayActivities}
        anniversaries={selectedDayAnniversaries}
        dateLabel={`${month.slice(5)}/${String(selectedDay).padStart(2, "0")}`}
        onClose={() => setSelectedDay(null)}
        onSelectActivity={onSelectActivity}
      />
    ) : null}
    </>
  );
}
