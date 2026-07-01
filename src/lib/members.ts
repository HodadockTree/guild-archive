import type { GuildMember } from "@/src/types";
import { readStorageList, writeStorageList } from "@/src/lib/storage";

const MEMBERS_STORAGE_KEY = "guild-archive:members";

type NewGuildMember = {
  nickname: string;
  joinedAt?: string;
  memo?: string;
};

type GuildMemberUpdate = Partial<
  Pick<GuildMember, "nickname" | "joinedAt" | "leftAt" | "memo" | "status">
>;

function createId() {
  return crypto.randomUUID();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function getMembers() {
  return readStorageList<GuildMember>(MEMBERS_STORAGE_KEY);
}

export function addMember(member: NewGuildMember) {
  const members = getMembers();
  const newMember: GuildMember = {
    id: createId(),
    nickname: member.nickname.trim(),
    status: "active",
    joinedAt: member.joinedAt ?? today(),
    leftAt: null,
    memo: member.memo,
  };

  writeStorageList(MEMBERS_STORAGE_KEY, [...members, newMember]);
  return newMember;
}

export function updateMember(memberId: string, update: GuildMemberUpdate) {
  let updatedMember: GuildMember | null = null;
  const members = getMembers().map((member) => {
    if (member.id !== memberId) {
      return member;
    }

    updatedMember = {
      ...member,
      ...update,
      nickname: update.nickname?.trim() ?? member.nickname,
    };
    return updatedMember;
  });

  writeStorageList(MEMBERS_STORAGE_KEY, members);
  return updatedMember;
}

export function markMemberAsLeft(memberId: string, leftAt = today()) {
  return updateMember(memberId, {
    status: "left",
    leftAt,
  });
}

export function deleteMember(memberId: string) {
  const members = getMembers();
  const nextMembers = members.filter((member) => member.id !== memberId);

  writeStorageList(MEMBERS_STORAGE_KEY, nextMembers);
}
