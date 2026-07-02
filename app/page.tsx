"use client";

import {
  ChangeEvent,
  ClipboardEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  ActivityLog,
  ActivityType,
  AirshipType,
  ConquestType,
  GuildArchiveBackup,
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
  deleteMember,
  getMembers,
  markMemberAsLeft,
  updateMember,
} from "@/src/lib/members";
import { writeStorageList } from "@/src/lib/storage";
import {
  createBackup,
  restoreBackup,
  validateBackupData,
} from "@/src/lib/backup";
import { getMemberActivityStats } from "@/src/lib/activityStats";
import {
  conquestTypes,
  getKnownConquestTypes,
  getSiegeActivityLabel,
} from "@/src/lib/activityLabels";
import { matchesMemberKeyword } from "@/src/lib/koreanSearch";
import {
  getAvailableActivityMonths,
  getDefaultReportMonth,
  getMonthlyReport,
} from "@/src/lib/monthlyReport";

type VisibleActivityType = "airship" | "siege" | "other";
type ActivityFilter = "all" | VisibleActivityType;
type ActivitySortOrder = "latest" | "oldest";
type MemberMemoClearScope = "active" | "left" | "all";
type RestoreLeftMembersResult = {
  restored: number;
};
type MemberMemoClearResult = {
  cleared: number;
};
type BackupImportState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "valid"; backup: GuildArchiveBackup; warnings: string[] };

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
  other: "기타",
};

const visibleActivityTypes: VisibleActivityType[] = ["siege", "airship", "other"];

const airshipTypeLabels: Record<AirshipType, string> = {
  ocean: "오션헤븐",
  aurora: "아우로라",
};

const activityTitlePresets: Partial<Record<VisibleActivityType, string[]>> = {
  siege: ["점령전 참여", "점령전 미참여"],
};

const airshipAutoTitles: Record<AirshipType, string> = {
  ocean: "오션헤븐 비공정",
  aurora: "아우로라 비공정",
};

const activityFilterLabels: Record<ActivityFilter, string> = {
  all: "전체",
  airship: activityTypeLabels.airship,
  siege: activityTypeLabels.siege,
  other: "기타",
};

const activitySortOrderLabels: Record<ActivitySortOrder, string> = {
  latest: "최신순",
  oldest: "오래된순",
};

const memberStatusLabels: Record<GuildMemberStatus, string> = {
  active: "활동중",
  left: "탈퇴",
};

const memberMemoClearScopeLabels: Record<MemberMemoClearScope, string> = {
  active: "활동중 길드원",
  left: "탈퇴 길드원",
  all: "전체 길드원",
};

function getVisibleActivityType(type: ActivityType): VisibleActivityType {
  if (type === "airship" || type === "siege") {
    return type;
  }

  return "other";
}

function getActivityTypeLabel(activity: ActivityLog) {
  if (getVisibleActivityType(activity.type) === "siege") {
    return getSiegeActivityLabel(activity);
  }

  return activityTypeLabels[getVisibleActivityType(activity.type)];
}

function getKnownAirshipType(airshipType: unknown): AirshipType | undefined {
  return airshipType === "ocean" || airshipType === "aurora"
    ? airshipType
    : undefined;
}

function getAirshipTypeLabel(airshipType: unknown) {
  const knownAirshipType = getKnownAirshipType(airshipType);
  return knownAirshipType ? airshipTypeLabels[knownAirshipType] : "";
}

function getAirshipAutoTitle(airshipType: AirshipType) {
  return airshipAutoTitles[airshipType];
}

function getMemberActivityStatsSummary(
  activities: ActivityLog[],
  memberId: string,
) {
  const stats = getMemberActivityStats(activities, memberId);

  return `총 ${stats.total}회 · 점령전 ${stats.siege} · 비공정 ${stats.airship} · 기타 ${stats.other}`;
}

function getParticipantActivityCountLabel(
  activities: ActivityLog[],
  memberId: string,
  activityType: VisibleActivityType,
) {
  const stats = getMemberActivityStats(activities, memberId);

  if (activityType === "siege") {
    return `점령전 ${stats.siege}회`;
  }

  if (activityType === "airship") {
    return `비공정 ${stats.airship}회`;
  }

  return `기타 ${stats.other}회`;
}

let cachedMembersValue: string | null = null;
let cachedMembersSnapshot: GuildMember[] = EMPTY_MEMBERS;
let cachedActivitiesValue: string | null = null;
let cachedActivitiesSnapshot: ActivityLog[] = EMPTY_ACTIVITIES;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-");
  return year && monthNumber ? `${year}년 ${Number(monthNumber)}월` : month;
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

function findMemberByNickname(
  members: GuildMember[],
  nickname: string,
  excludeMemberId?: string,
) {
  const normalizedNickname = nickname.trim().toLowerCase();

  return members.find(
    (member) =>
      member.id !== excludeMemberId &&
      member.nickname.trim().toLowerCase() === normalizedNickname,
  );
}

function memberHasActivityRecords(activities: ActivityLog[], memberId: string) {
  return activities.some((activity) => activity.participantIds.includes(memberId));
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

function readFileAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("파일을 읽지 못했습니다."));
      }
    };
    reader.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
    reader.readAsText(file);
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
  const [activityType, setActivityType] = useState<VisibleActivityType>("airship");
  const [activityAirshipType, setActivityAirshipType] =
    useState<AirshipType>("ocean");
  const [activityConquestTypes, setActivityConquestTypes] = useState<
    ConquestType[]
  >([]);
  const [activityTitle, setActivityTitle] = useState("");
  const [activityMemo, setActivityMemo] = useState("");
  const [activityImageDataUrl, setActivityImageDataUrl] = useState("");
  const [activityImageError, setActivityImageError] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [participantSearch, setParticipantSearch] = useState("");
  const [isParticipantActiveOpen, setIsParticipantActiveOpen] = useState(true);
  const [isParticipantLeftOpen, setIsParticipantLeftOpen] = useState(false);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [activitySortOrder, setActivitySortOrder] =
    useState<ActivitySortOrder>("latest");
  const [activityFeedbackMessage, setActivityFeedbackMessage] = useState("");
  const [editingActivityId, setEditingActivityId] = useState<string | null>(
    null,
  );
  const [historyMemberId, setHistoryMemberId] = useState<string | null>(null);
  const [expandedHistoryMemberId, setExpandedHistoryMemberId] = useState<
    string | null
  >(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberEditNickname, setMemberEditNickname] = useState("");
  const [memberEditStatus, setMemberEditStatus] =
    useState<GuildMemberStatus>("active");
  const [memberEditJoinedAt, setMemberEditJoinedAt] = useState("");
  const [memberEditLeftAt, setMemberEditLeftAt] = useState("");
  const [memberEditMemo, setMemberEditMemo] = useState("");
  const [memberFeedbackMessage, setMemberFeedbackMessage] = useState("");
  const [restoreLeftMembersResult, setRestoreLeftMembersResult] =
    useState<RestoreLeftMembersResult | null>(null);
  const [memberMemoClearScope, setMemberMemoClearScope] =
    useState<MemberMemoClearScope>("all");
  const [memberMemoClearResult, setMemberMemoClearResult] =
    useState<MemberMemoClearResult | null>(null);
  const [selectedReportMonth, setSelectedReportMonth] = useState("");
  const [backupFeedbackMessage, setBackupFeedbackMessage] = useState("");
  const [backupImportState, setBackupImportState] = useState<BackupImportState>({
    status: "idle",
  });
  const [restoreResultMessage, setRestoreResultMessage] = useState("");
  const [isDataToolsOpen, setIsDataToolsOpen] = useState(false);
  const [isActiveMembersOpen, setIsActiveMembersOpen] = useState(true);
  const [isLeftMembersOpen, setIsLeftMembersOpen] = useState(false);
  const activityFormRef = useRef<HTMLElement>(null);
  const memberFormRef = useRef<HTMLElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);
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
  const selectableMembers = [...members].sort((a, b) => {
      const countOrder =
        (participationCounts[b.id] ?? 0) - (participationCounts[a.id] ?? 0);

      if (countOrder !== 0) {
        return countOrder;
      }

      return a.nickname.localeCompare(b.nickname, "ko");
    });
  const participantSearchKeyword = participantSearch.trim();
  const filteredSelectableMembers = participantSearchKeyword
    ? selectableMembers.filter((member) =>
        matchesMemberKeyword(member.nickname, participantSearchKeyword),
      )
    : selectableMembers;
  const selectableActiveMembers = filteredSelectableMembers.filter(
    (member) => member.status === "active",
  );
  const selectableLeftMembers = filteredSelectableMembers.filter(
    (member) => member.status === "left",
  );
  const hasParticipantSearch = participantSearchKeyword.length > 0;
  const shouldShowActiveParticipants =
    isParticipantActiveOpen || hasParticipantSearch;
  const shouldShowLeftParticipants =
    isParticipantLeftOpen ||
    (hasParticipantSearch && selectableLeftMembers.length > 0);
  const selectedHistoryMember =
    members.find((member) => member.id === historyMemberId) ?? null;
  const memberNamesById = new Map(
    members.map((member) => [member.id, member.nickname]),
  );
  const availableReportMonths = getAvailableActivityMonths(activities);
  const defaultReportMonth = getDefaultReportMonth(activities, today());
  const reportMonth = selectedReportMonth || defaultReportMonth;
  const reportMonthOptions = availableReportMonths.includes(reportMonth)
    ? availableReportMonths
    : [reportMonth, ...availableReportMonths].filter(Boolean);
  const monthlyReport = getMonthlyReport(activities, members, reportMonth);
  const sortedActivities = [...activities].sort((a, b) => {
    const dateOrder =
      activitySortOrder === "latest"
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date);

    if (dateOrder !== 0) {
      return dateOrder;
    }

    return activitySortOrder === "latest"
      ? b.id.localeCompare(a.id)
      : a.id.localeCompare(b.id);
  });
  const filteredActivities =
    activityFilter === "all"
      ? sortedActivities
      : sortedActivities.filter(
          (activity) => getVisibleActivityType(activity.type) === activityFilter,
        );
  const selectedMemberActivities = selectedHistoryMember
    ? sortedActivities.filter((activity) =>
        activity.participantIds.includes(selectedHistoryMember.id),
      )
    : [];
  const quickActivityTitles = activityTitlePresets[activityType] ?? [];

  useEffect(() => {
    if (!activityFeedbackMessage) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setActivityFeedbackMessage("");
    }, 3500);

    return () => window.clearTimeout(timerId);
  }, [activityFeedbackMessage]);

  useEffect(() => {
    if (!memberFeedbackMessage) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setMemberFeedbackMessage("");
    }, 3500);

    return () => window.clearTimeout(timerId);
  }, [memberFeedbackMessage]);

  useEffect(() => {
    if (!backupFeedbackMessage) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setBackupFeedbackMessage("");
    }, 3500);

    return () => window.clearTimeout(timerId);
  }, [backupFeedbackMessage]);

  useEffect(() => {
    if (!restoreResultMessage) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setRestoreResultMessage("");
    }, 3500);

    return () => window.clearTimeout(timerId);
  }, [restoreResultMessage]);

  const clearImageInput = () => {
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const resetActivityForm = () => {
    setActivityDate(today());
    setActivityType("airship");
    setActivityAirshipType("ocean");
    setActivityConquestTypes([]);
    setActivityTitle("");
    setActivityMemo("");
    setActivityImageDataUrl("");
    setActivityImageError("");
    setSelectedMemberIds([]);
    setParticipantSearch("");
    setIsParticipantActiveOpen(true);
    setIsParticipantLeftOpen(false);
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

    if (findMemberByNickname(members, trimmedNickname)) {
      setMemberFeedbackMessage(
        "이미 같은 닉네임의 길드원이 있습니다.",
      );
      return;
    }

    addMember({ nickname: trimmedNickname });
    setNickname("");
    setMemberFeedbackMessage("");
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
    setExpandedHistoryMemberId((currentMemberId) =>
      currentMemberId === memberId ? null : memberId,
    );
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

  const handleClearMemberMemos = () => {
    const currentMembers = getMembers();
    const isInScope = (member: GuildMember) =>
      memberMemoClearScope === "all" || member.status === memberMemoClearScope;
    const membersWithMemo = currentMembers.filter(
      (member) => isInScope(member) && Boolean(member.memo?.trim()),
    );

    if (membersWithMemo.length === 0) {
      setMemberMemoClearResult({ cleared: 0 });
      return;
    }

    const scopeLabel = memberMemoClearScopeLabels[memberMemoClearScope];
    const shouldClear = window.confirm(
      `${scopeLabel} 메모를 모두 삭제하시겠습니까?`,
    );

    if (!shouldClear) {
      return;
    }

    const nextMembers = currentMembers.map((member) =>
      isInScope(member) && member.memo?.trim()
        ? {
            ...member,
            memo: undefined,
          }
        : member,
    );

    writeStorageList(MEMBERS_STORAGE_KEY, nextMembers);
    setMemberMemoClearResult({ cleared: membersWithMemo.length });
    notifyMembersChanged();
  };

  const handleExportBackup = () => {
    const backup = createBackup(members, activities);
    const backupJson = JSON.stringify(backup, null, 2);
    const blob = new Blob([backupJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `nyangchun-archive-backup-${today()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setBackupFeedbackMessage("JSON 백업 파일을 내보냈습니다.");
  };

  const handleBackupFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setRestoreResultMessage("");

    try {
      const fileText = await readFileAsText(file);
      let parsedData: unknown;

      try {
        parsedData = JSON.parse(fileText);
      } catch {
        setBackupImportState({
          status: "error",
          message: "JSON 형식이 올바르지 않아 파일을 읽을 수 없습니다.",
        });
        return;
      }

      const validationResult = validateBackupData(parsedData);

      if (!validationResult.valid) {
        setBackupImportState({
          status: "error",
          message: validationResult.error,
        });
        return;
      }

      setBackupImportState({
        status: "valid",
        backup: validationResult.backup,
        warnings: validationResult.warnings,
      });
    } catch {
      setBackupImportState({
        status: "error",
        message: "백업 파일을 읽는 중 문제가 발생했습니다.",
      });
    } finally {
      if (backupFileInputRef.current) {
        backupFileInputRef.current.value = "";
      }
    }
  };

  const handleCancelBackupImport = () => {
    setBackupImportState({ status: "idle" });
  };

  const handleRestoreBackup = () => {
    if (backupImportState.status !== "valid") {
      return;
    }

    const { backup } = backupImportState;

    const shouldContinue = window.confirm(
      "현재 데이터를 백업 파일 내용으로 교체합니다.\n복원 전 현재 데이터를 백업해두는 것을 권장합니다.\n계속하시겠습니까?",
    );

    if (!shouldContinue) {
      return;
    }

    const shouldRestore = window.confirm(
      "정말 복원하시겠습니까?\n현재 길드원과 활동 기록이 백업 파일 내용으로 덮어써집니다.",
    );

    if (!shouldRestore) {
      return;
    }

    restoreBackup(backup);
    notifyMembersChanged();
    notifyActivitiesChanged();
    setBackupImportState({ status: "idle" });
    setRestoreResultMessage(
      `복원이 완료되었습니다. 길드원 ${backup.members.length}명, 활동 기록 ${backup.activityLogs.length}개를 복원했습니다.`,
    );
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

    if (findMemberByNickname(members, trimmedNickname, editingMemberId)) {
      setMemberFeedbackMessage(
        "이미 같은 닉네임의 길드원이 있습니다.",
      );
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
    setMemberFeedbackMessage("");
    notifyMembersChanged();
  };

  const clearMemberReferences = (memberId: string) => {
    if (editingMemberId === memberId) {
      resetMemberForm();
    }

    if (historyMemberId === memberId) {
      setHistoryMemberId(null);
    }

    if (expandedHistoryMemberId === memberId) {
      setExpandedHistoryMemberId(null);
    }

    setSelectedMemberIds((currentIds) =>
      currentIds.filter((selectedMemberId) => selectedMemberId !== memberId),
    );
  };

  const handleDeleteMember = (memberId: string) => {
    if (memberHasActivityRecords(activities, memberId)) {
      setMemberFeedbackMessage(
        "활동 기록이 있는 길드원은 삭제할 수 없습니다.",
      );
      return;
    }

    const shouldDelete = window.confirm(
      "정말 이 길드원을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
    );

    if (!shouldDelete) {
      return;
    }

    deleteMember(memberId);
    clearMemberReferences(memberId);
    setMemberFeedbackMessage("길드원을 삭제했습니다.");
    notifyMembersChanged();
  };

  const handleToggleParticipant = (memberId: string) => {
    setSelectedMemberIds((currentIds) =>
      currentIds.includes(memberId)
        ? currentIds.filter((selectedMemberId) => selectedMemberId !== memberId)
        : [...currentIds, memberId],
    );
  };

  const handleSelectAirshipPreset = (airshipType: AirshipType) => {
    setActivityAirshipType(airshipType);
    setActivityTitle(getAirshipAutoTitle(airshipType));
  };

  const handleToggleConquestType = (conquestType: ConquestType) => {
    setActivityConquestTypes((currentTypes) =>
      currentTypes.includes(conquestType)
        ? currentTypes.filter((currentType) => currentType !== conquestType)
        : [...currentTypes, conquestType],
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

  const renderMemberActivityPreview = (member: GuildMember) => {
    const stats = getMemberActivityStats(activities, member.id);

    return (
      <div className="mt-3 space-y-3 border-t border-neutral-200 pt-3">
        <div className="grid gap-2 text-xs text-neutral-600 sm:grid-cols-2">
          <p>총 참여 {stats.total}회</p>
          <p>점령전 {stats.siege}회</p>
          <p>비공정 {stats.airship}회</p>
          <p>기타 {stats.other}회</p>
          <p>오션헤븐 {stats.airshipOcean}회</p>
          <p>아우로라 {stats.airshipAurora}회</p>
        </div>
      </div>
    );
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
      airshipType: activityType === "airship" ? activityAirshipType : undefined,
      conquestTypes:
        activityType === "siege" && activityConquestTypes.length > 0
          ? activityConquestTypes
          : undefined,
      title: activityTitle.trim() || undefined,
      participantIds: selectedMemberIds,
      memo: activityMemo.trim() || undefined,
      imageDataUrl: activityImageDataUrl || undefined,
    };

    const wasEditingActivity = Boolean(editingActivityId);

    if (editingActivityId) {
      updateActivityLog(editingActivityId, activityData);
    } else {
      addActivityLog(activityData);
    }

    resetActivityForm();
    setActivityFeedbackMessage(
      wasEditingActivity
        ? "활동 기록을 수정했습니다."
        : "활동 기록을 추가했습니다.",
    );
    notifyActivitiesChanged();
  };

  const handleEditActivity = (activity: ActivityLog) => {
    setEditingActivityId(activity.id);
    setActivityDate(activity.date);
    setActivityType(getVisibleActivityType(activity.type));
    setActivityAirshipType(getKnownAirshipType(activity.airshipType) ?? "ocean");
    setActivityConquestTypes(getKnownConquestTypes(activity.conquestTypes));
    setActivityTitle(activity.title ?? "");
    setActivityMemo(activity.memo ?? "");
    setActivityImageDataUrl(activity.imageDataUrl ?? "");
    setActivityImageError("");
    setSelectedMemberIds(activity.participantIds);
    setParticipantSearch("");
    setIsParticipantActiveOpen(true);
    setIsParticipantLeftOpen(
      members.some(
        (member) =>
          member.status === "left" && activity.participantIds.includes(member.id),
      ),
    );
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

    setActivityFeedbackMessage("활동 기록을 삭제했습니다.");
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

      <section className="space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-4">
        <h2 className="text-lg font-semibold text-neutral-900">
          월별 정산 설정
        </h2>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700 sm:max-w-xs">
          <span>월 선택</span>
          <select
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-900"
            value={reportMonth}
            onChange={(event) => setSelectedReportMonth(event.target.value)}
          >
            {reportMonthOptions.map((month) => (
              <option key={month} value={month}>
                {getMonthLabel(month)}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="space-y-4 rounded-md border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-neutral-950">
            냥춘 {getMonthLabel(reportMonth)} 활동 정산
          </h2>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-md bg-neutral-100 px-4 py-3 text-neutral-950">
            <p className="text-xs text-neutral-500">전체 활동</p>
            <p className="text-2xl font-bold">
              {monthlyReport.totalActivities}회
            </p>
          </div>
          <div className="rounded-md bg-neutral-950 px-4 py-3 text-white">
            <p className="text-xs text-neutral-300">참여 길드원</p>
            <p className="text-2xl font-bold">
              {monthlyReport.participantMemberCount}명
            </p>
          </div>
          <div className="rounded-md bg-neutral-100 px-4 py-3 text-neutral-950">
            <p className="text-xs text-neutral-500">총 참여 횟수</p>
            <p className="text-2xl font-bold">
              {monthlyReport.totalParticipationCount}회
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-neutral-200 p-4">
            <h3 className="text-sm font-semibold text-neutral-900">
              활동 종류별 통계
            </h3>
            <dl
              className={`mt-3 grid gap-2 text-center text-sm ${
                monthlyReport.otherCount > 0 ? "grid-cols-3" : "grid-cols-2"
              }`}
            >
              <div className="rounded-md bg-neutral-100 px-3 py-2">
                <dt className="text-neutral-500">비공정</dt>
                <dd className="font-semibold text-neutral-950">
                  {monthlyReport.airshipCount}회
                </dd>
              </div>
              <div className="rounded-md bg-neutral-100 px-3 py-2">
                <dt className="text-neutral-500">점령전</dt>
                <dd className="font-semibold text-neutral-950">
                  {monthlyReport.siegeCount}회
                </dd>
              </div>
              {monthlyReport.otherCount > 0 ? (
                <div className="rounded-md bg-neutral-100 px-3 py-2">
                  <dt className="text-neutral-500">기타</dt>
                  <dd className="font-semibold text-neutral-950">
                    {monthlyReport.otherCount}회
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="rounded-md border border-neutral-200 p-4">
            <h3 className="text-sm font-semibold text-neutral-900">
              비공정 세부 통계
            </h3>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
              <div className="rounded-md bg-neutral-100 px-3 py-2">
                <dt className="text-neutral-500">오션헤븐</dt>
                <dd className="font-semibold text-neutral-950">
                  {monthlyReport.oceanAirshipCount}회
                </dd>
              </div>
              <div className="rounded-md bg-neutral-100 px-3 py-2">
                <dt className="text-neutral-500">아우로라</dt>
                <dd className="font-semibold text-neutral-950">
                  {monthlyReport.auroraAirshipCount}회
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-md border border-neutral-200 p-4">
            <h3 className="text-sm font-semibold text-neutral-900">
              {monthlyReport.topParticipants.length > 0
                ? `월간 참여 TOP ${monthlyReport.topParticipants.length}`
                : "월간 참여 TOP"}
            </h3>
            {monthlyReport.topParticipants.length === 0 ? (
              <p className="mt-3 rounded-md border border-dashed border-neutral-300 px-3 py-5 text-center text-sm text-neutral-500">
                이 달의 참여 기록이 없습니다.
              </p>
            ) : (
              <ol className="mt-3 space-y-2">
                {monthlyReport.topParticipants.map((participant, index) => (
                  <li
                    className="flex items-center justify-between gap-3 rounded-md bg-neutral-100 px-3 py-2 text-sm"
                    key={participant.memberId}
                  >
                    <span className="min-w-0 truncate font-medium text-neutral-900">
                      {index + 1}. {participant.nickname}
                    </span>
                    <span className="shrink-0 font-semibold text-neutral-950">
                      {participant.count}회
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="rounded-md border border-neutral-200 p-4">
            <h3 className="text-sm font-semibold text-neutral-900">
              이번 달 활동 기록
            </h3>
            {monthlyReport.activitySummaries.length === 0 ? (
              <p className="mt-3 rounded-md border border-dashed border-neutral-300 px-3 py-5 text-center text-sm text-neutral-500">
                선택한 월에 저장된 활동 기록이 없습니다.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-neutral-200">
                {monthlyReport.activitySummaries.map((activity) => (
                  <li
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                    key={activity.id}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-neutral-900">
                        {activity.displayDate} {activity.label}
                      </span>
                      {activity.isMostParticipated ? (
                        <span className="shrink-0 rounded-sm bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-700">
                          최다 참여
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-neutral-500">
                      {activity.participantCount}명
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-neutral-900">
            데이터 관리 도구
          </h2>
          <button
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
            type="button"
            onClick={() => setIsDataToolsOpen((value) => !value)}
          >
            {isDataToolsOpen ? "접기" : "펼치기"}
          </button>
        </div>

        {isDataToolsOpen ? (
          <div className="space-y-5 rounded-md border border-neutral-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              길드원 관리
            </p>

            <div className="space-y-3">
              <div>
                <h3 className="text-base font-semibold text-neutral-900">
                  새 길드원 등록
                </h3>
                <p className="text-sm text-neutral-500">
                  닉네임을 입력해 새 길드원을 등록합니다.
                </p>
              </div>
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
              {memberFeedbackMessage ? (
                <p className="rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
                  {memberFeedbackMessage}
                </p>
              ) : null}
            </div>

            <div className="space-y-3 border-t border-neutral-200 pt-4">
              <h3 className="text-base font-semibold text-neutral-900">
                메모 일괄 삭제
              </h3>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                  <span>메모 삭제 범위</span>
                  <select
                    className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none transition focus:border-neutral-900"
                    value={memberMemoClearScope}
                    onChange={(event) => {
                      setMemberMemoClearScope(
                        event.target.value as MemberMemoClearScope,
                      );
                      setMemberMemoClearResult(null);
                    }}
                  >
                    <option value="active">활동중</option>
                    <option value="left">탈퇴</option>
                    <option value="all">전체</option>
                  </select>
                </label>
                <button
                  className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-700"
                  type="button"
                  onClick={handleClearMemberMemos}
                >
                  메모 일괄 삭제
                </button>
              </div>
              {memberMemoClearResult ? (
                <p className="rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
                  {memberMemoClearResult.cleared === 0
                    ? "삭제할 메모가 없습니다."
                    : `총 ${memberMemoClearResult.cleared}명의 메모를 삭제했습니다.`}
                </p>
              ) : null}
            </div>

            <div className="space-y-3 border-t border-neutral-200 pt-4">
              <h3 className="text-base font-semibold text-neutral-900">
                탈퇴 길드원 복구
              </h3>
              {leftMembers.length > 0 ? (
                <button
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
                  type="button"
                  onClick={handleRestoreLeftMembers}
                >
                  탈퇴 길드원 {leftMembers.length}명 활동중으로 복구
                </button>
              ) : (
                <p className="rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
                  복구할 탈퇴 길드원이 없습니다.
                </p>
              )}
              {restoreLeftMembersResult ? (
                <p className="rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
                  {restoreLeftMembersResult.restored}명을 활동중으로 복구했습니다.
                </p>
              ) : null}
              <p className="text-xs text-neutral-500">
                활동 기록이 없는 길드원은 아래 길드원 관리 목록의 삭제 버튼으로
                제거할 수 있습니다. 활동 기록이 있는 길드원은 삭제할 수 없습니다.
              </p>
            </div>

            <div className="space-y-3 border-t border-neutral-200 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                백업 / 복원
              </p>
              <div>
                <h3 className="text-base font-semibold text-neutral-900">
                  JSON 백업 내보내기
                </h3>
                <p className="text-sm text-neutral-500">
                  전체 길드원과 활동 기록을 JSON 파일로 저장합니다.
                </p>
              </div>
              <button
                className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
                type="button"
                onClick={handleExportBackup}
              >
                전체 데이터 JSON 백업
              </button>
              {backupFeedbackMessage ? (
                <p className="rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
                  {backupFeedbackMessage}
                </p>
              ) : null}
            </div>

            <div className="space-y-3 border-t border-neutral-200 pt-4">
              <div>
                <h3 className="text-base font-semibold text-neutral-900">
                  JSON 백업 가져오기
                </h3>
                <p className="text-sm text-neutral-500">
                  백업 파일(.json)을 선택하면 먼저 내용을 확인한 뒤 복원할 수
                  있습니다.
                </p>
              </div>
              <input
                ref={backupFileInputRef}
                className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-neutral-950 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
                type="file"
                accept="application/json,.json"
                onChange={handleBackupFileChange}
              />
              {backupImportState.status === "error" ? (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {backupImportState.message}
                </p>
              ) : null}
              {backupImportState.status === "valid" ? (
                <div className="space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-4">
                  <div className="space-y-1 text-sm text-neutral-700">
                    <p className="font-semibold text-neutral-900">
                      백업 파일 확인 결과
                    </p>
                    <p>앱: 냥춘 길드 활동 아카이브</p>
                    <p>버전: {backupImportState.backup.appVersion || "알 수 없음"}</p>
                    <p>
                      백업 시각: {backupImportState.backup.exportedAt || "알 수 없음"}
                    </p>
                    <p>길드원: {backupImportState.backup.members.length}명</p>
                    <p>
                      활동 기록: {backupImportState.backup.activityLogs.length}개
                    </p>
                  </div>
                  {backupImportState.warnings.length > 0 ? (
                    <div className="space-y-1 border-t border-neutral-200 pt-2 text-sm text-amber-700">
                      <p className="font-medium">확인이 필요한 항목</p>
                      <ul className="list-disc space-y-1 pl-4">
                        {backupImportState.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <p className="text-sm text-neutral-600">
                    이 백업을 복원하면 현재 데이터가 백업 파일 내용으로
                    교체됩니다. 복원 전 현재 데이터를 다시 백업해두는 것을
                    권장합니다.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
                      type="button"
                      onClick={handleRestoreBackup}
                    >
                      이 백업으로 복원
                    </button>
                    <button
                      className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
                      type="button"
                      onClick={handleCancelBackupImport}
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : null}
              {restoreResultMessage ? (
                <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                  {restoreResultMessage}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 border-t border-neutral-200 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                주의사항
              </p>
              <ul className="list-disc space-y-1 rounded-md bg-neutral-50 px-4 py-3 pl-8 text-sm text-neutral-600">
                <li>LocalStorage 기반이라 정기 백업을 권장합니다.</li>
                <li>복원 시 현재 데이터가 백업 파일 내용으로 덮어써집니다.</li>
              </ul>
            </div>
          </div>
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

        {memberFeedbackMessage ? (
          <p className="rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
            {memberFeedbackMessage}
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
                    className="flex flex-col gap-3 px-4 py-3"
                    key={member.id}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-neutral-950">
                          {member.nickname}
                        </p>
                        {member.joinedAt ? (
                          <p className="text-xs text-neutral-500">
                            &#44032;&#51077;&#51068; {member.joinedAt}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-neutral-500">
                          {getMemberActivityStatsSummary(activities, member.id)}
                        </p>
                        {member.memo ? (
                          <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">
                            {member.memo}
                          </p>
                        ) : null}
                        {expandedHistoryMemberId === member.id
                          ? renderMemberActivityPreview(member)
                          : null}
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
                          {expandedHistoryMemberId === member.id
                            ? "이력 접기"
                            : "활동 이력 보기"}
                        </button>
                        <button
                          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
                          type="button"
                          onClick={() => handleLeaveMember(member.id)}
                        >
                          &#53448;&#53748; &#52376;&#47532;
                        </button>
                        <button
                          className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:border-red-700"
                          type="button"
                          onClick={() => handleDeleteMember(member.id)}
                        >
                          삭제
                        </button>
                      </div>
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
                    className="flex flex-col gap-3 px-4 py-3"
                    key={member.id}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                        <p className="mt-1 text-xs text-neutral-500">
                          {getMemberActivityStatsSummary(activities, member.id)}
                        </p>
                        {member.memo ? (
                          <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-500">
                            {member.memo}
                          </p>
                        ) : null}
                        {expandedHistoryMemberId === member.id
                          ? renderMemberActivityPreview(member)
                          : null}
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
                          {expandedHistoryMemberId === member.id
                            ? "이력 접기"
                            : "활동 이력 보기"}
                        </button>
                        <button
                          className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:border-red-700"
                          type="button"
                          onClick={() => handleDeleteMember(member.id)}
                        >
                          삭제
                        </button>
                      </div>
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

            {memberFeedbackMessage ? (
              <p className="rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
                {memberFeedbackMessage}
              </p>
            ) : null}

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
        {activityFeedbackMessage ? (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            {activityFeedbackMessage}
          </p>
        ) : null}
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
                onChange={(event) => {
                  const nextType = event.target.value as VisibleActivityType;
                  setActivityType(nextType);

                  if (nextType !== "airship") {
                    setActivityAirshipType("ocean");
                  }

                  if (nextType !== "siege") {
                    setActivityConquestTypes([]);
                  }
                }}
              >
                {visibleActivityTypes.map((value) => (
                  <option key={value} value={value}>
                    {activityTypeLabels[value]}
                  </option>
                ))}
              </select>
            </label>

            {activityType === "airship" ? (
              <div className="space-y-1 text-sm font-medium text-neutral-700">
                <p>비공정 빠른 입력</p>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(airshipAutoTitles).map((value) => {
                    const airshipType = value as AirshipType;
                    const isSelected = activityAirshipType === airshipType;

                    return (
                      <button
                        className={
                          isSelected
                            ? "rounded-md bg-neutral-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
                            : "rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
                        }
                        key={airshipType}
                        type="button"
                        onClick={() => handleSelectAirshipPreset(airshipType)}
                      >
                        {getAirshipAutoTitle(airshipType)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {activityType === "siege" ? (
              <div className="space-y-2 text-sm font-medium text-neutral-700 md:col-span-2">
                <p>점령전 세부 카테고리</p>
                <div className="grid grid-cols-3 gap-2">
                  {conquestTypes.map((conquestType) => {
                    const isSelected =
                      activityConquestTypes.includes(conquestType);

                    return (
                      <button
                        className={
                          isSelected
                            ? "rounded-md bg-neutral-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
                            : "rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
                        }
                        key={conquestType}
                        type="button"
                        onClick={() => handleToggleConquestType(conquestType)}
                      >
                        {conquestType}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          {quickActivityTitles.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-700">빠른 제목</p>
              <div className="flex flex-wrap gap-2">
                {quickActivityTitles.map((title) => (
                  <button
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
                    key={title}
                    type="button"
                    onClick={() => setActivityTitle(title)}
                  >
                    {title}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

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
            <legend className="space-x-2 text-sm font-medium text-neutral-700">
              <span>참여 길드원</span>
              <span className="text-xs font-semibold text-neutral-500">
                선택 {selectedMemberIds.length}명
              </span>
            </legend>
            {selectableMembers.length === 0 ? (
              <p className="rounded-md border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500">
                먼저 길드원을 등록하면 참여자를 선택할 수 있습니다.
              </p>
            ) : (
              <div className="space-y-4">
                <label className="block space-y-1 text-sm font-medium text-neutral-700">
                  <span>참여자 검색</span>
                  <input
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-neutral-900"
                    type="search"
                    placeholder="닉네임 검색"
                    value={participantSearch}
                    onChange={(event) => setParticipantSearch(event.target.value)}
                  />
                </label>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-neutral-500">
                      활동중 길드원 {activeMembers.length}명
                      {hasParticipantSearch
                        ? ` · 검색 ${selectableActiveMembers.length}명`
                        : ""}
                    </p>
                    <button
                      className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
                      type="button"
                      onClick={() =>
                        setIsParticipantActiveOpen((value) => !value)
                      }
                    >
                      {isParticipantActiveOpen ? "접기" : "펼치기"}
                    </button>
                  </div>
                  {shouldShowActiveParticipants ? (
                    selectableActiveMembers.length === 0 ? (
                      <p className="rounded-md border border-dashed border-neutral-300 px-3 py-3 text-sm text-neutral-500">
                        표시할 활동중 길드원이 없습니다.
                      </p>
                    ) : (
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
                              {getParticipantActivityCountLabel(
                                activities,
                                member.id,
                                activityType,
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    )
                  ) : null}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-neutral-500">
                      탈퇴 길드원 {leftMembers.length}명
                      {hasParticipantSearch
                        ? ` · 검색 ${selectableLeftMembers.length}명`
                        : ""}
                    </p>
                    <button
                      className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
                      type="button"
                      onClick={() => setIsParticipantLeftOpen((value) => !value)}
                    >
                      {isParticipantLeftOpen ? "접기" : "펼치기"}
                    </button>
                  </div>
                  {shouldShowLeftParticipants ? (
                    selectableLeftMembers.length === 0 ? (
                      <p className="rounded-md border border-dashed border-neutral-300 px-3 py-3 text-sm text-neutral-500">
                        표시할 탈퇴 길드원이 없습니다.
                      </p>
                    ) : (
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
                              {getParticipantActivityCountLabel(
                                activities,
                                member.id,
                                activityType,
                              )}
                            </span>
                            <span className="ml-auto text-xs text-neutral-400">
                              탈퇴
                            </span>
                          </label>
                        ))}
                      </div>
                    )
                  ) : null}
                </div>
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
                        {getActivityTypeLabel(activity)}
                      </span>
                      {getVisibleActivityType(activity.type) === "airship" &&
                      getAirshipTypeLabel(activity.airshipType) ? (
                        <span className="rounded-sm bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                          {getAirshipTypeLabel(activity.airshipType)}
                        </span>
                      ) : null}
                      <span className="rounded-sm bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                        참여 {activity.participantIds.length}명
                      </span>
                    </div>
                    <h4 className="mt-1 text-sm font-semibold text-neutral-950">
                      {activity.title || getActivityTypeLabel(activity)}
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
              {activitySortOrderLabels[activitySortOrder]}으로{" "}
              {filteredActivities.length}개 표시 중
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-neutral-700">
              <span>정렬</span>
              <select
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-neutral-900 sm:w-36"
                value={activitySortOrder}
                onChange={(event) =>
                  setActivitySortOrder(event.target.value as ActivitySortOrder)
                }
              >
                {Object.entries(activitySortOrderLabels).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </label>
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
                      {getActivityTypeLabel(activity)}
                    </span>
                    {getVisibleActivityType(activity.type) === "airship" &&
                    getAirshipTypeLabel(activity.airshipType) ? (
                      <span className="rounded-sm bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                        {getAirshipTypeLabel(activity.airshipType)}
                      </span>
                    ) : null}
                    <span className="rounded-sm bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                      참여 {activity.participantIds.length}명
                    </span>
                    {activity.imageDataUrl ? (
                      <span className="rounded-sm bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                        이미지 첨부
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <h3 className="text-sm font-semibold text-neutral-950">
                      {activity.title || getActivityTypeLabel(activity)}
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      <button
                        className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
                        type="button"
                        onClick={() => handleEditActivity(activity)}
                      >
                        수정
                      </button>
                      <button
                        className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-700"
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
