import type { ActivityLog } from "@/src/types";
import { getActivityStatsType } from "@/src/lib/activityStats";

export type MonthlyArchiveEventSummary = {
  id: string;
  date: string;
  title: string;
};

export type MonthlyArchiveSummary = {
  month: string;
  activityCount: number;
  eventCount: number;
  participantMemberCount: number;
  totalParticipationCount: number;
  representativeEvents: MonthlyArchiveEventSummary[];
};

function getMonthKey(date: string) {
  return /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : "";
}

export function getMonthDisplayLabel(month: string) {
  const [year, monthNumber] = month.split("-");

  return year && monthNumber ? `${year}년 ${Number(monthNumber)}월` : month;
}

export function getMonthlyArchiveSummaries(
  activities: ActivityLog[],
): MonthlyArchiveSummary[] {
  const summariesByMonth = new Map<
    string,
    Omit<MonthlyArchiveSummary, "representativeEvents"> & {
      participantMemberIds: Set<string>;
      representativeEvents: MonthlyArchiveEventSummary[];
    }
  >();

  activities.forEach((activity) => {
    const month = getMonthKey(activity.date);

    if (!month) {
      return;
    }

    const summary = summariesByMonth.get(month) ?? {
      month,
      activityCount: 0,
      eventCount: 0,
      participantMemberCount: 0,
      totalParticipationCount: 0,
      participantMemberIds: new Set<string>(),
      representativeEvents: [],
    };

    summary.activityCount += 1;
    summary.totalParticipationCount += activity.participantIds.length;

    activity.participantIds.forEach((memberId) => {
      summary.participantMemberIds.add(memberId);
    });

    if (getActivityStatsType(activity.type) === "other") {
      summary.eventCount += 1;

      const title = activity.title?.trim();

      if (title) {
        summary.representativeEvents.push({
          id: activity.id,
          date: activity.date,
          title,
        });
      }
    }

    summariesByMonth.set(month, summary);
  });

  return Array.from(summariesByMonth.values())
    .map((summary) => ({
      month: summary.month,
      activityCount: summary.activityCount,
      eventCount: summary.eventCount,
      participantMemberCount: summary.participantMemberIds.size,
      totalParticipationCount: summary.totalParticipationCount,
      representativeEvents: summary.representativeEvents
        .sort((a, b) => {
          const dateOrder = b.date.localeCompare(a.date);
          return dateOrder === 0 ? b.id.localeCompare(a.id) : dateOrder;
        })
        .slice(0, 2),
    }))
    .sort((a, b) => b.month.localeCompare(a.month));
}
