import type { ActivityLog, GuildMember } from "@/src/types";
import { getMonthlyActivityLabel } from "@/src/lib/activityLabels";

export type ActivityParticipant = {
  id: string;
  nickname: string;
};

export type MemberActivityRecord = {
  id: string;
  date: string;
  label: string;
  title: string;
  participantCount: number;
  participants: ActivityParticipant[];
  memo?: string;
  imageUrl?: string;
  imageDataUrl?: string;
};

export type MemberActivityDetailData = {
  member: Pick<GuildMember, "id" | "nickname" | "status" | "joinedAt" | "leftAt">;
  activities: MemberActivityRecord[];
};

function getUnknownMemberName(memberId: string) {
  const shortId = memberId.trim().slice(0, 6);
  return shortId ? `알 수 없는 길드원 ${shortId}` : "알 수 없는 길드원";
}

export function toMemberActivityRecord(
  activity: ActivityLog,
  membersById: Map<string, GuildMember>,
): MemberActivityRecord {
  return {
    id: activity.id,
    date: activity.date,
    label: getMonthlyActivityLabel(activity),
    title: activity.title?.trim() || getMonthlyActivityLabel(activity),
    participantCount: activity.participantIds.length,
    participants: activity.participantIds.map((memberId) => ({
      id: memberId,
      nickname: membersById.get(memberId)?.nickname ?? getUnknownMemberName(memberId),
    })),
    memo: activity.memo?.trim() || undefined,
    imageUrl: activity.imageUrl,
    imageDataUrl: activity.imageDataUrl,
  };
}

export function getMemberActivityDetail(
  activities: ActivityLog[],
  members: GuildMember[],
  memberId: string,
): MemberActivityDetailData | null {
  const member = members.find((candidate) => candidate.id === memberId);

  if (!member) {
    return null;
  }

  const membersById = new Map(members.map((candidate) => [candidate.id, candidate]));

  return {
    member: {
      id: member.id,
      nickname: member.nickname,
      status: member.status,
      joinedAt: member.joinedAt,
      leftAt: member.leftAt,
    },
    activities: activities
      .filter((activity) => activity.participantIds.includes(memberId))
      .sort((a, b) => {
        const dateOrder = b.date.localeCompare(a.date);
        return dateOrder || b.id.localeCompare(a.id);
      })
      .map((activity) => toMemberActivityRecord(activity, membersById)),
  };
}
