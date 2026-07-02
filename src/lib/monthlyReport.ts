import type { ActivityLog, GuildMember } from "@/src/types";
import { getActivityStatsType, getKnownAirshipType } from "@/src/lib/activityStats";
import { getMonthlyActivityLabel } from "@/src/lib/activityLabels";

export type MonthlyActivitySummary = {
  id: string;
  date: string;
  displayDate: string;
  label: string;
  participantCount: number;
  isMostParticipated: boolean;
};

export type MonthlyTopParticipant = {
  memberId: string;
  nickname: string;
  count: number;
};

export type MonthlyReport = {
  month: string;
  activities: ActivityLog[];
  totalActivities: number;
  siegeCount: number;
  airshipCount: number;
  otherCount: number;
  oceanAirshipCount: number;
  auroraAirshipCount: number;
  totalParticipationCount: number;
  participantMemberCount: number;
  participationCountsByMemberId: Record<string, number>;
  topParticipantLimit: number;
  topParticipants: MonthlyTopParticipant[];
  activitySummaries: MonthlyActivitySummary[];
};

function getMonthKey(date: string) {
  return /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : "";
}

function getDisplayDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(5).replace("-", "/") : date;
}

function getShareDisplayDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(5).replace("-", ".") : date;
}

function getMonthNumberLabel(month: string) {
  const [, monthNumber] = month.split("-");
  return monthNumber ? String(Number(monthNumber)) : month;
}

function getUnknownMemberName(memberId: string) {
  const shortId = memberId.trim().slice(0, 6);
  return shortId ? `알 수 없는 길드원 ${shortId}` : "알 수 없는 길드원";
}

export function getAvailableActivityMonths(activities: ActivityLog[]) {
  return Array.from(
    new Set(
      activities
        .map((activity) => getMonthKey(activity.date))
        .filter((month): month is string => Boolean(month)),
    ),
  ).sort((a, b) => b.localeCompare(a));
}

export function getDefaultReportMonth(activities: ActivityLog[], fallbackDate: string) {
  return getAvailableActivityMonths(activities)[0] ?? getMonthKey(fallbackDate);
}

export function getMonthlyReport(
  activities: ActivityLog[],
  members: GuildMember[],
  month: string,
): MonthlyReport {
  const membersById = new Map(members.map((member) => [member.id, member]));
  const monthlyActivities = activities
    .filter((activity) => getMonthKey(activity.date) === month)
    .sort((a, b) => {
      const dateOrder = a.date.localeCompare(b.date);
      return dateOrder === 0 ? a.id.localeCompare(b.id) : dateOrder;
    });
  const participationCountsByMemberId: Record<string, number> = {};
  const participantMemberIds = new Set<string>();

  const report = monthlyActivities.reduce(
    (summary, activity) => {
      const statsType = getActivityStatsType(activity.type);

      summary.totalActivities += 1;
      summary.totalParticipationCount += activity.participantIds.length;

      if (statsType === "siege") {
        summary.siegeCount += 1;
      } else if (statsType === "airship") {
        summary.airshipCount += 1;

        const airshipType = getKnownAirshipType(activity.airshipType);

        if (airshipType === "ocean") {
          summary.oceanAirshipCount += 1;
        }

        if (airshipType === "aurora") {
          summary.auroraAirshipCount += 1;
        }
      } else {
        summary.otherCount += 1;
      }

      activity.participantIds.forEach((memberId) => {
        participantMemberIds.add(memberId);
        participationCountsByMemberId[memberId] =
          (participationCountsByMemberId[memberId] ?? 0) + 1;
      });

      return summary;
    },
    {
      totalActivities: 0,
      siegeCount: 0,
      airshipCount: 0,
      otherCount: 0,
      oceanAirshipCount: 0,
      auroraAirshipCount: 0,
      totalParticipationCount: 0,
    },
  );

  const topParticipantLimit = Math.min(
    monthlyActivities.length,
    participantMemberIds.size,
    15,
  );
  const maxActivityParticipantCount = monthlyActivities.reduce(
    (maxCount, activity) => Math.max(maxCount, activity.participantIds.length),
    0,
  );
  const topParticipants = Object.entries(participationCountsByMemberId)
    .map(([memberId, count]) => ({
      memberId,
      nickname: membersById.get(memberId)?.nickname ?? getUnknownMemberName(memberId),
      count,
    }))
    .sort((a, b) => {
      const countOrder = b.count - a.count;
      return countOrder === 0 ? a.nickname.localeCompare(b.nickname, "ko") : countOrder;
    })
    .slice(0, topParticipantLimit);

  return {
    month,
    activities: monthlyActivities,
    ...report,
    participantMemberCount: participantMemberIds.size,
    participationCountsByMemberId,
    topParticipantLimit,
    topParticipants,
    activitySummaries: monthlyActivities.map((activity) => ({
      id: activity.id,
      date: activity.date,
      displayDate: getDisplayDate(activity.date),
      label: getMonthlyActivityLabel(activity),
      participantCount: activity.participantIds.length,
      isMostParticipated:
        maxActivityParticipantCount > 0 &&
        activity.participantIds.length === maxActivityParticipantCount,
    })),
  };
}

export function getMonthlyShareText(report: MonthlyReport): string {
  const monthNumber = getMonthNumberLabel(report.month);
  const lines: string[] = [];

  lines.push(`[냥춘 ${monthNumber}월 활동 정산]`);
  lines.push("");
  lines.push(`${monthNumber}월 활동 기록을 정리했어요.`);
  lines.push("");
  lines.push(`- 전체 활동: ${report.totalActivities}회`);
  lines.push(`- 총 참여 횟수: ${report.totalParticipationCount}회`);
  lines.push(`- 참여 길드원: ${report.participantMemberCount}명`);
  lines.push("");
  lines.push("활동별 기록");
  lines.push(`- 비공정: ${report.airshipCount}회`);
  lines.push(`- 점령전: ${report.siegeCount}회`);
  lines.push(`- 이벤트: ${report.otherCount}회`);
  lines.push("");
  lines.push("참여 TOP");

  if (report.topParticipants.length === 0) {
    lines.push("참여 기록이 없습니다.");
  } else {
    report.topParticipants.forEach((participant, index) => {
      lines.push(`${index + 1}. ${participant.nickname} ${participant.count}회`);
    });
  }

  lines.push("");
  lines.push("이번 달 이벤트");

  const eventActivities = report.activities.filter(
    (activity) => getActivityStatsType(activity.type) === "other",
  );

  if (eventActivities.length === 0) {
    lines.push("기록된 이벤트가 없습니다.");
  } else {
    eventActivities.forEach((activity) => {
      const title = activity.title?.trim() || "이벤트";
      lines.push(`- ${getShareDisplayDate(activity.date)} ${title}`);
    });
  }

  return lines.join("\n");
}
