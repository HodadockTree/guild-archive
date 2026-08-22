import type { MonthlyReport } from "@/src/lib/monthlyReport";
import { getMonthlyActivityLabel } from "@/src/lib/activityLabels";
import { getActivityStatsType } from "@/src/lib/activityStats";

type MonthlyActivity = MonthlyReport["activities"][number];
type CalendarActivity = {
  activity: MonthlyActivity;
  isRangeStart: boolean;
  isRangeEnd: boolean;
};

const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

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
    <section className="rounded-md border border-sky-100 bg-white p-5 shadow-sm shadow-sky-100/50">
      <h2 className="text-lg font-semibold text-slate-900">활동 달력</h2>
      <p className="mt-1 text-sm text-slate-500">날짜별 활동을 선택하면 참여 기록을 자세히 볼 수 있습니다.</p>
      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[44rem]">
          <div className="grid grid-cols-7 border-b border-sky-100 text-center text-xs font-semibold text-slate-500">
            {weekdayLabels.map((label, index) => (
              <div className={`py-2 ${index === 0 ? "text-rose-500" : index === 6 ? "text-sky-600" : ""}`} key={label}>{label}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 overflow-hidden rounded-b-md border-l border-sky-100">
            {cells.map((day, index) => {
              const dayActivities = day ? activitiesByDay.get(day) ?? [] : [];
              return (
                <div
                  className={`min-h-28 border-b border-r border-sky-100 p-2 ${day ? "bg-white" : "bg-slate-50/70"}`}
                  key={`${day ?? "empty"}-${index}`}
                >
                  {day ? (
                    <>
                      <span className={`text-xs font-semibold ${index % 7 === 0 ? "text-rose-500" : index % 7 === 6 ? "text-sky-600" : "text-slate-600"}`}>{day}</span>
                      <ul className="mt-1.5 space-y-1">
                        {dayActivities.map(({ activity, isRangeStart, isRangeEnd }) => {
                          const connectsLeft = !isRangeStart && index % 7 !== 0;
                          const connectsRight = !isRangeEnd && index % 7 !== 6;
                          const showsLabel = !connectsLeft;

                          return (
                            <li className={`${connectsLeft ? "-ml-2" : ""} ${connectsRight ? "-mr-2" : ""}`} key={activity.id}>
                              <button
                                aria-label={`${getCalendarActivityLabel(activity)} · ${activity.participantIds.length}명`}
                                className={`ui-focus-ring flex min-h-6 w-full items-center justify-between gap-1 px-1.5 py-1 text-left text-[11px] transition ${getCalendarActivityColors(activity)} ${connectsLeft ? "rounded-l-none" : "rounded-l"} ${connectsRight ? "rounded-r-none" : "rounded-r"}`}
                                onClick={() => onSelectActivity(activity)}
                                type="button"
                              >
                                {showsLabel ? (
                                  <>
                                    <span className="min-w-0 truncate font-medium">{getCalendarActivityLabel(activity)}</span>
                                    <span className="shrink-0 text-[10px] opacity-70">{activity.participantIds.length}명</span>
                                  </>
                                ) : null}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
