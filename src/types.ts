export type GuildMemberStatus = "active" | "left";
export type GuildMemberGender = "female" | "male" | "other";

export interface GuildMember {
  id: string;
  nickname: string;
  status: GuildMemberStatus;
  joinedAt: string;
  leftAt: string | null;
  memo?: string;
  gender?: GuildMemberGender;
  birthYear?: number;
}

export type MonthlyHighlightCategory =
  | "game_update"
  | "game_event"
  | "guild_news"
  | "other";

export interface MonthlyHighlight {
  id: string;
  month: string;
  category: MonthlyHighlightCategory;
  title: string;
  dateText?: string;
  description?: string;
  /** Legacy backup/DB compatibility only. The application no longer uses images. */
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type ActivityType = "airship" | "siege" | "guildQuest" | "event" | "other";
export type AirshipType = "ocean" | "aurora";
export type ConquestType =
  | "용기"
  | "신념"
  | "평화"
  | "신성"
  | "지혜"
  | "예언"
  | "초심"
  | "긍지"
  | "역전";

export interface ActivityLog {
  id: string;
  type: ActivityType;
  airshipType?: AirshipType;
  conquestTypes?: ConquestType[];
  date: string;
  title?: string;
  participantIds: string[];
  memo?: string;
  /** Legacy backup/DB compatibility only. The application no longer uses images. */
  imageUrl?: string;
  /** Legacy backup/DB compatibility only. The application no longer uses images. */
  imageDataUrl?: string;
}

export interface GuildArchiveBackup {
  appName: string;
  appVersion: string;
  schemaVersion: number;
  exportedAt: string;
  members: GuildMember[];
  activityLogs: ActivityLog[];
}
