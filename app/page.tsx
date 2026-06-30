"use client";

import { FormEvent, useState, useSyncExternalStore } from "react";
import type { GuildMember } from "@/src/types";
import {
  addMember,
  getMembers,
  markMemberAsLeft,
} from "@/src/lib/members";

const MEMBERS_CHANGED_EVENT = "guild-archive:members-changed";
const MEMBERS_STORAGE_KEY = "guild-archive:members";
const EMPTY_MEMBERS: GuildMember[] = [];

let cachedMembersValue: string | null = null;
let cachedMembersSnapshot: GuildMember[] = EMPTY_MEMBERS;

function subscribeMembers(onStoreChange: () => void) {
  window.addEventListener(MEMBERS_CHANGED_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener(MEMBERS_CHANGED_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getServerMembersSnapshot() {
  return EMPTY_MEMBERS;
}

function getMembersSnapshot() {
  const storedMembers = window.localStorage.getItem(MEMBERS_STORAGE_KEY);

  if (storedMembers === cachedMembersValue) {
    return cachedMembersSnapshot;
  }

  cachedMembersValue = storedMembers;
  cachedMembersSnapshot = getMembers();
  return cachedMembersSnapshot;
}

function notifyMembersChanged() {
  window.dispatchEvent(new Event(MEMBERS_CHANGED_EVENT));
}

export default function Home() {
  const [nickname, setNickname] = useState("");
  const members = useSyncExternalStore<GuildMember[]>(
    subscribeMembers,
    getMembersSnapshot,
    getServerMembersSnapshot,
  );

  const activeMembers = members.filter((member) => member.status === "active");

  const handleAddMember = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedNickname = nickname.trim();

    if (!trimmedNickname) {
      return;
    }

    addMember({ nickname: trimmedNickname });
    setNickname("");
    notifyMembersChanged();
  };

  const handleLeaveMember = (memberId: string) => {
    markMemberAsLeft(memberId);
    notifyMembersChanged();
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-5 py-10">
      <header className="space-y-2">
        <p className="text-sm font-medium text-neutral-500">
          테일즈런너 길드 활동 아카이브
        </p>
        <h1 className="text-3xl font-bold text-neutral-950">
          냥춘 길드원 기록
        </h1>
        <p className="text-sm text-neutral-600">
          활동 기록에 연결할 길드원을 먼저 등록합니다. 탈퇴한 길드원도
          과거 기록 보존을 위해 삭제하지 않습니다.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900">길드원 등록</h2>
        <form className="flex gap-2" onSubmit={handleAddMember}>
          <input
            className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-neutral-900"
            type="text"
            placeholder="닉네임 입력"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
          />
          <button
            className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
            type="submit"
          >
            등록
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-neutral-900">
            활동중 길드원
          </h2>
          <span className="text-sm text-neutral-500">
            {activeMembers.length}명
          </span>
        </div>

        {activeMembers.length === 0 ? (
          <p className="rounded-md border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500">
            아직 등록된 활동중 길드원이 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200">
            {activeMembers.map((member) => (
              <li
                className="flex items-center justify-between gap-3 px-4 py-3"
                key={member.id}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-neutral-950">
                    {member.nickname}
                  </p>
                  <p className="text-xs text-neutral-500">
                    가입일 {member.joinedAt}
                  </p>
                </div>
                <button
                  className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
                  type="button"
                  onClick={() => handleLeaveMember(member.id)}
                >
                  탈퇴 처리
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
