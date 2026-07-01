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

export interface ActivityLog {
  id: string;
  type: ActivityType;
  airshipType?: AirshipType;
  date: string;
  title?: string;
  participantIds: string[];
  memo?: string;
  imageDataUrl?: string;
}
