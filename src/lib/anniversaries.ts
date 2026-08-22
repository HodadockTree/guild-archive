import type { GuildMember } from "@/src/types";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

export const GUILD_STARTED_AT = "2026-01-22";

export type AnniversaryMilestone = {
  id: string;
  memberId?: string;
  nickname?: string;
  milestone: number;
  milestoneKind: "days" | "years";
  date: string;
};

export type UpcomingAnniversary = AnniversaryMilestone & {
  daysUntil: number;
};

type AnniversaryTarget = {
  id: string;
  memberId?: string;
  nickname?: string;
  startDate: string;
  leftAt?: string | null;
};

function parseDateToUtc(date: string) {
  const match = DATE_PATTERN.exec(date);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);

  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
    ? timestamp
    : null;
}

function formatUtcDate(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function getNextMilestone(startDate: string, referenceDate: string) {
  const start = parseDateToUtc(startDate);
  const reference = parseDateToUtc(referenceDate);

  if (start === null || reference === null || reference < start) return null;

  const elapsedDays = Math.floor((reference - start) / DAY_MS) + 1;
  const nextHundredDays = Math.max(100, Math.ceil(elapsedDays / 100) * 100);
  const hundredDayDate = start + (nextHundredDays - 1) * DAY_MS;
  const startParts = DATE_PATTERN.exec(startDate);

  if (!startParts) return null;

  const startYear = Number(startParts[1]);
  const startMonth = Number(startParts[2]);
  const startDay = Number(startParts[3]);
  let anniversaryYears = Math.max(1, new Date(reference).getUTCFullYear() - startYear);
  let anniversaryDate = Date.UTC(startYear + anniversaryYears, startMonth - 1, startDay);

  if (anniversaryDate < reference) {
    anniversaryYears += 1;
    anniversaryDate = Date.UTC(startYear + anniversaryYears, startMonth - 1, startDay);
  }

  if (hundredDayDate <= anniversaryDate) {
    return {
      milestone: nextHundredDays,
      milestoneKind: "days" as const,
      timestamp: hundredDayDate,
    };
  }

  return {
    milestone: anniversaryYears,
    milestoneKind: "years" as const,
    timestamp: anniversaryDate,
  };
}

function getAnniversaryTargets(
  members: GuildMember[],
  activeOnly: boolean,
): AnniversaryTarget[] {
  return [
    { id: "guild", startDate: GUILD_STARTED_AT },
    ...members
      .filter((member) => !activeOnly || member.status === "active")
      .map((member) => ({
        id: `member:${member.id}`,
        memberId: member.id,
        nickname: member.nickname,
        startDate: member.joinedAt,
        leftAt: member.leftAt,
      })),
  ];
}

function removeGuildDuplicateMemberAnniversaries<T extends AnniversaryMilestone>(
  anniversaries: T[],
  members: GuildMember[],
) {
  const guildMilestones = new Set(
    anniversaries
      .filter((anniversary) => !anniversary.memberId)
      .map(
        (anniversary) =>
          `${anniversary.milestoneKind}:${anniversary.milestone}`,
      ),
  );
  const membersById = new Map(members.map((member) => [member.id, member]));

  return anniversaries.filter((anniversary) => {
    if (!anniversary.memberId) return true;

    const member = membersById.get(anniversary.memberId);
    return member?.joinedAt !== GUILD_STARTED_AT ||
      !guildMilestones.has(
        `${anniversary.milestoneKind}:${anniversary.milestone}`,
      );
  });
}

export function getUpcomingAnniversaries(
  members: GuildMember[],
  referenceDate: string,
  withinDays = 30,
  limit = 3,
): UpcomingAnniversary[] {
  const reference = parseDateToUtc(referenceDate);

  if (reference === null) return [];

  const candidates = getAnniversaryTargets(members, true).flatMap((target) => {
    const milestone = getNextMilestone(target.startDate, referenceDate);

    if (!milestone) return [];

    const daysUntil = Math.floor((milestone.timestamp - reference) / DAY_MS);

    if (daysUntil < 0 || daysUntil > withinDays) return [];

    return [{
      id: `${target.id}:${milestone.milestoneKind}:${milestone.milestone}`,
      memberId: "memberId" in target ? target.memberId : undefined,
      nickname: "nickname" in target ? target.nickname : undefined,
      milestone: milestone.milestone,
      milestoneKind: milestone.milestoneKind,
      date: formatUtcDate(milestone.timestamp),
      daysUntil,
    }];
  });

  return removeGuildDuplicateMemberAnniversaries(candidates, members)
    .sort((first, second) =>
      first.daysUntil - second.daysUntil ||
      first.date.localeCompare(second.date) ||
      (first.nickname ?? "").localeCompare(second.nickname ?? "", "ko"),
    )
    .slice(0, limit);
}

export function getMonthlyAnniversaries(
  members: GuildMember[],
  month: string,
  throughDate = `${month}-31`,
): AnniversaryMilestone[] {
  const [year, monthNumber] = month.split("-").map(Number);
  const monthStart = parseDateToUtc(`${month}-01`);
  const monthEnd = Date.UTC(year, monthNumber, 0);
  const requestedEnd = parseDateToUtc(throughDate);

  if (
    !/^\d{4}-\d{2}$/.test(month) ||
    monthStart === null ||
    !Number.isFinite(monthEnd)
  ) {
    return [];
  }

  const periodEnd = Math.min(monthEnd, requestedEnd ?? monthEnd);

  const anniversaries = getAnniversaryTargets(members, false)
    .flatMap((target) => {
      const start = parseDateToUtc(target.startDate);
      const leftAt = target.leftAt ? parseDateToUtc(target.leftAt) : null;

      if (start === null || start > periodEnd) return [];

      const targetEnd = leftAt === null ? periodEnd : Math.min(periodEnd, leftAt);
      if (targetEnd < monthStart) return [];

      const firstDayMilestone = Math.max(
        100,
        Math.ceil(((monthStart - start) / DAY_MS + 1) / 100) * 100,
      );
      const milestones: AnniversaryMilestone[] = [];

      for (let days = firstDayMilestone; ; days += 100) {
        const timestamp = start + (days - 1) * DAY_MS;
        if (timestamp > targetEnd) break;

        milestones.push({
          id: `${target.id}:days:${days}`,
          memberId: target.memberId,
          nickname: target.nickname,
          milestone: days,
          milestoneKind: "days",
          date: formatUtcDate(timestamp),
        });
      }

      const startParts = DATE_PATTERN.exec(target.startDate);
      if (!startParts) return milestones;

      const startYear = Number(startParts[1]);
      const startMonth = Number(startParts[2]);
      const startDay = Number(startParts[3]);

      for (
        let years = Math.max(1, year - startYear);
        startYear + years <= year;
        years += 1
      ) {
        const timestamp = Date.UTC(startYear + years, startMonth - 1, startDay);

        if (timestamp >= monthStart && timestamp <= targetEnd) {
          milestones.push({
            id: `${target.id}:years:${years}`,
            memberId: target.memberId,
            nickname: target.nickname,
            milestone: years,
            milestoneKind: "years",
            date: formatUtcDate(timestamp),
          });
        }
      }

      return milestones;
    });

  return removeGuildDuplicateMemberAnniversaries(anniversaries, members)
    .sort((first, second) =>
      first.date.localeCompare(second.date) ||
      (first.nickname ?? "").localeCompare(second.nickname ?? "", "ko") ||
      first.milestone - second.milestone,
    );
}
