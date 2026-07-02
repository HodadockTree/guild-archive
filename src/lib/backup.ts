import type { ActivityLog, GuildArchiveBackup, GuildMember } from "@/src/types";
import { writeStorageList } from "@/src/lib/storage";

const MEMBERS_STORAGE_KEY = "guild-archive:members";
const ACTIVITIES_STORAGE_KEY = "guild-archive:activities";

export const BACKUP_APP_NAME = "nyangchun-guild-archive";
export const BACKUP_APP_VERSION = "v1.4";
export const BACKUP_SCHEMA_VERSION = 1;

export type BackupValidationResult =
  | { valid: true; backup: GuildArchiveBackup; warnings: string[] }
  | { valid: false; error: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasBasicMemberFields(member: unknown) {
  if (!isPlainObject(member)) {
    return false;
  }

  return (
    typeof member.id === "string" &&
    typeof member.nickname === "string" &&
    typeof member.status === "string" &&
    typeof member.joinedAt === "string"
  );
}

function hasBasicActivityLogFields(activity: unknown) {
  if (!isPlainObject(activity)) {
    return false;
  }

  return (
    typeof activity.id === "string" &&
    typeof activity.type === "string" &&
    typeof activity.date === "string" &&
    Array.isArray(activity.participantIds)
  );
}

export function createBackup(
  members: GuildMember[],
  activityLogs: ActivityLog[],
): GuildArchiveBackup {
  return {
    appName: BACKUP_APP_NAME,
    appVersion: BACKUP_APP_VERSION,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    members,
    activityLogs,
  };
}

export function validateBackupData(data: unknown): BackupValidationResult {
  if (!isPlainObject(data)) {
    return { valid: false, error: "백업 파일의 최상위 구조가 올바르지 않습니다." };
  }

  if (!Array.isArray(data.members)) {
    return { valid: false, error: "백업 파일에서 members 데이터를 찾을 수 없습니다." };
  }

  if (!Array.isArray(data.activityLogs)) {
    return {
      valid: false,
      error: "백업 파일에서 activityLogs 데이터를 찾을 수 없습니다.",
    };
  }

  const warnings: string[] = [];

  if (data.appName !== undefined && data.appName !== BACKUP_APP_NAME) {
    warnings.push("appName이 이 앱의 백업 파일과 다릅니다.");
  }

  if (data.schemaVersion !== undefined && typeof data.schemaVersion !== "number") {
    warnings.push("schemaVersion 형식이 올바르지 않습니다.");
  }

  if (data.members.some((member) => !hasBasicMemberFields(member))) {
    warnings.push(
      "일부 길드원 데이터에 기본 필드(id, nickname, status, joinedAt)가 없습니다.",
    );
  }

  if (data.activityLogs.some((activity) => !hasBasicActivityLogFields(activity))) {
    warnings.push(
      "일부 활동 기록 데이터에 기본 필드(id, type, date, participantIds)가 없습니다.",
    );
  }

  return {
    valid: true,
    warnings,
    backup: {
      appName: typeof data.appName === "string" ? data.appName : "",
      appVersion: typeof data.appVersion === "string" ? data.appVersion : "",
      schemaVersion:
        typeof data.schemaVersion === "number" ? data.schemaVersion : 0,
      exportedAt: typeof data.exportedAt === "string" ? data.exportedAt : "",
      members: data.members as GuildMember[],
      activityLogs: data.activityLogs as ActivityLog[],
    },
  };
}

export function restoreBackup(backup: GuildArchiveBackup) {
  writeStorageList(MEMBERS_STORAGE_KEY, backup.members);
  writeStorageList(ACTIVITIES_STORAGE_KEY, backup.activityLogs);
}
