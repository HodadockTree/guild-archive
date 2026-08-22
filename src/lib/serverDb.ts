import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";
import type {
  ActivityLog,
  GuildArchiveBackup,
  GuildMember,
  MonthlyHighlight,
  MonthlyHighlightCategory,
} from "@/src/types";
import {
  getMonthlyArchiveParticipants,
  getMonthlyArchiveSummaries,
} from "@/src/lib/monthlyArchive";
import { getMonthlyReport } from "@/src/lib/monthlyReport";
import type { MonthlyHighlightInput } from "@/src/lib/monthlyHighlights";
import {
  sortMonthlyHighlights,
  toPublicMonthlyHighlight,
} from "@/src/lib/monthlyHighlights";

const D1_BINDING_MISSING_ERROR_MESSAGE =
  "Cloudflare D1 바인딩(DB)을 찾을 수 없습니다. wrangler.jsonc의 d1_databases 설정과 " +
  "로컬 개발 환경(next dev + initOpenNextCloudflareForDev) 설정을 확인해주세요.";

type MemberRow = {
  id: string;
  nickname: string;
  status: GuildMember["status"];
  joinedAt: string;
  leftAt: string | null;
  memo: string | null;
  gender: GuildMember["gender"] | null;
  birthYear: number | null;
};

type ActivityRow = {
  id: string;
  type: string;
  date: string;
  endDate: string | null;
  title: string | null;
  memo: string | null;
  airshipType: string | null;
};

type ParticipantRow = {
  activityId: string;
  memberId: string;
};

type ConquestTypeRow = {
  activityId: string;
  conquestType: string;
};

type MonthlyHighlightRow = {
  id: string;
  month: string;
  category: MonthlyHighlightCategory;
  title: string;
  dateText: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function getDb(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });

  if (!env.DB) {
    throw new Error(D1_BINDING_MISSING_ERROR_MESSAGE);
  }

  return env.DB;
}

function validateBackupData(data: unknown): GuildArchiveBackup {
  if (!isPlainObject(data)) {
    throw new Error("JSON 최상위 구조가 올바르지 않습니다.");
  }

  if (!Array.isArray(data.members)) {
    throw new Error("members 배열을 찾을 수 없습니다.");
  }

  if (!Array.isArray(data.activityLogs)) {
    throw new Error("activityLogs 배열을 찾을 수 없습니다.");
  }

  const hasInvalidMember = data.members.some(
    (member) =>
      !isPlainObject(member) ||
      typeof member.id !== "string" ||
      typeof member.nickname !== "string" ||
      typeof member.status !== "string" ||
      typeof member.joinedAt !== "string" ||
      (member.gender !== undefined &&
        member.gender !== "female" &&
        member.gender !== "male" &&
        member.gender !== "other") ||
      (member.birthYear !== undefined &&
        (!Number.isInteger(member.birthYear) ||
          (member.birthYear as number) < 1900 ||
          (member.birthYear as number) > new Date().getFullYear())),
  );

  if (hasInvalidMember) {
    throw new Error("일부 길드원 데이터에 필수 필드가 없습니다.");
  }

  const hasInvalidActivity = data.activityLogs.some(
    (activity) =>
      !isPlainObject(activity) ||
      typeof activity.id !== "string" ||
      typeof activity.type !== "string" ||
      typeof activity.date !== "string" ||
      (activity.endDate !== undefined && typeof activity.endDate !== "string") ||
      !Array.isArray(activity.participantIds),
  );

  if (hasInvalidActivity) {
    throw new Error("일부 활동 기록 데이터에 필수 필드가 없습니다.");
  }

  return {
    appName: typeof data.appName === "string" ? data.appName : "",
    appVersion: typeof data.appVersion === "string" ? data.appVersion : "",
    schemaVersion:
      typeof data.schemaVersion === "number" ? data.schemaVersion : 0,
    exportedAt: typeof data.exportedAt === "string" ? data.exportedAt : "",
    members: data.members as GuildMember[],
    activityLogs: data.activityLogs as ActivityLog[],
  };
}

export async function importBackupJson(data: unknown) {
  const backup = validateBackupData(data);
  const db = await getDb();
  const importedAt = new Date().toISOString();
  const deleteStatements = [
    db.prepare("DELETE FROM activity_conquest_types"),
    db.prepare("DELETE FROM activity_participants"),
    db.prepare("DELETE FROM activities"),
    db.prepare("DELETE FROM members"),
  ];

  const memberStatements = backup.members.map((member) =>
    db
      .prepare(
        `INSERT INTO members (
          id, nickname, status, joinedAt, leftAt, memo, gender, birthYear, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        member.id,
        member.nickname,
        member.status,
        member.joinedAt || null,
        member.leftAt ?? null,
        member.memo ?? null,
        member.gender ?? null,
        member.birthYear ?? null,
        importedAt,
        importedAt,
      ),
  );

  const activityStatements = backup.activityLogs.map((activity) =>
    db
      .prepare(
        `INSERT INTO activities (
          id, type, date, endDate, title, memo, airshipType, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        activity.id,
        activity.type,
        activity.date,
        activity.endDate && activity.endDate !== activity.date ? activity.endDate : null,
        activity.title ?? null,
        activity.memo ?? null,
        activity.airshipType ?? null,
        importedAt,
        importedAt,
      ),
  );

  const participantStatements = backup.activityLogs.flatMap((activity) =>
    activity.participantIds.map((memberId) =>
      db
        .prepare(
          "INSERT OR IGNORE INTO activity_participants (activityId, memberId) VALUES (?, ?)",
        )
        .bind(activity.id, memberId),
    ),
  );

  const conquestTypeStatements = backup.activityLogs.flatMap((activity) =>
    (activity.conquestTypes ?? []).map((conquestType) =>
      db
        .prepare(
          "INSERT OR IGNORE INTO activity_conquest_types (activityId, conquestType) VALUES (?, ?)",
        )
        .bind(activity.id, conquestType),
    ),
  );

  const statements = [
    ...deleteStatements,
    ...memberStatements,
    ...activityStatements,
    ...participantStatements,
    ...conquestTypeStatements,
  ];

  // deleteStatements가 항상 4개 포함되므로 batch가 빈 배열이 되는 경우는 없습니다.
  const results = await db.batch(statements);

  const participantStart =
    deleteStatements.length + memberStatements.length + activityStatements.length;
  const participantCount = results
    .slice(participantStart, participantStart + participantStatements.length)
    .reduce((sum, result) => sum + (result.meta.changes ?? 0), 0);

  const conquestStart = participantStart + participantStatements.length;
  const conquestTypeCount = results
    .slice(conquestStart, conquestStart + conquestTypeStatements.length)
    .reduce((sum, result) => sum + (result.meta.changes ?? 0), 0);

  await db
    .prepare(
      `INSERT INTO import_logs (
        importedAt, memberCount, activityCount, participantCount, conquestTypeCount
      ) VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(
      importedAt,
      backup.members.length,
      backup.activityLogs.length,
      participantCount,
      conquestTypeCount,
    )
    .run();

  return {
    ok: true,
    memberCount: backup.members.length,
    activityCount: backup.activityLogs.length,
    participantCount,
    conquestTypeCount,
  };
}

export async function getServerMembers(): Promise<GuildMember[]> {
  const db = await getDb();
  const { results } = await db
    .prepare(
      "SELECT id, nickname, status, joinedAt, leftAt, memo, gender, birthYear FROM members",
    )
    .all<MemberRow>();

  return results.map((member) => ({
    ...member,
    leftAt: member.leftAt ?? null,
    memo: member.memo ?? undefined,
    gender: member.gender ?? undefined,
    birthYear: member.birthYear ?? undefined,
  }));
}

export async function getServerActivities(): Promise<ActivityLog[]> {
  const db = await getDb();
  const [activitiesResult, participantsResult, conquestTypesResult] =
    await Promise.all([
      db
        .prepare(
          `SELECT id, type, date, endDate, title, memo, airshipType
           FROM activities
           ORDER BY date ASC, id ASC`,
        )
        .all<ActivityRow>(),
      db
        .prepare("SELECT activityId, memberId FROM activity_participants")
        .all<ParticipantRow>(),
      db
        .prepare("SELECT activityId, conquestType FROM activity_conquest_types")
        .all<ConquestTypeRow>(),
    ]);

  const participantsByActivityId = new Map<string, string[]>();
  const conquestTypesByActivityId = new Map<string, string[]>();

  participantsResult.results.forEach((row) => {
    const participants = participantsByActivityId.get(row.activityId) ?? [];
    participants.push(row.memberId);
    participantsByActivityId.set(row.activityId, participants);
  });

  conquestTypesResult.results.forEach((row) => {
    const conquestTypes = conquestTypesByActivityId.get(row.activityId) ?? [];
    conquestTypes.push(row.conquestType);
    conquestTypesByActivityId.set(row.activityId, conquestTypes);
  });

  return activitiesResult.results.map((activity) => ({
    id: activity.id,
    type: activity.type as ActivityLog["type"],
    date: activity.date,
    endDate: activity.endDate ?? undefined,
    title: activity.title ?? undefined,
    memo: activity.memo ?? undefined,
    airshipType: activity.airshipType as ActivityLog["airshipType"],
    participantIds: participantsByActivityId.get(activity.id) ?? [],
    conquestTypes: conquestTypesByActivityId.get(activity.id) as
      | ActivityLog["conquestTypes"]
      | undefined,
  }));
}

function toMonthlyHighlight(row: MonthlyHighlightRow): MonthlyHighlight {
  return {
    id: row.id,
    month: row.month,
    category: row.category,
    title: row.title,
    dateText: row.dateText ?? undefined,
    description: row.description ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getServerMonthlyHighlights(month?: string) {
  const db = await getDb();
  const statement = month
    ? db
        .prepare(
          `SELECT id, month, category, title, dateText, description, createdAt, updatedAt
           FROM monthly_highlights
           WHERE month = ?`,
        )
        .bind(month)
    : db.prepare(
        `SELECT id, month, category, title, dateText, description, createdAt, updatedAt
         FROM monthly_highlights`,
      );
  const { results } = await statement.all<MonthlyHighlightRow>();
  return sortMonthlyHighlights(results.map(toMonthlyHighlight));
}

export async function createServerMonthlyHighlight(
  input: MonthlyHighlightInput,
) {
  const db = await getDb();
  const now = new Date().toISOString();
  const highlight: MonthlyHighlight = {
    id: crypto.randomUUID(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };

  await db
    .prepare(
      `INSERT INTO monthly_highlights (
        id, month, category, title, dateText, description, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      highlight.id,
      highlight.month,
      highlight.category,
      highlight.title,
      highlight.dateText ?? null,
      highlight.description ?? null,
      highlight.createdAt,
      highlight.updatedAt,
    )
    .run();

  return highlight;
}

export async function updateServerMonthlyHighlight(
  id: string,
  input: MonthlyHighlightInput,
) {
  const db = await getDb();
  const updatedAt = new Date().toISOString();
  const result = await db
    .prepare(
      `UPDATE monthly_highlights
       SET month = ?, category = ?, title = ?, dateText = ?, description = ?,
           updatedAt = ?
       WHERE id = ?`,
    )
    .bind(
      input.month,
      input.category,
      input.title,
      input.dateText ?? null,
      input.description ?? null,
      updatedAt,
      id,
    )
    .run();

  if ((result.meta.changes ?? 0) === 0) {
    return null;
  }

  return {
    id,
    ...input,
    updatedAt,
  };
}

export async function deleteServerMonthlyHighlight(id: string) {
  const db = await getDb();
  const result = await db
    .prepare("DELETE FROM monthly_highlights WHERE id = ?")
    .bind(id)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function getServerArchiveMonths() {
  const [activities, members, highlights] = await Promise.all([
    getServerActivities(),
    getServerMembers(),
    getServerMonthlyHighlights(),
  ]);
  const summariesByMonth = new Map(
    getMonthlyArchiveSummaries(activities, members).map((summary) => [
      summary.month,
      summary,
    ]),
  );
  const highlightsByMonth = new Map<string, MonthlyHighlight[]>();

  highlights.forEach((highlight) => {
    highlightsByMonth.set(highlight.month, [
      ...(highlightsByMonth.get(highlight.month) ?? []),
      highlight,
    ]);

    if (!summariesByMonth.has(highlight.month)) {
      summariesByMonth.set(highlight.month, {
        month: highlight.month,
        activityCount: 0,
        eventCount: 0,
        participantMemberCount: 0,
        totalParticipationCount: 0,
        auroraAverageParticipantCount: 0,
        oceanAverageParticipantCount: 0,
        representativeEvents: [],
      });
    }
  });

  return Array.from(summariesByMonth.values())
    .sort((a, b) => b.month.localeCompare(a.month))
    .map((summary) => {
      const monthHighlights = highlightsByMonth.get(summary.month) ?? [];

      return {
        ...summary,
        participantMembers: getMonthlyArchiveParticipants(
          activities,
          members,
          summary.month,
        ),
        representativeEventTitle:
          summary.representativeEvents[0]?.title ?? null,
        highlightCount: monthHighlights.length,
        representativeHighlightTitle: monthHighlights[0]?.title ?? null,
        representativeHighlights: monthHighlights.map((highlight) => ({
          id: highlight.id,
          category: highlight.category,
          title: highlight.title,
        })),
      };
    });
}

export async function getServerMonthlyReport(month: string) {
  const [activities, members, highlights] = await Promise.all([
    getServerActivities(),
    getServerMembers(),
    getServerMonthlyHighlights(month),
  ]);
  const report = getMonthlyReport(activities, members, month);

  return {
    month,
    hasData:
      report.totalActivities > 0 ||
      highlights.length > 0 ||
      report.newMembers.length > 0 ||
      report.anniversaries.length > 0,
    report,
    highlights: highlights.map(toPublicMonthlyHighlight),
  };
}
