import type { GuildMember } from "@/src/types";

const EXCLUDED_ACTIVITY_PARTICIPANT_NICKNAMES = new Set(["반아몽"]);
const EXCLUDED_ACTIVITY_RANKING_NICKNAMES = new Set(["바나몽", "반아몽"]);

export function isCountedActivityMember(member: GuildMember) {
  return !EXCLUDED_ACTIVITY_PARTICIPANT_NICKNAMES.has(member.nickname.trim());
}

export function isRankedActivityMember(member: GuildMember) {
  return !EXCLUDED_ACTIVITY_RANKING_NICKNAMES.has(member.nickname.trim());
}

export function getCountedActivityParticipantIds(
  participantIds: string[],
  membersById: Map<string, GuildMember>,
) {
  return participantIds.filter((memberId) => {
    const member = membersById.get(memberId);
    return !member || isCountedActivityMember(member);
  });
}
