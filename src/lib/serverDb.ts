import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { ActivityLog, GuildArchiveBackup, GuildMember } from "@/src/types";
import { getMonthlyArchiveSummaries } from "@/src/lib/monthlyArchive";
import { getMonthlyReport } from "@/src/lib/monthlyReport";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "guild-archive.sqlite");

const SERVERLESS_DB_ERROR_MESSAGE =
  "현재 배포 환경에서는 SQLite 파일 DB를 안정적으로 저장할 수 없습니다. 로컬 개발 환경 또는 파일 저장이 가능한 서버에서 사용해주세요.";

let db: Database.Database | null = null;

function isKnownServerlessEnvironment() {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.NETLIFY,
  );
}

function isFilesystemAccessError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code === "ENOENT" || code === "EROFS" || code === "EACCES";
}

type ActivityRow = Omit<ActivityLog, "participantIds" | "conquestTypes"> & {
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

function ensureDataDir() {
  if (isKnownServerlessEnvironment()) {
    throw new Error(SERVERLESS_DB_ERROR_MESSAGE);
  }

  if (fs.existsSync(DATA_DIR)) {
    return;
  }

  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (error) {
    if (isFilesystemAccessError(error)) {
      throw new Error(SERVERLESS_DB_ERROR_MESSAGE);
    }
    throw error;
  }
}

export function getDb() {
  if (db) {
    return db;
  }

  ensureDataDir();

  try {
    db = new Database(DB_PATH);
  } catch (error) {
    if (isFilesystemAccessError(error)) {
      throw new Error(SERVERLESS_DB_ERROR_MESSAGE);
    }
    throw error;
  }

  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      nickname TEXT NOT NULL,
      status TEXT NOT NULL,
      joinedAt TEXT,
      leftAt TEXT,
      memo TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      title TEXT,
      memo TEXT,
      airshipType TEXT,
      imageDataUrl TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS activity_participants (
      activityId TEXT NOT NULL,
      memberId TEXT NOT NULL,
      PRIMARY KEY (activityId, memberId),
      FOREIGN KEY (activityId) REFERENCES activities(id) ON DELETE CASCADE,
      FOREIGN KEY (memberId) REFERENCES members(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_conquest_types (
      activityId TEXT NOT NULL,
      conquestType TEXT NOT NULL,
      PRIMARY KEY (activityId, conquestType),
      FOREIGN KEY (activityId) REFERENCES activities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS import_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      importedAt TEXT NOT NULL,
      memberCount INTEGER NOT NULL,
      activityCount INTEGER NOT NULL,
      participantCount INTEGER NOT NULL,
      conquestTypeCount INTEGER NOT NULL
    );
  `);

  return db;
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

export function importBackupJson(data: unknown) {
  const backup = validateBackupData(data);
  const database = getDb();
  const importedAt = new Date().toISOString();

  return database.transaction(() => {
    database.exec(`
      DELETE FROM activity_conquest_types;
      DELETE FROM activity_participants;
      DELETE FROM activities;
      DELETE FROM members;
    `);

    const insertMember = database.prepare(`
      INSERT INTO members (
        id, nickname, status, joinedAt, leftAt, memo, createdAt, updatedAt
      ) VALUES (
        @id, @nickname, @status, @joinedAt, @leftAt, @memo, @createdAt, @updatedAt
      )
    `);
    const insertActivity = database.prepare(`
      INSERT INTO activities (
        id, type, date, title, memo, airshipType, imageDataUrl, createdAt, updatedAt
      ) VALUES (
        @id, @type, @date, @title, @memo, @airshipType, @imageDataUrl, @createdAt, @updatedAt
      )
    `);
    const insertParticipant = database.prepare(`
      INSERT OR IGNORE INTO activity_participants (activityId, memberId)
      VALUES (?, ?)
    `);
    const insertConquestType = database.prepare(`
      INSERT OR IGNORE INTO activity_conquest_types (activityId, conquestType)
      VALUES (?, ?)
    `);

    backup.members.forEach((member) => {
      insertMember.run({
        id: member.id,
        nickname: member.nickname,
        status: member.status,
        joinedAt: member.joinedAt || null,
        leftAt: member.leftAt ?? null,
        memo: member.memo ?? null,
        createdAt: importedAt,
        updatedAt: importedAt,
      });
    });

    let participantCount = 0;
    let conquestTypeCount = 0;

    backup.activityLogs.forEach((activity) => {
      insertActivity.run({
        id: activity.id,
        type: activity.type,
        date: activity.date,
        title: activity.title ?? null,
        memo: activity.memo ?? null,
        airshipType: activity.airshipType ?? null,
        imageDataUrl: null,
        createdAt: importedAt,
        updatedAt: importedAt,
      });

      activity.participantIds.forEach((memberId) => {
        const result = insertParticipant.run(activity.id, memberId);
        participantCount += result.changes;
      });

      activity.conquestTypes?.forEach((conquestType) => {
        const result = insertConquestType.run(activity.id, conquestType);
        conquestTypeCount += result.changes;
      });
    });

    database
      .prepare(
        `INSERT INTO import_logs (
          importedAt, memberCount, activityCount, participantCount, conquestTypeCount
        ) VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        importedAt,
        backup.members.length,
        backup.activityLogs.length,
        participantCount,
        conquestTypeCount,
      );

    return {
      ok: true,
      memberCount: backup.members.length,
      activityCount: backup.activityLogs.length,
      participantCount,
      conquestTypeCount,
      imageDataUrl: "skipped",
    };
  })();
}

export function getServerMembers(): GuildMember[] {
  const rows = getDb()
    .prepare("SELECT id, nickname, status, joinedAt, leftAt, memo FROM members")
    .all() as GuildMember[];

  return rows.map((member) => ({
    ...member,
    leftAt: member.leftAt ?? null,
    memo: member.memo ?? undefined,
  }));
}

export function getServerActivities(): ActivityLog[] {
  const database = getDb();
  const activityRows = database
    .prepare(
      `SELECT id, type, date, title, memo, airshipType, imageDataUrl
       FROM activities
       ORDER BY date ASC, id ASC`,
    )
    .all() as ActivityRow[];
  const participantRows = database
    .prepare("SELECT activityId, memberId FROM activity_participants")
    .all() as ParticipantRow[];
  const conquestTypeRows = database
    .prepare("SELECT activityId, conquestType FROM activity_conquest_types")
    .all() as ConquestTypeRow[];

  const participantsByActivityId = new Map<string, string[]>();
  const conquestTypesByActivityId = new Map<string, string[]>();

  participantRows.forEach((row) => {
    const participants = participantsByActivityId.get(row.activityId) ?? [];
    participants.push(row.memberId);
    participantsByActivityId.set(row.activityId, participants);
  });

  conquestTypeRows.forEach((row) => {
    const conquestTypes = conquestTypesByActivityId.get(row.activityId) ?? [];
    conquestTypes.push(row.conquestType);
    conquestTypesByActivityId.set(row.activityId, conquestTypes);
  });

  return activityRows.map((activity) => ({
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

export function getServerArchiveMonths() {
  return getMonthlyArchiveSummaries(getServerActivities()).map((summary) => ({
    ...summary,
    representativeEventTitle: summary.representativeEvents[0]?.title ?? null,
  }));
}

export function getServerMonthlyReport(month: string) {
  const activities = getServerActivities();
  const members = getServerMembers();
  const report = getMonthlyReport(activities, members, month);

  return {
    month,
    hasData: report.totalActivities > 0,
    report,
  };
}
