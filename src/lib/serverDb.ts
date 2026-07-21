import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";
import type { ActivityLog, GuildArchiveBackup, GuildMember } from "@/src/types";
import {
  getMonthlyArchiveParticipants,
  getMonthlyArchiveSummaries,
} from "@/src/lib/monthlyArchive";
import { getMonthlyReport } from "@/src/lib/monthlyReport";

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
};

type ActivityRow = {
  id: string;
  type: string;
  date: string;
  title: string | null;
  memo: string | null;
  airshipType: string | null;
  imageDataUrl: string | null;
};

type ParticipantRow = {
  activityId: string;
  memberId: string;
};

type ConquestTypeRow = {
  activityId: string;
  conquestType: string;
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
      typeof member.joinedAt !== "string",
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
          id, nickname, status, joinedAt, leftAt, memo, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        member.id,
        member.nickname,
        member.status,
        member.joinedAt || null,
        member.leftAt ?? null,
        member.memo ?? null,
        importedAt,
        importedAt,
      ),
  );

  const activityStatements = backup.activityLogs.map((activity) =>
    db
      .prepare(
        `INSERT INTO activities (
          id, type, date, title, memo, airshipType, imageDataUrl, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        activity.id,
        activity.type,
        activity.date,
        activity.title ?? null,
        activity.memo ?? null,
        activity.airshipType ?? null,
        // imageDataUrl은 D1에 저장하지 않고 항상 스킵합니다 (v1.8 SQLite와 동일한 정책).
        null,
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
    imageDataUrl: "skipped",
  };
}

export async function getServerMembers(): Promise<GuildMember[]> {
  const db = await getDb();
  const { results } = await db
    .prepare("SELECT id, nickname, status, joinedAt, leftAt, memo FROM members")
    .all<MemberRow>();

  return results.map((member) => ({
    ...member,
    leftAt: member.leftAt ?? null,
    memo: member.memo ?? undefined,
  }));
}

export async function getServerActivities(): Promise<ActivityLog[]> {
  const db = await getDb();
  const [activitiesResult, participantsResult, conquestTypesResult] =
    await Promise.all([
      db
        .prepare(
          `SELECT id, type, date, title, memo, airshipType, imageDataUrl
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
    title: activity.title ?? undefined,
    memo: activity.memo ?? undefined,
    airshipType: activity.airshipType as ActivityLog["airshipType"],
    imageDataUrl: activity.imageDataUrl ?? undefined,
    participantIds: participantsByActivityId.get(activity.id) ?? [],
    conquestTypes: conquestTypesByActivityId.get(activity.id) as
      | ActivityLog["conquestTypes"]
      | undefined,
  }));
}

export async function getServerArchiveMonths() {
  const [activities, members] = await Promise.all([
    getServerActivities(),
    getServerMembers(),
  ]);

  return getMonthlyArchiveSummaries(activities).map((summary) => ({
    ...summary,
    participantMembers: getMonthlyArchiveParticipants(
      activities,
      members,
      summary.month,
    ),
    representativeEventTitle: summary.representativeEvents[0]?.title ?? null,
  }));
}

export async function getServerMonthlyReport(month: string) {
  const [activities, members] = await Promise.all([
    getServerActivities(),
    getServerMembers(),
  ]);
  const report = getMonthlyReport(activities, members, month);

  return {
    month,
    hasData: report.totalActivities > 0,
    report,
  };
}
