import type { MonthlyReport } from "@/src/lib/monthlyReport";
import { getMonthlyActivityLabel } from "@/src/lib/activityLabels";
import { getActivityStatsType } from "@/src/lib/activityStats";

type MonthlyActivity = MonthlyReport["activities"][number];

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
  const activitiesByDay = new Map<number, MonthlyActivity[]>();

  activities.forEach((activity) => {
    const day = Number(activity.date.slice(8, 10));
    activitiesByDay.set(day, [...(activitiesByDay.get(day) ?? []), activity]);
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
                        {dayActivities.map((activity) => (
                          <li key={activity.id}>
                            <button
                              className="ui-focus-ring flex w-full items-center justify-between gap-1 rounded bg-sky-50 px-1.5 py-1 text-left text-[11px] text-slate-700 transition hover:bg-sky-100"
                              onClick={() => onSelectActivity(activity)}
                              type="button"
                            >
                              <span className="min-w-0 truncate font-medium">{getCalendarActivityLabel(activity)}</span>
                              <span className="shrink-0 text-[10px] text-slate-500">{activity.participantIds.length}명</span>
                            </button>
                          </li>
                        ))}
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
