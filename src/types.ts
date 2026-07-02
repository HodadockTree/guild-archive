export type GuildMemberStatus = "active" | "left";

export interface GuildMember {
  id: string;
  nickname: string;
  status: GuildMemberStatus;
  joinedAt: string;
  leftAt: string | null;
  memo?: string;
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
  imageDataUrl?: string;
}
