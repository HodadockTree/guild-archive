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

function hasValidOptionalMemberDemographics(member: unknown) {
  if (!isPlainObject(member)) {
    return false;
  }

  const genderIsValid =
    member.gender === undefined ||
    member.gender === "female" ||
    member.gender === "male" ||
    member.gender === "other";
  const birthYearIsValid =
    member.birthYear === undefined ||
    (Number.isInteger(member.birthYear) &&
      (member.birthYear as number) >= 1900 &&
      (member.birthYear as number) <= new Date().getFullYear());
  const previousNicknamesAreValid =
    member.previousNicknames === undefined ||
    (Array.isArray(member.previousNicknames) &&
      member.previousNicknames.every(
        (nickname) => typeof nickname === "string",
      ));

  return genderIsValid && birthYearIsValid && previousNicknamesAreValid;
}

function hasBasicActivityLogFields(activity: unknown) {
  if (!isPlainObject(activity)) {
    return false;
  }

  return (
    typeof activity.id === "string" &&
    typeof activity.type === "string" &&
    typeof activity.date === "string" &&
    (activity.endDate === undefined || typeof activity.endDate === "string") &&
    Array.isArray(activity.participantIds)
  );
}

function withoutLegacyActivityImages(activity: ActivityLog): ActivityLog {
  const textActivity = { ...activity };
  delete textActivity.imageUrl;
  delete textActivity.imageDataUrl;

  return textActivity;
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
    activityLogs: activityLogs.map(withoutLegacyActivityImages),
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

  if (
    data.members.some((member) => !hasValidOptionalMemberDemographics(member))
  ) {
    warnings.push(
      "일부 길드원의 성별 또는 출생연도 형식이 올바르지 않아 서버 가져오기에서 거부될 수 있습니다.",
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
  writeStorageList(
    ACTIVITIES_STORAGE_KEY,
    backup.activityLogs.map(withoutLegacyActivityImages),
  );
}
