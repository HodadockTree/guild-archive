import type { ActivityLog, GuildMember } from "@/src/types";
import { getActivityStatsType } from "@/src/lib/activityStats";
import { getCountedActivityParticipantIds } from "@/src/lib/activityParticipants";

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
  participantMembers?: MonthlyArchiveParticipant[];
};

export type MonthlyArchiveParticipant = {
  id: string;
  nickname: string;
  participationCount: number;
  status: GuildMember["status"];
};

export function getMonthlyArchiveParticipants(
  activities: ActivityLog[],
  members: GuildMember[],
  month: string,
): MonthlyArchiveParticipant[] {
  const counts = new Map<string, number>();
  const membersById = new Map(members.map((member) => [member.id, member]));

  activities
    .filter((activity) => getMonthKey(activity.date) === month)
    .forEach((activity) => {
      new Set(
        getCountedActivityParticipantIds(activity.participantIds, membersById),
      ).forEach((memberId) => {
        counts.set(memberId, (counts.get(memberId) ?? 0) + 1);
      });
    });

  return Array.from(counts, ([id, participationCount]) => ({
    id,
    nickname: membersById.get(id)?.nickname ?? `알 수 없는 길드원 ${id.slice(0, 6)}`,
    participationCount,
    status: membersById.get(id)?.status ?? "left",
  })).sort((a, b) => {
    const countOrder = b.participationCount - a.participationCount;
    return countOrder || a.nickname.localeCompare(b.nickname, "ko");
  });
}

function getMonthKey(date: string) {
  return /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : "";
}

export function getMonthDisplayLabel(month: string) {
  const [year, monthNumber] = month.split("-");

  return year && monthNumber ? `${year}년 ${Number(monthNumber)}월` : month;
}

export function getMonthlyArchiveSummaries(
  activities: ActivityLog[],
  members: GuildMember[],
): MonthlyArchiveSummary[] {
  const membersById = new Map(members.map((member) => [member.id, member]));
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
    const participantIds = getCountedActivityParticipantIds(
      activity.participantIds,
      membersById,
    );
    summary.totalParticipationCount += participantIds.length;

    participantIds.forEach((memberId) => {
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
