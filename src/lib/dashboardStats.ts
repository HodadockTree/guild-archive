import type { ActivityLog, GuildMember } from "@/src/types";
import { getActivityStatsType } from "@/src/lib/activityStats";
import { getMonthlyActivityLabel } from "@/src/lib/activityLabels";
import type { ActivityParticipant } from "@/src/lib/memberActivity";

export type DashboardMonthlyTrend = {
  month: string;
  activityCount: number;
  participantMemberCount: number;
};

export type DashboardActivitySummary = {
  id: string;
  date: string;
  label: string;
  statsType: "airship" | "siege" | "other";
  participantIds: string[];
  title: string;
  participantCount: number;
  participantNames: string[];
  participants: ActivityParticipant[];
  memo?: string;
  imageUrl?: string;
  imageDataUrl?: string;
};

export type DashboardMemberSummary = {
  id: string;
  joinedAt: string;
  leftAt: string | null;
  nickname: string;
  status: GuildMember["status"];
};

export type DashboardStats = {
  activeMemberCount: number;
  currentMonthActivityCount: number;
  currentMonthParticipantMemberCount: number;
  totalActivityCount: number;
  totalMemberCount: number;
  activeMembers: DashboardMemberSummary[];
  allMembers: DashboardMemberSummary[];
  allActivities: DashboardActivitySummary[];
  currentMonthActivities: DashboardActivitySummary[];
  currentMonthParticipantMembers: DashboardMemberSummary[];
  recentActivity: DashboardActivitySummary | null;
  recentActivities: DashboardActivitySummary[];
  monthlyTrends: DashboardMonthlyTrend[];
};

function getMonthKey(date: string) {
  return /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : "";
}

function getPreviousMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 - offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getActivityTitle(activity: ActivityLog) {
  return activity.title?.trim() || getMonthlyActivityLabel(activity);
}

function getUnknownMemberName(memberId: string) {
  const shortId = memberId.trim().slice(0, 6);
  return shortId ? `알 수 없는 길드원 ${shortId}` : "알 수 없는 길드원";
}

function compareMembersByJoinedAt(
  firstMember: DashboardMemberSummary,
  secondMember: DashboardMemberSummary,
) {
  const firstJoinedAt = firstMember.joinedAt || "9999-99-99";
  const secondJoinedAt = secondMember.joinedAt || "9999-99-99";
  const joinedAtOrder = firstJoinedAt.localeCompare(secondJoinedAt);

  return joinedAtOrder === 0
    ? firstMember.nickname.localeCompare(secondMember.nickname, "ko")
    : joinedAtOrder;
}

function toActivitySummary(
  activity: ActivityLog,
  membersById: Map<string, GuildMember>,
): DashboardActivitySummary {
  return {
    id: activity.id,
    date: activity.date,
    label: getMonthlyActivityLabel(activity),
    statsType: getActivityStatsType(activity.type),
    title: getActivityTitle(activity),
    participantIds: activity.participantIds,
    participantCount: activity.participantIds.length,
    participantNames: activity.participantIds
      .map(
        (memberId) =>
          membersById.get(memberId)?.nickname ?? getUnknownMemberName(memberId),
      )
      .sort((a, b) => a.localeCompare(b, "ko")),
    participants: activity.participantIds.map((memberId) => ({
      id: memberId,
      nickname:
        membersById.get(memberId)?.nickname ?? getUnknownMemberName(memberId),
    })),
    memo: activity.memo?.trim() || undefined,
    imageUrl: activity.imageUrl,
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
  const activeMembers = members
    .filter((member) => member.status === "active")
    .map((member) => ({
      id: member.id,
      joinedAt: member.joinedAt,
      leftAt: member.leftAt,
      nickname: member.nickname,
      status: member.status,
    }))
    .sort(compareMembersByJoinedAt);
  const allMembers = members.map((member) => ({
    id: member.id,
    joinedAt: member.joinedAt,
    leftAt: member.leftAt,
    nickname: member.nickname,
    status: member.status,
  })).sort(compareMembersByJoinedAt);
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

  const guildStartMonth = [
    ...members.map((member) => getMonthKey(member.joinedAt)),
    ...activities.map((activity) => getMonthKey(activity.date)),
  ]
    .filter(Boolean)
    .sort()[0];
  const trendMonths = Array.from({ length: monthLimit }, (_, index) =>
    getPreviousMonth(currentMonth, monthLimit - index - 1),
  ).filter((month) => !guildStartMonth || month >= guildStartMonth);
  const monthlyTrends = trendMonths.map((month) => {
    const summary = monthlySummaries.get(month);

    return {
      month,
      activityCount: summary?.activityCount ?? 0,
      participantMemberCount: summary?.participantMemberIds.size ?? 0,
    };
  });

  return {
    activeMemberCount,
    currentMonthActivityCount: currentMonthActivities.length,
    currentMonthParticipantMemberCount: currentMonthParticipantIds.size,
    totalActivityCount: activities.length,
    totalMemberCount: members.length,
    activeMembers,
    allMembers,
    allActivities: sortedActivities.map((activity) =>
      toActivitySummary(activity, membersById),
    ),
    currentMonthActivities: sortedActivities
      .filter((activity) => getMonthKey(activity.date) === currentMonth)
      .map((activity) => toActivitySummary(activity, membersById)),
    currentMonthParticipantMembers: Array.from(currentMonthParticipantIds).map(
      (memberId) => ({
        id: memberId,
        joinedAt: membersById.get(memberId)?.joinedAt ?? "",
        leftAt: membersById.get(memberId)?.leftAt ?? null,
        nickname: membersById.get(memberId)?.nickname ?? getUnknownMemberName(memberId),
        status: membersById.get(memberId)?.status ?? "left",
      }),
    ).sort((a, b) => a.nickname.localeCompare(b.nickname, "ko")),
    recentActivity: sortedActivities[0]
      ? toActivitySummary(sortedActivities[0], membersById)
      : null,
    recentActivities: sortedActivities
      .slice(0, 6)
      .map((activity) => toActivitySummary(activity, membersById)),
    monthlyTrends,
  };
}
