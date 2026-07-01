"use client";

import {
  ChangeEvent,
  ClipboardEvent,
  FormEvent,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  ActivityLog,
  ActivityType,
  GuildMember,
  GuildMemberStatus,
} from "@/src/types";
import {
  addActivityLog,
  deleteActivityLog,
  getActivityLogs,
  updateActivityLog,
} from "@/src/lib/activities";
import {
  addMember,
  getMembers,
  markMemberAsLeft,
  updateMember,
} from "@/src/lib/members";
import { writeStorageList } from "@/src/lib/storage";

type ActivityFilter = "all" | ActivityType;
type MemberImportResult = {
  added: number;
  skipped: number;
  failed: number;
};
type MemberImportUndoResult = {
  removed: number;
  kept: number;
};
type RestoreLeftMembersResult = {
  restored: number;
};

const MEMBERS_CHANGED_EVENT = "guild-archive:members-changed";
const ACTIVITIES_CHANGED_EVENT = "guild-archive:activities-changed";
const MEMBERS_STORAGE_KEY = "guild-archive:members";
const ACTIVITIES_STORAGE_KEY = "guild-archive:activities";
const EMPTY_MEMBERS: GuildMember[] = [];
const EMPTY_ACTIVITIES: ActivityLog[] = [];
const MAX_IMAGE_WIDTH = 1000;
const IMAGE_JPEG_QUALITY = 0.72;

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

const memberStatusLabels: Record<GuildMemberStatus, string> = {
  active: "활동중",
  left: "탈퇴",
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

function normalizeHeader(header: string) {
  return header.replace(/\s/g, "").toLowerCase();
}

function normalizeDate(value: string) {
  const match = value.trim().match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);

  if (!match) {
    return "";
  }

  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function looksLikeDate(value: string) {
  return Boolean(normalizeDate(value));
}

function parseSpreadsheetRows(text: string) {
  return text
    .split(/\r?\n/)
    .map((row) => row.split("\t").map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    image.src = src;
  });
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("이미지를 읽지 못했습니다."));
      }
    };
    reader.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

async function resizeImageFile(file: File) {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_IMAGE_WIDTH / image.width);
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("이미지를 처리하지 못했습니다.");
  }

  canvas.width = width;
  canvas.height = height;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", IMAGE_JPEG_QUALITY);
}

export default function Home() {
  const [nickname, setNickname] = useState("");
  const [activityDate, setActivityDate] = useState(today);
  const [activityType, setActivityType] = useState<ActivityType>("airship");
  const [activityTitle, setActivityTitle] = useState("");
  const [activityMemo, setActivityMemo] = useState("");
  const [activityImageDataUrl, setActivityImageDataUrl] = useState("");
  const [activityImageError, setActivityImageError] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [editingActivityId, setEditingActivityId] = useState<string | null>(
    null,
  );
  const [historyMemberId, setHistoryMemberId] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberEditNickname, setMemberEditNickname] = useState("");
  const [memberEditStatus, setMemberEditStatus] =
    useState<GuildMemberStatus>("active");
  const [memberEditJoinedAt, setMemberEditJoinedAt] = useState("");
  const [memberEditLeftAt, setMemberEditLeftAt] = useState("");
  const [memberEditMemo, setMemberEditMemo] = useState("");
  const [memberImportText, setMemberImportText] = useState("");
  const [memberImportResult, setMemberImportResult] =
    useState<MemberImportResult | null>(null);
  const [lastImportedMemberIds, setLastImportedMemberIds] = useState<string[]>(
    [],
  );
  const [memberImportUndoResult, setMemberImportUndoResult] =
    useState<MemberImportUndoResult | null>(null);
  const [restoreLeftMembersResult, setRestoreLeftMembersResult] =
    useState<RestoreLeftMembersResult | null>(null);
  const [isActiveMembersOpen, setIsActiveMembersOpen] = useState(true);
  const [isLeftMembersOpen, setIsLeftMembersOpen] = useState(false);
  const activityFormRef = useRef<HTMLElement>(null);
  const memberFormRef = useRef<HTMLElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
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

  const isEditingActivity = editingActivityId !== null;
  const editingActivity = activities.find(
    (activity) => activity.id === editingActivityId,
  );
  const isEditingMember = editingMemberId !== null;
  const editingMember = members.find((member) => member.id === editingMemberId);
  const activeMembers = members.filter((member) => member.status === "active");
  const leftMembers = members.filter((member) => member.status === "left");
  const participationCounts = activities.reduce<Record<string, number>>(
    (counts, activity) => {
      activity.participantIds.forEach((memberId) => {
        counts[memberId] = (counts[memberId] ?? 0) + 1;
      });
      return counts;
    },
    {},
  );
  const selectableMembers = members
    .filter(
      (member) =>
        member.status === "active" || selectedMemberIds.includes(member.id),
    )
    .sort((a, b) => {
      const countOrder =
        (participationCounts[b.id] ?? 0) - (participationCounts[a.id] ?? 0);

      if (countOrder !== 0) {
        return countOrder;
      }

      return a.nickname.localeCompare(b.nickname, "ko");
    });
  const selectableActiveMembers = selectableMembers.filter(
    (member) => member.status === "active",
  );
  const selectableLeftMembers = selectableMembers.filter(
    (member) => member.status === "left",
  );
  const selectedHistoryMember =
    members.find((member) => member.id === historyMemberId) ?? null;
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
  const selectedMemberActivities = selectedHistoryMember
    ? sortedActivities.filter((activity) =>
        activity.participantIds.includes(selectedHistoryMember.id),
      )
    : [];

  const clearImageInput = () => {
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const resetActivityForm = () => {
    setActivityDate(today());
    setActivityType("airship");
    setActivityTitle("");
    setActivityMemo("");
    setActivityImageDataUrl("");
    setActivityImageError("");
    setSelectedMemberIds([]);
    setEditingActivityId(null);
    clearImageInput();
  };

  const resetMemberForm = () => {
    setEditingMemberId(null);
    setMemberEditNickname("");
    setMemberEditStatus("active");
    setMemberEditJoinedAt("");
    setMemberEditLeftAt("");
    setMemberEditMemo("");
  };

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

  const handleImportMembers = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const rows = parseSpreadsheetRows(memberImportText);
    const [headers, ...dataRows] = rows;

    if (!headers || dataRows.length === 0) {
      setMemberImportResult({ added: 0, skipped: 0, failed: rows.length });
      setLastImportedMemberIds([]);
      setMemberImportUndoResult(null);
      return;
    }

    const normalizedHeaders = headers.map(normalizeHeader);
    const nicknameIndex = normalizedHeaders.findIndex(
      (header) =>
        header.includes("닉네임") ||
        header.includes("닉넴") ||
        header === "닉" ||
        header.includes("이름"),
    );
    const joinedAtHeaderIndex = normalizedHeaders.findIndex((header) =>
      header.includes("가입일") || (header.includes("가입") && header.includes("일")),
    );

    if (nicknameIndex === -1) {
      setMemberImportResult({ added: 0, skipped: 0, failed: dataRows.length });
      setLastImportedMemberIds([]);
      setMemberImportUndoResult(null);
      return;
    }

    let added = 0;
    let skipped = 0;
    let failed = 0;
    const importedMemberIds: string[] = [];
    const knownNicknames = new Set(
      members.map((member) => member.nickname.trim().toLowerCase()),
    );

    dataRows.forEach((row) => {
      const nicknameValue = row[nicknameIndex]?.trim();

      if (!nicknameValue) {
        failed += 1;
        return;
      }

      const nicknameKey = nicknameValue.toLowerCase();

      if (knownNicknames.has(nicknameKey)) {
        skipped += 1;
        return;
      }

      let joinedAtIndex = joinedAtHeaderIndex;
      let joinedAt = "";

      if (joinedAtIndex !== -1) {
        joinedAt = normalizeDate(row[joinedAtIndex] ?? "");
      }

      if (!joinedAt) {
        const dateIndexAfterNickname = row.findIndex(
          (cell, index) => index > nicknameIndex && looksLikeDate(cell),
        );
        joinedAtIndex = dateIndexAfterNickname === -1 ? row.findIndex(
          (cell, index) => index !== nicknameIndex && looksLikeDate(cell),
        ) : dateIndexAfterNickname;
        joinedAt = joinedAtIndex === -1 ? "" : normalizeDate(row[joinedAtIndex]);
      }

      const memo = row
        .map((cell, index) => {
          if (!cell || index === nicknameIndex || index === joinedAtIndex) {
            return "";
          }

          const header = headers[index]?.trim() || `${index + 1}열`;
          return `${header}: ${cell}`;
        })
        .filter(Boolean)
        .join("\n");

      const addedMember = addMember({
        nickname: nicknameValue,
        joinedAt: joinedAt || undefined,
        memo: memo || undefined,
      });
      importedMemberIds.push(addedMember.id);
      knownNicknames.add(nicknameKey);
      added += 1;
    });

    setMemberImportResult({ added, skipped, failed });
    setLastImportedMemberIds(importedMemberIds);
    setMemberImportUndoResult(null);
    setMemberImportText("");
    notifyMembersChanged();
  };

  const handleUndoLastImport = () => {
    if (lastImportedMemberIds.length === 0) {
      return;
    }

    const shouldUndo = window.confirm(
      `방금 가져온 ${lastImportedMemberIds.length}명을 되돌릴까요? 활동 기록에 이미 사용된 길드원은 유지됩니다.`,
    );

    if (!shouldUndo) {
      return;
    }

    const undoTargetIds = new Set(lastImportedMemberIds);
    const usedMemberIds = new Set(
      activities.flatMap((activity) => activity.participantIds),
    );
    const currentMembers = getMembers();
    const removableIds = new Set(
      currentMembers
        .filter(
          (member) =>
            undoTargetIds.has(member.id) && !usedMemberIds.has(member.id),
        )
        .map((member) => member.id),
    );
    const kept = currentMembers.filter(
      (member) => undoTargetIds.has(member.id) && usedMemberIds.has(member.id),
    ).length;
    const nextMembers = currentMembers.filter(
      (member) => !removableIds.has(member.id),
    );

    writeStorageList(MEMBERS_STORAGE_KEY, nextMembers);

    if (historyMemberId && removableIds.has(historyMemberId)) {
      setHistoryMemberId(null);
    }

    if (editingMemberId && removableIds.has(editingMemberId)) {
      resetMemberForm();
    }

    setLastImportedMemberIds([]);
    setMemberImportUndoResult({ removed: removableIds.size, kept });
    notifyMembersChanged();
  };

  const handleLeaveMember = (memberId: string) => {
    markMemberAsLeft(memberId);
    setSelectedMemberIds((currentIds) =>
      currentIds.filter((selectedMemberId) => selectedMemberId !== memberId),
    );
    setRestoreLeftMembersResult(null);
    notifyMembersChanged();
  };

  const handleViewMemberHistory = (memberId: string) => {
    setHistoryMemberId(memberId);
  };

  const handleRestoreLeftMembers = () => {
    if (leftMembers.length === 0) {
      return;
    }

    const shouldRestore = window.confirm(
      `탈퇴 상태인 길드원 ${leftMembers.length}명을 모두 활동중으로 복구할까요? 길드원 id와 기존 활동 기록 연결은 그대로 유지됩니다.`,
    );

    if (!shouldRestore) {
      return;
    }

    const currentMembers = getMembers();
    const nextMembers = currentMembers.map((member) =>
      member.status === "left"
        ? {
            ...member,
            status: "active" as const,
            leftAt: null,
          }
        : member,
    );

    writeStorageList(MEMBERS_STORAGE_KEY, nextMembers);
    setRestoreLeftMembersResult({ restored: leftMembers.length });
    notifyMembersChanged();
  };

  const handleEditMember = (member: GuildMember) => {
    setEditingMemberId(member.id);
    setMemberEditNickname(member.nickname);
    setMemberEditStatus(member.status);
    setMemberEditJoinedAt(member.joinedAt);
    setMemberEditLeftAt(member.leftAt ?? "");
    setMemberEditMemo(member.memo ?? "");
    requestAnimationFrame(() => {
      memberFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleSubmitMemberEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingMemberId) {
      return;
    }

    const trimmedNickname = memberEditNickname.trim();

    if (!trimmedNickname) {
      return;
    }

    updateMember(editingMemberId, {
      nickname: trimmedNickname,
      status: memberEditStatus,
      joinedAt: memberEditJoinedAt,
      leftAt: memberEditStatus === "left" ? memberEditLeftAt || null : null,
      memo: memberEditMemo.trim() || undefined,
    });

    resetMemberForm();
    notifyMembersChanged();
  };

  const handleToggleParticipant = (memberId: string) => {
    setSelectedMemberIds((currentIds) =>
      currentIds.includes(memberId)
        ? currentIds.filter((selectedMemberId) => selectedMemberId !== memberId)
        : [...currentIds, memberId],
    );
  };

  const handleActivityImageChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setActivityImageError("이미지 파일만 첨부할 수 있습니다.");
      clearImageInput();
      return;
    }

    try {
      setActivityImageError("");
      const resizedImage = await resizeImageFile(file);
      setActivityImageDataUrl(resizedImage);
    } catch {
      setActivityImageError("이미지를 압축하는 중 문제가 발생했습니다.");
      clearImageInput();
    }
  };

  const handleActivityImagePaste = async (
    event: ClipboardEvent<HTMLFormElement>,
  ) => {
    const imageItem = Array.from(event.clipboardData.items).find((item) =>
      item.type.startsWith("image/"),
    );

    if (!imageItem) {
      return;
    }

    const file = imageItem.getAsFile();

    if (!file) {
      return;
    }

    event.preventDefault();

    try {
      setActivityImageError("");
      const resizedImage = await resizeImageFile(file);
      setActivityImageDataUrl(resizedImage);
      clearImageInput();
    } catch {
      setActivityImageError("붙여넣은 이미지를 압축하는 중 문제가 발생했습니다.");
    }
  };

  const handleRemoveActivityImage = () => {
    setActivityImageDataUrl("");
    setActivityImageError("");
    clearImageInput();
  };

  const handleSubmitActivity = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const activityData = {
      date: activityDate,
      type: activityType,
      title: activityTitle.trim() || undefined,
      participantIds: selectedMemberIds,
      memo: activityMemo.trim() || undefined,
      imageDataUrl: activityImageDataUrl || undefined,
    };

    if (editingActivityId) {
      updateActivityLog(editingActivityId, activityData);
    } else {
      addActivityLog(activityData);
    }

    resetActivityForm();
    notifyActivitiesChanged();
  };

  const handleEditActivity = (activity: ActivityLog) => {
    setEditingActivityId(activity.id);
    setActivityDate(activity.date);
    setActivityType(activity.type);
    setActivityTitle(activity.title ?? "");
    setActivityMemo(activity.memo ?? "");
    setActivityImageDataUrl(activity.imageDataUrl ?? "");
    setActivityImageError("");
    setSelectedMemberIds(activity.participantIds);
    clearImageInput();
    requestAnimationFrame(() => {
      activityFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleDeleteActivity = (activityId: string) => {
    const shouldDelete = window.confirm("이 활동 기록을 삭제할까요?");

    if (!shouldDelete) {
      return;
    }

    deleteActivityLog(activityId);

    if (editingActivityId === activityId) {
      resetActivityForm();
    }

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
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">
            스프레드시트에서 가져오기
          </h2>
          <p className="text-sm text-neutral-500">
            첫 줄은 헤더로 보고, 탭으로 구분된 표 데이터를 읽어 여러 길드원을
            한 번에 등록합니다.
          </p>
        </div>
        <form className="space-y-3" onSubmit={handleImportMembers}>
          <textarea
            className="min-h-36 w-full resize-y rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-neutral-900"
            placeholder={"닉네임\t나이\t성별\t가입일\n냥춘\t20\t여\t2026. 1. 22"}
            value={memberImportText}
            onChange={(event) => setMemberImportText(event.target.value)}
          />
          <button
            className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
            type="submit"
          >
            길드원 일괄 가져오기
          </button>
        </form>
        {lastImportedMemberIds.length > 0 ? (
          <button
            className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-700"
            type="button"
            onClick={handleUndoLastImport}
          >
            방금 가져온 {lastImportedMemberIds.length}명 되돌리기
          </button>
        ) : null}
        {memberImportResult ? (
          <p className="rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
            추가 {memberImportResult.added}명 · 중복 건너뜀{" "}
            {memberImportResult.skipped}명 · 실패 {memberImportResult.failed}행
          </p>
        ) : null}
        {memberImportUndoResult ? (
          <p className="rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
            되돌리기 완료: 삭제 {memberImportUndoResult.removed}명 · 활동
            기록에 사용 중이라 유지 {memberImportUndoResult.kept}명
          </p>
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-neutral-900">
            &#44600;&#46300;&#50896; &#44288;&#47532;
          </h2>
          <span className="text-sm text-neutral-500">
            &#51204;&#52404; {members.length}&#47749;
          </span>
        </div>

        {leftMembers.length > 0 ? (
          <button
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
            type="button"
            onClick={handleRestoreLeftMembers}
          >
            &#53448;&#53748; &#44600;&#46300;&#50896; {leftMembers.length}&#47749; &#54876;&#46041;&#51473;&#51004;&#47196; &#48373;&#44396;
          </button>
        ) : null}
        {restoreLeftMembersResult ? (
          <p className="rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
            {restoreLeftMembersResult.restored}&#47749;&#51012; &#54876;&#46041;&#51473;&#51004;&#47196; &#48373;&#44396;&#54664;&#49845;&#45768;&#45796;.
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-neutral-900">
            &#54876;&#46041;&#51473; &#44600;&#46300;&#50896; {activeMembers.length}&#47749;
          </h3>
          <button
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
            type="button"
            onClick={() => setIsActiveMembersOpen((value) => !value)}
          >
            {isActiveMembersOpen ? "\uC811\uAE30" : "\uD3BC\uCE58\uAE30"}
          </button>
        </div>

        {isActiveMembersOpen ? (
          activeMembers.length === 0 ? (
            <p className="rounded-md border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500">
              &#50500;&#51649; &#46321;&#47197;&#46108; &#54876;&#46041;&#51473; &#44600;&#46300;&#50896;&#51060; &#50630;&#49845;&#45768;&#45796;.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200">
              {activeMembers.map((member) => (
                <li
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  key={member.id}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-950">
                      {member.nickname}
                    </p>
                    {member.joinedAt ? (
                      <p className="text-xs text-neutral-500">
                        &#44032;&#51077;&#51068; {member.joinedAt}
                      </p>
                    ) : null}
                    {member.memo ? (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">
                        {member.memo}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
                      type="button"
                      onClick={() => handleEditMember(member)}
                    >
                      &#49688;&#51221;
                    </button>
                    <button
                      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
                      type="button"
                      onClick={() => handleViewMemberHistory(member.id)}
                    >
                      &#54876;&#46041; &#51060;&#47141; &#48372;&#44592;
                    </button>
                    <button
                      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
                      type="button"
                      onClick={() => handleLeaveMember(member.id)}
                    >
                      &#53448;&#53748; &#52376;&#47532;
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : null}

        <div className="flex items-center justify-between gap-3 pt-2">
          <h3 className="text-base font-semibold text-neutral-900">
            &#53448;&#53748; &#44600;&#46300;&#50896; {leftMembers.length}&#47749;
          </h3>
          <button
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
            type="button"
            onClick={() => setIsLeftMembersOpen((value) => !value)}
          >
            {isLeftMembersOpen ? "\uC811\uAE30" : "\uD3BC\uCE58\uAE30"}
          </button>
        </div>

        {isLeftMembersOpen ? (
          leftMembers.length === 0 ? (
            <p className="rounded-md border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500">
              &#53448;&#53748; &#49345;&#53468;&#51064; &#44600;&#46300;&#50896;&#51060; &#50630;&#49845;&#45768;&#45796;.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 bg-neutral-50">
              {leftMembers.map((member) => (
                <li
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  key={member.id}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium text-neutral-700">
                        {member.nickname}
                      </p>
                      <span className="rounded-sm bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600">
                        &#53448;&#53748;
                      </span>
                    </div>
                    {member.joinedAt ? (
                      <p className="text-xs text-neutral-500">
                        &#44032;&#51077;&#51068; {member.joinedAt}
                      </p>
                    ) : null}
                    {member.leftAt ? (
                      <p className="text-xs text-neutral-500">
                        &#53448;&#53748;&#51068; {member.leftAt}
                      </p>
                    ) : null}
                    {member.memo ? (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-500">
                        {member.memo}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
                      type="button"
                      onClick={() => handleEditMember(member)}
                    >
                      &#49688;&#51221;
                    </button>
                    <button
                      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
                      type="button"
                      onClick={() => handleViewMemberHistory(member.id)}
                    >
                      &#54876;&#46041; &#51060;&#47141; &#48372;&#44592;
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </section>

      {isEditingMember ? (
        <section className="space-y-4" ref={memberFormRef}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-neutral-900">
              길드원 정보 수정
            </h2>
            <button
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
              type="button"
              onClick={resetMemberForm}
            >
              수정 취소
            </button>
          </div>
          <form
            className="space-y-4 rounded-md border border-neutral-200 p-4"
            onSubmit={handleSubmitMemberEdit}
          >
            <p className="rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
              {editingMember?.nickname || "선택한 길드원"} 정보를 수정 중입니다.
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-neutral-700">
                <span>닉네임</span>
                <input
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-neutral-900"
                  type="text"
                  value={memberEditNickname}
                  onChange={(event) => setMemberEditNickname(event.target.value)}
                  required
                />
              </label>

              <label className="space-y-1 text-sm font-medium text-neutral-700">
                <span>상태</span>
                <select
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-neutral-900"
                  value={memberEditStatus}
                  onChange={(event) =>
                    setMemberEditStatus(event.target.value as GuildMemberStatus)
                  }
                >
                  <option value="active">활동중</option>
                  <option value="left">탈퇴</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-neutral-700">
                <span>가입일</span>
                <input
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-neutral-900"
                  type="date"
                  value={memberEditJoinedAt}
                  onChange={(event) => setMemberEditJoinedAt(event.target.value)}
                />
              </label>

              <label className="space-y-1 text-sm font-medium text-neutral-700">
                <span>탈퇴일</span>
                <input
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-neutral-900 disabled:bg-neutral-100 disabled:text-neutral-400"
                  type="date"
                  value={memberEditLeftAt}
                  onChange={(event) => setMemberEditLeftAt(event.target.value)}
                  disabled={memberEditStatus === "active"}
                />
              </label>
            </div>

            <label className="block space-y-1 text-sm font-medium text-neutral-700">
              <span>메모</span>
              <textarea
                className="min-h-24 w-full resize-y rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-neutral-900"
                placeholder="가입 경로, 닉네임 변경 이력, 참고할 내용을 남겨주세요."
                value={memberEditMemo}
                onChange={(event) => setMemberEditMemo(event.target.value)}
              />
            </label>

            <button
              className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
              type="submit"
            >
              길드원 정보 저장
            </button>
          </form>
        </section>
      ) : null}

      <section className="space-y-4" ref={activityFormRef}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-neutral-900">
            {isEditingActivity ? "활동 기록 수정" : "활동 기록 추가"}
          </h2>
          {isEditingActivity ? (
            <button
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
              type="button"
              onClick={resetActivityForm}
            >
              수정 취소
            </button>
          ) : null}
        </div>
        <form
          className="space-y-4 rounded-md border border-neutral-200 p-4"
          onPaste={handleActivityImagePaste}
          onSubmit={handleSubmitActivity}
        >
          {isEditingActivity ? (
            <p className="rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
              {editingActivity?.title || "선택한 활동 기록"}을 수정 중입니다.
            </p>
          ) : null}
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
            {selectableMembers.length === 0 ? (
              <p className="rounded-md border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500">
                먼저 활동중 길드원을 등록하면 참여자를 선택할 수 있습니다.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-neutral-500">
                    활동중 길드원
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectableActiveMembers.map((member) => (
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
                    <span className="text-xs text-neutral-400">
                      {participationCounts[member.id] ?? 0}회
                    </span>
                    {member.status === "left" ? (
                      <span className="ml-auto text-xs text-neutral-400">
                        탈퇴
                      </span>
                    ) : null}
                  </label>
                ))}
              </div>
                </div>

                {selectableLeftMembers.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-neutral-500">
                      탈퇴 길드원
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {selectableLeftMembers.map((member) => (
                        <label
                          className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-500"
                          key={member.id}
                        >
                          <input
                            className="size-4"
                            type="checkbox"
                            checked={selectedMemberIds.includes(member.id)}
                            onChange={() => handleToggleParticipant(member.id)}
                          />
                          <span className="truncate">{member.nickname}</span>
                          <span className="text-xs text-neutral-400">
                            {participationCounts[member.id] ?? 0}회
                          </span>
                          <span className="ml-auto text-xs text-neutral-400">
                            탈퇴
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
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

          <div className="space-y-2">
            <label className="block space-y-1 text-sm font-medium text-neutral-700">
              <span>참고 스크린샷</span>
              <input
                ref={imageInputRef}
                className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-neutral-950 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
                type="file"
                accept="image/*"
                onChange={handleActivityImageChange}
              />
            </label>
            <p className="text-xs text-neutral-500">
              선택한 이미지는 최대 너비 {MAX_IMAGE_WIDTH}px 이하의 JPEG로 압축해
              저장합니다.
            </p>
            <p className="text-xs text-neutral-500">
              디스코드 이미지 복사 후 이 활동 기록 폼 안에서 Ctrl+V로 첨부할 수
              있습니다.
            </p>
            {activityImageError ? (
              <p className="text-sm text-red-600">{activityImageError}</p>
            ) : null}
            {activityImageDataUrl ? (
              <div className="space-y-2 rounded-md border border-neutral-200 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="첨부 스크린샷 미리보기"
                  className="max-h-64 rounded-md border border-neutral-200 object-contain"
                  src={activityImageDataUrl}
                />
                <button
                  className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:border-red-700"
                  type="button"
                  onClick={handleRemoveActivityImage}
                >
                  첨부 이미지 제거
                </button>
              </div>
            ) : null}
          </div>

          <button
            className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
            type="submit"
          >
            {isEditingActivity ? "활동 기록 수정" : "활동 기록 저장"}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">
              길드원별 활동 이력
            </h2>
            <p className="text-sm text-neutral-500">
              탈퇴한 길드원도 선택해서 과거 참여 기록을 확인합니다.
            </p>
          </div>
          {selectedHistoryMember ? (
            <button
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
              type="button"
              onClick={() => setHistoryMemberId(null)}
            >
              선택 해제
            </button>
          ) : null}
        </div>

        {!selectedHistoryMember ? (
          <p className="rounded-md border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500">
            &#44600;&#46300;&#50896; &#52852;&#46300;&#51032; &#54876;&#46041; &#51060;&#47141; &#48372;&#44592; &#48260;&#53948;&#51012; &#45580;&#47084; &#52280;&#50668; &#44592;&#47197;&#51012; &#54869;&#51064;&#54616;&#49464;&#50836;.
          </p>
        ) : null}

        {selectedHistoryMember ? (
          <div className="space-y-3 rounded-md border border-neutral-200 p-4">
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-neutral-950">
                    {selectedHistoryMember.nickname}
                  </h3>
                  <span className="rounded-sm bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                    {memberStatusLabels[selectedHistoryMember.status]}
                  </span>
                </div>
                <button
                  className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
                  type="button"
                  onClick={() => handleEditMember(selectedHistoryMember)}
                >
                  정보 수정
                </button>
              </div>
              <p className="text-sm text-neutral-500">
                가입일 {selectedHistoryMember.joinedAt}
                {selectedHistoryMember.leftAt
                  ? ` · 탈퇴일 ${selectedHistoryMember.leftAt}`
                  : ""}
              </p>
              {selectedHistoryMember.memo ? (
                <p className="text-sm text-neutral-600">
                  {selectedHistoryMember.memo}
                </p>
              ) : null}
            </div>

            {selectedMemberActivities.length === 0 ? (
              <p className="rounded-md border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500">
                이 길드원이 참여한 활동 기록이 없습니다.
              </p>
            ) : (
              <ul className="space-y-2">
                {selectedMemberActivities.map((activity) => (
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
                    <h4 className="mt-1 text-sm font-semibold text-neutral-950">
                      {activity.title || activityTypeLabels[activity.type]}
                    </h4>
                    {activity.memo ? (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-500">
                        {activity.memo}
                      </p>
                    ) : null}
                    {activity.imageDataUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        alt="첨부 스크린샷"
                        className="mt-3 max-h-40 rounded-md border border-neutral-200 object-contain"
                        src={activity.imageDataUrl}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
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
                    {activity.imageDataUrl ? (
                      <span className="rounded-sm bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                        이미지 첨부
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <h3 className="text-sm font-semibold text-neutral-950">
                      {activity.title || activityTypeLabels[activity.type]}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
                        type="button"
                        onClick={() => handleEditActivity(activity)}
                      >
                        수정
                      </button>
                      <button
                        className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-700 transition hover:border-red-700"
                        type="button"
                        onClick={() => handleDeleteActivity(activity.id)}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
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
                  {activity.imageDataUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      alt="첨부 스크린샷"
                      className="mt-3 max-h-40 rounded-md border border-neutral-200 object-contain"
                      src={activity.imageDataUrl}
                    />
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
