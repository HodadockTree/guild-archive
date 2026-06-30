"use client";

import { FormEvent, useState, useSyncExternalStore } from "react";
import type { ActivityLog, ActivityType, GuildMember } from "@/src/types";
import { addActivityLog, getActivityLogs } from "@/src/lib/activities";
import { addMember, getMembers, markMemberAsLeft } from "@/src/lib/members";

type ActivityFilter = "all" | ActivityType;

const MEMBERS_CHANGED_EVENT = "guild-archive:members-changed";
const ACTIVITIES_CHANGED_EVENT = "guild-archive:activities-changed";
const MEMBERS_STORAGE_KEY = "guild-archive:members";
const ACTIVITIES_STORAGE_KEY = "guild-archive:activities";
const EMPTY_MEMBERS: GuildMember[] = [];
const EMPTY_ACTIVITIES: ActivityLog[] = [];

const activityTypeLabels: Record<ActivityType, string> = {
  airship: "비공정",
  siege: "점령전",
  guildQuest: "길드퀘",
  event: "이벤트",
  other: "기타 메모",
};

const activityFilterLabels: Record<ActivityFilter, string> = {
  all: "전체",
  ...activityTypeLabels,
};

let cachedMembersValue: string | null = null;
let cachedMembersSnapshot: GuildMember[] = EMPTY_MEMBERS;
let cachedActivitiesValue: string | null = null;
let cachedActivitiesSnapshot: ActivityLog[] = EMPTY_ACTIVITIES;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function subscribeMembers(onStoreChange: () => void) {
  window.addEventListener(MEMBERS_CHANGED_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener(MEMBERS_CHANGED_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function subscribeActivities(onStoreChange: () => void) {
  window.addEventListener(ACTIVITIES_CHANGED_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener(ACTIVITIES_CHANGED_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getServerMembersSnapshot() {
  return EMPTY_MEMBERS;
}

function getServerActivitiesSnapshot() {
  return EMPTY_ACTIVITIES;
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

function getActivitiesSnapshot() {
  const storedActivities = window.localStorage.getItem(ACTIVITIES_STORAGE_KEY);

  if (storedActivities === cachedActivitiesValue) {
    return cachedActivitiesSnapshot;
  }

  cachedActivitiesValue = storedActivities;
  cachedActivitiesSnapshot = getActivityLogs();
  return cachedActivitiesSnapshot;
}

function notifyMembersChanged() {
  window.dispatchEvent(new Event(MEMBERS_CHANGED_EVENT));
}

function notifyActivitiesChanged() {
  window.dispatchEvent(new Event(ACTIVITIES_CHANGED_EVENT));
}

function getParticipantNames(activity: ActivityLog, members: Map<string, string>) {
  return activity.participantIds
    .map((memberId) => members.get(memberId))
    .filter((memberName): memberName is string => Boolean(memberName));
}

export default function Home() {
  const [nickname, setNickname] = useState("");
  const [activityDate, setActivityDate] = useState(today);
  const [activityType, setActivityType] = useState<ActivityType>("airship");
  const [activityTitle, setActivityTitle] = useState("");
  const [activityMemo, setActivityMemo] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const members = useSyncExternalStore<GuildMember[]>(
    subscribeMembers,
    getMembersSnapshot,
    getServerMembersSnapshot,
  );
  const activities = useSyncExternalStore<ActivityLog[]>(
    subscribeActivities,
    getActivitiesSnapshot,
    getServerActivitiesSnapshot,
  );

  const activeMembers = members.filter((member) => member.status === "active");
  const memberNamesById = new Map(
    members.map((member) => [member.id, member.nickname]),
  );
  const sortedActivities = [...activities].sort((a, b) => {
    const dateOrder = b.date.localeCompare(a.date);
    return dateOrder === 0 ? b.id.localeCompare(a.id) : dateOrder;
  });
  const filteredActivities =
    activityFilter === "all"
      ? sortedActivities
      : sortedActivities.filter((activity) => activity.type === activityFilter);

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
    setSelectedMemberIds((currentIds) =>
      currentIds.filter((selectedMemberId) => selectedMemberId !== memberId),
    );
    notifyMembersChanged();
  };

  const handleToggleParticipant = (memberId: string) => {
    setSelectedMemberIds((currentIds) =>
      currentIds.includes(memberId)
        ? currentIds.filter((selectedMemberId) => selectedMemberId !== memberId)
        : [...currentIds, memberId],
    );
  };

  const handleAddActivity = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    addActivityLog({
      date: activityDate,
      type: activityType,
      title: activityTitle.trim() || undefined,
      participantIds: selectedMemberIds,
      memo: activityMemo.trim() || undefined,
    });

    setActivityDate(today());
    setActivityType("airship");
    setActivityTitle("");
    setActivityMemo("");
    setSelectedMemberIds([]);
    notifyActivitiesChanged();
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-5 py-10">
      <header className="space-y-2">
        <p className="text-sm font-medium text-neutral-500">
          테일즈런너 길드 활동 아카이브
        </p>
        <h1 className="text-3xl font-bold text-neutral-950">
          냥춘 길드 활동 기록
        </h1>
        <p className="text-sm text-neutral-600">
          매주 길드 활동을 빠르게 남기고, 참여 길드원을 함께 보관합니다.
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

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-neutral-900">
          활동 기록 추가
        </h2>
        <form
          className="space-y-4 rounded-md border border-neutral-200 p-4"
          onSubmit={handleAddActivity}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-neutral-700">
              <span>활동 날짜</span>
              <input
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-neutral-900"
                type="date"
                value={activityDate}
                onChange={(event) => setActivityDate(event.target.value)}
                required
              />
            </label>

            <label className="space-y-1 text-sm font-medium text-neutral-700">
              <span>활동 종류</span>
              <select
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-neutral-900"
                value={activityType}
                onChange={(event) =>
                  setActivityType(event.target.value as ActivityType)
                }
              >
                {Object.entries(activityTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-1 text-sm font-medium text-neutral-700">
            <span>제목</span>
            <input
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-neutral-900"
              type="text"
              placeholder="예: 6월 4주차 비공정"
              value={activityTitle}
              onChange={(event) => setActivityTitle(event.target.value)}
            />
          </label>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-neutral-700">
              참여 길드원
            </legend>
            {activeMembers.length === 0 ? (
              <p className="rounded-md border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500">
                먼저 활동중 길드원을 등록하면 참여자를 선택할 수 있습니다.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {activeMembers.map((member) => (
                  <label
                    className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-800"
                    key={member.id}
                  >
                    <input
                      className="size-4"
                      type="checkbox"
                      checked={selectedMemberIds.includes(member.id)}
                      onChange={() => handleToggleParticipant(member.id)}
                    />
                    <span className="truncate">{member.nickname}</span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          <label className="block space-y-1 text-sm font-medium text-neutral-700">
            <span>메모</span>
            <textarea
              className="min-h-24 w-full resize-y rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-neutral-900"
              placeholder="활동 내용이나 특이사항을 남겨주세요."
              value={activityMemo}
              onChange={(event) => setActivityMemo(event.target.value)}
            />
          </label>

          <button
            className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
            type="submit"
          >
            활동 기록 저장
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">
              전체 활동 기록
            </h2>
            <p className="text-sm text-neutral-500">
              날짜 최신순으로 {filteredActivities.length}개 표시 중
            </p>
          </div>

          <label className="space-y-1 text-sm font-medium text-neutral-700">
            <span>활동 종류 필터</span>
            <select
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-neutral-900 sm:w-40"
              value={activityFilter}
              onChange={(event) =>
                setActivityFilter(event.target.value as ActivityFilter)
              }
            >
              {Object.entries(activityFilterLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {activities.length === 0 ? (
          <p className="rounded-md border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500">
            아직 저장된 활동 기록이 없습니다.
          </p>
        ) : filteredActivities.length === 0 ? (
          <p className="rounded-md border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500">
            선택한 활동 종류에 해당하는 기록이 없습니다.
          </p>
        ) : (
          <ul className="space-y-2">
            {filteredActivities.map((activity) => {
              const participantNames = getParticipantNames(
                activity,
                memberNamesById,
              );

              return (
                <li
                  className="rounded-md border border-neutral-200 px-4 py-3"
                  key={activity.id}
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-xs text-neutral-500">
                      {activity.date}
                    </span>
                    <span className="rounded-sm bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                      {activityTypeLabels[activity.type]}
                    </span>
                  </div>
                  <h3 className="mt-1 text-sm font-semibold text-neutral-950">
                    {activity.title || activityTypeLabels[activity.type]}
                  </h3>
                  <p className="mt-2 text-sm text-neutral-600">
                    참여자{" "}
                    {participantNames.length === 0
                      ? "없음"
                      : participantNames.join(", ")}
                  </p>
                  {activity.memo ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-500">
                      {activity.memo}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
