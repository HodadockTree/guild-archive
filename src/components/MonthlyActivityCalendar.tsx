import type { MonthlyReport } from "@/src/lib/monthlyReport";
import { getMonthlyActivityLabel } from "@/src/lib/activityLabels";
import { getActivityStatsType } from "@/src/lib/activityStats";
import { Surface } from "@/src/components/ui/Surface";

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

export function MonthlyActivityCalendar({
  activities,
  month,
  onSelectActivity,
}: {
  activities: MonthlyActivity[];
  month: string;
  onSelectActivity: (activity: MonthlyActivity) => void;
}) {
  const [year, monthNumber] = month.split("-").map(Number);

  if (!year || !monthNumber) return null;

  const firstWeekday = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const dayCount = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const activitiesByDay = new Map<number, CalendarActivity[]>();
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

  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: dayCount }, (_, index) => index + 1),
  ];

  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Surface variant="section">
      <h2 className="ui-section-title">활동 달력</h2>
      <p className="ui-supporting-text mt-1">날짜별 활동을 선택하면 참여 기록을 자세히 볼 수 있습니다.</p>
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
              const visibleActivities = dayActivities.slice(0, maxVisibleActivitiesPerDay);
              const hiddenActivityCount = dayActivities.length - visibleActivities.length;
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
                        {hiddenActivityCount > 0 ? (
                          <li
                            className="px-1 text-[10px] font-semibold text-[var(--color-text-muted)] sm:text-[11px]"
                            title={`${day}일 일정 ${hiddenActivityCount}개 더 있음`}
                          >
                            <span aria-hidden>+{hiddenActivityCount}</span>
                            <span className="sr-only">{day}일에 일정 {hiddenActivityCount}개 더 있음</span>
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
  );
}
