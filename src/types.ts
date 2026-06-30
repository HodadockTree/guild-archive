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

export interface ActivityLog {
  id: string;
  type: ActivityType;
  date: string;
  title?: string;
  participantMemberIds: string[];
  memo?: string;
}
