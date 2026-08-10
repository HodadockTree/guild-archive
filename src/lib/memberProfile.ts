import type { ActivityLog, GuildMember } from "@/src/types";
import { getActivityStatsType } from "@/src/lib/activityStats";
import { toMemberActivityRecord, type MemberActivityRecord } from "@/src/lib/memberActivity";

export type MemberProfileActivityType = "airship" | "siege" | "other";

export type MemberProfileData = {
  member: Pick<GuildMember, "id" | "nickname" | "status" | "joinedAt" | "leftAt">;
  summary: {
    totalActivityCount: number;
    togetherDayCount: number | null;
    togetherEndDate: string | null;
    firstActivityDate: string | null;
    recentActivityDate: string | null;
    mostFrequentTypes: MemberProfileActivityType[];
  };
  typeCounts: Array<{
    type: MemberProfileActivityType;
    label: string;
    count: number;
  }>;
  monthlyParticipation: Array<{ month: string; count: number }>;
  activities: MemberActivityRecord[];
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-\d{2}$/;

export const memberProfileActivityTypeLabels: Record<
  MemberProfileActivityType,
  string
> = {
  airship: "비공정",
  siege: "점령전",
  other: "이벤트",
};

function getInclusiveDayCount(start: string, end: string) {
  if (!DATE_PATTERN.test(start) || !DATE_PATTERN.test(end)) return null;

  const startTime = Date.parse(`${start}T00:00:00Z`);
  const endTime = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) {
    return null;
  }

  return Math.floor((endTime - startTime) / 86_400_000) + 1;
}

function getMonthRange(start: string, end: string) {
  const startMonth = DATE_PATTERN.test(start) ? start.slice(0, 7) : "";
  const endMonth = DATE_PATTERN.test(end) ? end.slice(0, 7) : "";
  if (!MONTH_PATTERN.test(startMonth) || !MONTH_PATTERN.test(endMonth) || startMonth > endMonth) {
    return [];
  }

  const [startYear, startMonthNumber] = startMonth.split("-").map(Number);
  const [endYear, endMonthNumber] = endMonth.split("-").map(Number);
  const months: string[] = [];

  for (
    let cursor = new Date(Date.UTC(startYear, startMonthNumber - 1, 1));
    cursor <= new Date(Date.UTC(endYear, endMonthNumber - 1, 1));
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
  ) {
    months.push(
      `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`,
    );
  }

  return months;
}

export function getMemberProfile(
  activities: ActivityLog[],
  members: GuildMember[],
  memberId: string,
  referenceDate: string,
): MemberProfileData | null {
  const member = members.find((candidate) => candidate.id === memberId);
  if (!member) return null;

  const memberActivities = activities
    .filter((activity) => activity.participantIds.includes(memberId))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const validActivityDates = memberActivities
    .map((activity) => activity.date)
    .filter((date) => DATE_PATTERN.test(date))
    .sort();
  const togetherEndDate = DATE_PATTERN.test(member.leftAt ?? "")
    ? member.leftAt
    : DATE_PATTERN.test(referenceDate)
      ? referenceDate
      : null;
  const typeCounts = new Map<MemberProfileActivityType, number>([
    ["airship", 0],
    ["siege", 0],
    ["other", 0],
  ]);
  const monthCounts = new Map<string, number>();

  memberActivities.forEach((activity) => {
    const type = getActivityStatsType(activity.type);
    typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
    const month = activity.date.slice(0, 7);
    if (MONTH_PATTERN.test(month)) monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
  });

  const maxTypeCount = Math.max(...typeCounts.values());
  const membersById = new Map(members.map((candidate) => [candidate.id, candidate]));

  return {
    member: {
      id: member.id,
      nickname: member.nickname,
      status: member.status,
      joinedAt: member.joinedAt,
      leftAt: member.leftAt,
    },
    summary: {
      totalActivityCount: memberActivities.length,
      togetherDayCount: togetherEndDate
        ? getInclusiveDayCount(member.joinedAt, togetherEndDate)
        : null,
      togetherEndDate,
      firstActivityDate: validActivityDates[0] ?? null,
      recentActivityDate: validActivityDates.at(-1) ?? null,
      mostFrequentTypes:
        maxTypeCount > 0
          ? [...typeCounts.entries()]
              .filter(([, count]) => count === maxTypeCount)
              .map(([type]) => type)
          : [],
    },
    typeCounts: [...typeCounts.entries()].map(([type, count]) => ({
      type,
      label: memberProfileActivityTypeLabels[type],
      count,
    })),
    monthlyParticipation: togetherEndDate
      ? getMonthRange(member.joinedAt, togetherEndDate).map((month) => ({
          month,
          count: monthCounts.get(month) ?? 0,
        }))
      : [],
    activities: memberActivities.map((activity) =>
      toMemberActivityRecord(activity, membersById),
    ),
  };
}
