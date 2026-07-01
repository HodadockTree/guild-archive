import type { ActivityLog, ActivityType, AirshipType } from "@/src/types";

export type ActivityStatsType = "airship" | "siege" | "other";

export type MemberActivityStats = {
  total: number;
  siege: number;
  airship: number;
  airshipOcean: number;
  airshipAurora: number;
  other: number;
};

const EMPTY_MEMBER_ACTIVITY_STATS: MemberActivityStats = {
  total: 0,
  siege: 0,
  airship: 0,
  airshipOcean: 0,
  airshipAurora: 0,
  other: 0,
};

export function getActivityStatsType(type: ActivityType | string): ActivityStatsType {
  if (type === "siege" || type === "airship") {
    return type;
  }

  return "other";
}

export function getKnownAirshipType(
  airshipType: AirshipType | string | undefined,
): AirshipType | undefined {
  if (airshipType === "ocean" || airshipType === "aurora") {
    return airshipType;
  }

  return undefined;
}

export function getMemberActivityStats(
  activities: ActivityLog[],
  memberId: string,
): MemberActivityStats {
  return activities.reduce<MemberActivityStats>((stats, activity) => {
    if (!activity.participantIds.includes(memberId)) {
      return stats;
    }

    const activityStatsType = getActivityStatsType(activity.type);

    stats.total += 1;

    if (activityStatsType === "siege") {
      stats.siege += 1;
      return stats;
    }

    if (activityStatsType === "airship") {
      stats.airship += 1;

      const airshipType = getKnownAirshipType(activity.airshipType);

      if (airshipType === "ocean") {
        stats.airshipOcean += 1;
      }

      if (airshipType === "aurora") {
        stats.airshipAurora += 1;
      }

      return stats;
    }

    stats.other += 1;
    return stats;
  }, { ...EMPTY_MEMBER_ACTIVITY_STATS });
}

export function getMemberRecentActivities(
  activities: ActivityLog[],
  memberId: string,
  limit = 5,
) {
  return activities
    .filter((activity) => activity.participantIds.includes(memberId))
    .sort((a, b) => {
      const dateOrder = b.date.localeCompare(a.date);
      return dateOrder === 0 ? b.id.localeCompare(a.id) : dateOrder;
    })
    .slice(0, limit);
}
