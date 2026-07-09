import type { ActivityLog, GuildMember } from "@/src/types";
import { getActivityStatsType } from "@/src/lib/activityStats";
import { getMonthlyActivityLabel } from "@/src/lib/activityLabels";

export type DashboardMonthlyTrend = {
  month: string;
  activityCount: number;
  participantMemberCount: number;
};

export type DashboardActivitySummary = {
  id: string;
  date: string;
  label: string;
  title: string;
  participantCount: number;
  participantNames: string[];
  memo?: string;
  imageDataUrl?: string;
};

export type DashboardStats = {
  activeMemberCount: number;
  currentMonthActivityCount: number;
  currentMonthParticipantMemberCount: number;
  totalActivityCount: number;
  totalParticipantMemberCount: number;
  recordPeriodLabel: string;
  recentActivity: DashboardActivitySummary | null;
  recentActivities: DashboardActivitySummary[];
  monthlyTrends: DashboardMonthlyTrend[];
};

function getMonthKey(date: string) {
  return /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : "";
}

function getActivityTitle(activity: ActivityLog) {
  return activity.title?.trim() || getMonthlyActivityLabel(activity);
}

function getUnknownMemberName(memberId: string) {
  const shortId = memberId.trim().slice(0, 6);
  return shortId ? `알 수 없는 길드원 ${shortId}` : "알 수 없는 길드원";
}

function getRecordPeriodLabel(activities: ActivityLog[]) {
  if (activities.length === 0) {
    return "아직 기록 없음";
  }

  return "2026.01부터 기록 중";
}

function toActivitySummary(
  activity: ActivityLog,
  membersById: Map<string, GuildMember>,
): DashboardActivitySummary {
  return {
    id: activity.id,
    date: activity.date,
    label: getMonthlyActivityLabel(activity),
    title: getActivityTitle(activity),
    participantCount: activity.participantIds.length,
    participantNames: activity.participantIds.map(
      (memberId) => membersById.get(memberId)?.nickname ?? getUnknownMemberName(memberId),
    ),
    memo: activity.memo?.trim() || undefined,
    imageDataUrl: activity.imageDataUrl,
  };
}

export function getMonthlyActivityTypeCounts(activities: ActivityLog[]) {
  return activities.reduce(
    (counts, activity) => {
      const statsType = getActivityStatsType(activity.type);

      counts[statsType] += 1;
      return counts;
    },
    {
      airship: 0,
      siege: 0,
      other: 0,
    },
  );
}

export function getGuildDashboardStats(
  activities: ActivityLog[],
  members: GuildMember[],
  referenceDate: string,
  monthLimit = 6,
): DashboardStats {
  const currentMonth = getMonthKey(referenceDate);
  const activeMemberCount = members.filter(
    (member) => member.status === "active",
  ).length;
  const sortedActivities = [...activities].sort((a, b) => {
    const dateOrder = b.date.localeCompare(a.date);
    return dateOrder === 0 ? b.id.localeCompare(a.id) : dateOrder;
  });
  const currentMonthActivities = activities.filter(
    (activity) => getMonthKey(activity.date) === currentMonth,
  );
  const currentMonthParticipantIds = new Set(
    currentMonthActivities.flatMap((activity) => activity.participantIds),
  );
  const totalParticipantIds = new Set(
    activities.flatMap((activity) => activity.participantIds),
  );
  const membersById = new Map(members.map((member) => [member.id, member]));
  const monthlySummaries = new Map<
    string,
    {
      month: string;
      activityCount: number;
      participantMemberIds: Set<string>;
    }
  >();

  activities.forEach((activity) => {
    const month = getMonthKey(activity.date);

    if (!month) {
      return;
    }

    const summary = monthlySummaries.get(month) ?? {
      month,
      activityCount: 0,
      participantMemberIds: new Set<string>(),
    };

    summary.activityCount += 1;
    activity.participantIds.forEach((memberId) => {
      summary.participantMemberIds.add(memberId);
    });
    monthlySummaries.set(month, summary);
  });

  const monthlyTrends = Array.from(monthlySummaries.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-monthLimit)
    .map((summary) => ({
      month: summary.month,
      activityCount: summary.activityCount,
      participantMemberCount: summary.participantMemberIds.size,
    }));

  return {
    activeMemberCount,
    currentMonthActivityCount: currentMonthActivities.length,
    currentMonthParticipantMemberCount: currentMonthParticipantIds.size,
    totalActivityCount: activities.length,
    totalParticipantMemberCount: totalParticipantIds.size,
    recordPeriodLabel: getRecordPeriodLabel(activities),
    recentActivity: sortedActivities[0]
      ? toActivitySummary(sortedActivities[0], membersById)
      : null,
    recentActivities: sortedActivities
      .slice(0, 6)
      .map((activity) => toActivitySummary(activity, membersById)),
    monthlyTrends,
  };
}
