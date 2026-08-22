"use client";

import {
  ChangeEvent,
  FormEvent,
  MouseEvent as ReactMouseEvent,
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
  GuildMemberGender,
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
import { AppHeader } from "@/src/components/ui/AppHeader";
import { Pagination } from "@/src/components/ui/Pagination";
import {
  AdminSectionNav,
  type AdminSection,
} from "@/src/components/admin/AdminSectionNav";
import {
  MonthlyHighlightsAdmin,
  type MonthlyHighlightDraft,
} from "@/src/components/admin/MonthlyHighlightsAdmin";
import {
  conquestTypes,
  getKnownConquestTypes,
  getSiegeActivityLabel,
} from "@/src/lib/activityLabels";
import { matchesMemberKeyword } from "@/src/lib/koreanSearch";
import { formatDateRange } from "@/src/lib/displayFormat";
import {
  getAvailableActivityMonths,
  getDefaultReportMonth,
  getMonthlyReport,
  getMonthlyShareText,
} from "@/src/lib/monthlyReport";
import {
  getMemberDemographicsLabel,
  guildMemberGenderLabels,
  parseBirthYearInput,
} from "@/src/lib/memberDemographics";

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
type ServerImportState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "success";
      memberCount: number;
      activityCount: number;
      participantCount: number;
      conquestTypeCount: number;
    }
  | { status: "error"; message: string };

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
  other: "이벤트",
};

const visibleActivityTypes: VisibleActivityType[] = ["siege", "airship", "other"];

const airshipTypeLabels: Record<AirshipType, string> = {
  ocean: "오션헤븐",
  aurora: "아우로라",
};

const airshipAutoTitles: Record<AirshipType, string> = {
  ocean: "오션헤븐 비공정",
  aurora: "아우로라 비공정",
};

const activityFilterLabels: Record<ActivityFilter, string> = {
  all: "전체",
  airship: activityTypeLabels.airship,
  siege: activityTypeLabels.siege,
  other: "이벤트",
};

const activitySortOrderLabels: Record<ActivitySortOrder, string> = {
  latest: "최신순",
  oldest: "오래된순",
};

function getNextSiegeTitle(activities: ActivityLog[]) {
  const maxRound = activities.reduce((currentMax, activity) => {
    if (getVisibleActivityType(activity.type) !== "siege") {
      return currentMax;
    }

    const match = activity.title?.trim().match(/^(\d+)회차(?:\s|$)/);
    return match ? Math.max(currentMax, Number(match[1])) : currentMax;
  }, 0);

  return `${maxRound + 1}회차 점령전`;
}

const ACTIVITY_PAGE_SIZE = 12;
const MEMBER_PAGE_SIZE = 10;

type MemberMenuPosition = {
  bottom?: number;
  memberId: string;
  right: number;
  top?: number;
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

function openNativePicker(event: ReactMouseEvent<HTMLInputElement>) {
  try {
    event.currentTarget.showPicker?.();
  } catch {
    // Unsupported browsers keep the native date input behavior.
  }
}

function isSystemGeneratedActivityTitle(activity: ActivityLog) {
  const title = activity.title?.trim() ?? "";
  if (getVisibleActivityType(activity.type) === "airship") {
    return Object.values(airshipAutoTitles).includes(title);
  }
  return getVisibleActivityType(activity.type) === "siege" && /^\d+회차 점령전$/.test(title);
}

function getMemberActivityStatsSummary(
  activities: ActivityLog[],
  memberId: string,
) {
  const stats = getMemberActivityStats(activities, memberId);
  const details = ([
    ["점령전", stats.siege],
    ["비공정", stats.airship],
    ["이벤트", stats.other],
  ] as Array<[string, number]>)
    .filter(([, count]) => count > 0)
    .map(([label, count]) => `${label} ${count}회`);

  return [`총 활동 ${stats.total}회`, ...details].join(" · ");
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

  return `이벤트 ${stats.other}회`;
}

let cachedMembersValue: string | null = null;
let cachedMembersSnapshot: GuildMember[] = EMPTY_MEMBERS;
let cachedActivitiesValue: string | null = null;
let cachedActivitiesSnapshot: ActivityLog[] = EMPTY_ACTIVITIES;

function today() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
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

export default function Home() {
  const [nickname, setNickname] = useState("");
  const [newMemberJoinedAt, setNewMemberJoinedAt] = useState(today);
  const [newMemberGender, setNewMemberGender] = useState<
    GuildMemberGender | ""
  >("");
  const [newMemberBirthYearInput, setNewMemberBirthYearInput] = useState("");
  const [activityDate, setActivityDate] = useState(today);
  const [activityEndDate, setActivityEndDate] = useState("");
  const [activityType, setActivityType] = useState<VisibleActivityType>("airship");
  const [activityAirshipType, setActivityAirshipType] =
    useState<AirshipType>("ocean");
  const [activityConquestTypes, setActivityConquestTypes] = useState<
    ConquestType[]
  >([]);
  const [activityTitle, setActivityTitle] = useState("");
  const [isSiegeTitleAutoSuggested, setIsSiegeTitleAutoSuggested] =
    useState(false);
  const [hasManuallyEditedActivityTitle, setHasManuallyEditedActivityTitle] =
    useState(false);
  const [activityMemo, setActivityMemo] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [participantSearch, setParticipantSearch] = useState("");
  const [isParticipantActiveOpen, setIsParticipantActiveOpen] = useState(true);
  const [isParticipantLeftOpen, setIsParticipantLeftOpen] = useState(false);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [activitySortOrder, setActivitySortOrder] =
    useState<ActivitySortOrder>("latest");
  const [activityMonthFilter, setActivityMonthFilter] = useState("all");
  const [activitySearch, setActivitySearch] = useState("");
  const [activityPage, setActivityPage] = useState(1);
  const [activityFeedbackMessage, setActivityFeedbackMessage] = useState("");
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
  const [memberEditGender, setMemberEditGender] = useState<
    GuildMemberGender | ""
  >("");
  const [memberEditBirthYearInput, setMemberEditBirthYearInput] = useState("");
  const [memberFeedbackMessage, setMemberFeedbackMessage] = useState("");
  const [restoreLeftMembersResult, setRestoreLeftMembersResult] =
    useState<RestoreLeftMembersResult | null>(null);
  const [memberMemoClearScope, setMemberMemoClearScope] =
    useState<MemberMemoClearScope>("all");
  const [memberMemoClearResult, setMemberMemoClearResult] =
    useState<MemberMemoClearResult | null>(null);
  const [selectedReportMonth, setSelectedReportMonth] = useState("");
  const [shareFeedbackMessage, setShareFeedbackMessage] = useState("");
  const [backupFeedbackMessage, setBackupFeedbackMessage] = useState("");
  const [backupImportState, setBackupImportState] = useState<BackupImportState>({
    status: "idle",
  });
  const [serverImportState, setServerImportState] = useState<ServerImportState>({
    status: "idle",
  });
  const [serverImportToken, setServerImportToken] = useState("");
  const [restoreResultMessage, setRestoreResultMessage] = useState("");
  const [isDataToolsOpen, setIsDataToolsOpen] = useState(false);
  const [isAdvancedDataToolsOpen, setIsAdvancedDataToolsOpen] =
    useState(false);
  const [isDangerDataToolsOpen, setIsDangerDataToolsOpen] = useState(false);
  const [activeAdminSection, setActiveAdminSection] =
    useState<AdminSection>("activity");
  const [monthlyHighlightDraft, setMonthlyHighlightDraft] =
    useState<MonthlyHighlightDraft | null>(null);
  const [highlightSourceActivityIds, setHighlightSourceActivityIds] =
    useState<string[]>([]);
  const highlightDraftRequestIdRef = useRef(0);
  const [isActiveMembersOpen, setIsActiveMembersOpen] = useState(true);
  const [isLeftMembersOpen, setIsLeftMembersOpen] = useState(false);
  const [activeMemberSearch, setActiveMemberSearch] = useState("");
  const [leftMemberSearch, setLeftMemberSearch] = useState("");
  const [activeMemberPage, setActiveMemberPage] = useState(1);
  const [leftMemberPage, setLeftMemberPage] = useState(1);
  const [memberMenuPosition, setMemberMenuPosition] =
    useState<MemberMenuPosition | null>(null);
  const [leavingMemberId, setLeavingMemberId] = useState<string | null>(null);
  const [leaveDate, setLeaveDate] = useState(today());
  const activityFormRef = useRef<HTMLElement>(null);
  const memberFormRef = useRef<HTMLElement>(null);
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
  const currentYear = Number(today().slice(0, 4));
  const newMemberBirthYearResult = parseBirthYearInput(
    newMemberBirthYearInput,
    currentYear,
  );
  const memberEditBirthYearResult = parseBirthYearInput(
    memberEditBirthYearInput,
    currentYear,
  );
  const isEditingMember = editingMemberId !== null;
  const editingMember = members.find((member) => member.id === editingMemberId);
  const menuMember = memberMenuPosition
    ? members.find((member) => member.id === memberMenuPosition.memberId) ?? null
    : null;
  const leavingMember = leavingMemberId
    ? members.find((member) => member.id === leavingMemberId) ?? null
    : null;
  const activeMembers = members.filter((member) => member.status === "active");
  const leftMembers = members.filter((member) => member.status === "left");
  const filteredActiveMembers = activeMemberSearch.trim()
    ? activeMembers.filter((member) =>
        matchesMemberKeyword(member.nickname, activeMemberSearch.trim()),
      )
    : activeMembers;
  const filteredLeftMembers = leftMemberSearch.trim()
    ? leftMembers.filter((member) =>
        matchesMemberKeyword(member.nickname, leftMemberSearch.trim()),
      )
    : leftMembers;
  const activeMemberTotalPages = Math.max(
    1,
    Math.ceil(filteredActiveMembers.length / MEMBER_PAGE_SIZE),
  );
  const leftMemberTotalPages = Math.max(
    1,
    Math.ceil(filteredLeftMembers.length / MEMBER_PAGE_SIZE),
  );
  const currentActiveMemberPage = Math.min(
    activeMemberPage,
    activeMemberTotalPages,
  );
  const currentLeftMemberPage = Math.min(leftMemberPage, leftMemberTotalPages);
  const paginatedActiveMembers = filteredActiveMembers.slice(
    (currentActiveMemberPage - 1) * MEMBER_PAGE_SIZE,
    currentActiveMemberPage * MEMBER_PAGE_SIZE,
  );
  const paginatedLeftMembers = filteredLeftMembers.slice(
    (currentLeftMemberPage - 1) * MEMBER_PAGE_SIZE,
    currentLeftMemberPage * MEMBER_PAGE_SIZE,
  );
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
  const airshipDetailSummaries = [
    { label: "오션헤븐", count: monthlyReport.oceanAirshipCount },
    { label: "아우로라", count: monthlyReport.auroraAirshipCount },
  ].filter((summary) => summary.count > 0);
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
  const typeFilteredActivities =
    activityFilter === "all"
      ? sortedActivities
      : sortedActivities.filter(
          (activity) => getVisibleActivityType(activity.type) === activityFilter,
        );
  const activitySearchKeyword = activitySearch.trim().toLocaleLowerCase("ko");
  const shortDateSearchMatch = /^(\d{2})\/(\d{2})$/.exec(
    activitySearchKeyword,
  );
  const activityDateSearchKeyword = shortDateSearchMatch
    ? `-${shortDateSearchMatch[1]}-${shortDateSearchMatch[2]}`
    : activitySearchKeyword;
  const filteredActivities = typeFilteredActivities.filter((activity) => {
    const matchesMonth =
      activityMonthFilter === "all" ||
      activity.date.startsWith(activityMonthFilter);
    const matchesSearch =
      !activitySearchKeyword ||
      activity.date.includes(activityDateSearchKeyword) ||
      (activity.title ?? "")
        .toLocaleLowerCase("ko")
        .includes(activitySearchKeyword);

    return matchesMonth && matchesSearch;
  });
  const maxFilteredParticipantCount = filteredActivities.reduce(
    (maxCount, activity) => Math.max(maxCount, activity.participantIds.length),
    0,
  );
  const activityMonthOptions = Array.from(
    new Set(activities.map((activity) => activity.date.slice(0, 7))),
  ).sort((a, b) => b.localeCompare(a));
  const activityTotalPages = Math.max(
    1,
    Math.ceil(filteredActivities.length / ACTIVITY_PAGE_SIZE),
  );
  const currentActivityPage = Math.min(activityPage, activityTotalPages);
  const activityRangeStart = filteredActivities.length
    ? (currentActivityPage - 1) * ACTIVITY_PAGE_SIZE + 1
    : 0;
  const activityRangeEnd = Math.min(
    currentActivityPage * ACTIVITY_PAGE_SIZE,
    filteredActivities.length,
  );
  const visibleActivities = filteredActivities.slice(
    (currentActivityPage - 1) * ACTIVITY_PAGE_SIZE,
    currentActivityPage * ACTIVITY_PAGE_SIZE,
  );
  const hasActiveActivityFilters =
    activityMonthFilter !== "all" ||
    activitySearch.trim() !== "" ||
    activitySortOrder !== "latest" ||
    activityFilter !== "all";
  const selectedMemberActivities = selectedHistoryMember
    ? sortedActivities.filter((activity) =>
        activity.participantIds.includes(selectedHistoryMember.id),
      )
    : [];

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

  useEffect(() => {
    if (!shareFeedbackMessage) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setShareFeedbackMessage("");
    }, 3500);

    return () => window.clearTimeout(timerId);
  }, [shareFeedbackMessage]);

  useEffect(() => {
    if (!historyMemberId) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setHistoryMemberId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [historyMemberId]);

  const resetActivityForm = () => {
    setActivityDate(today());
    setActivityEndDate("");
    setActivityType("airship");
    setActivityAirshipType("ocean");
    setActivityConquestTypes([]);
    setActivityTitle("");
    setIsSiegeTitleAutoSuggested(false);
    setHasManuallyEditedActivityTitle(false);
    setActivityMemo("");
    setSelectedMemberIds([]);
    setParticipantSearch("");
    setIsParticipantActiveOpen(true);
    setIsParticipantLeftOpen(false);
    setEditingActivityId(null);
  };

  const resetMemberForm = () => {
    setEditingMemberId(null);
    setMemberEditNickname("");
    setMemberEditStatus("active");
    setMemberEditJoinedAt("");
    setMemberEditLeftAt("");
    setMemberEditMemo("");
    setMemberEditGender("");
    setMemberEditBirthYearInput("");
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

    if (!newMemberBirthYearResult.valid) {
      setMemberFeedbackMessage(newMemberBirthYearResult.error);
      return;
    }

    addMember({
      nickname: trimmedNickname,
      joinedAt: newMemberJoinedAt,
      gender: newMemberGender || undefined,
      birthYear: newMemberBirthYearResult.birthYear,
    });
    setNickname("");
    setNewMemberJoinedAt(today());
    setNewMemberGender("");
    setNewMemberBirthYearInput("");
    setMemberFeedbackMessage("");
    notifyMembersChanged();
  };

  const handleOpenMemberMenu = (
    event: ReactMouseEvent<HTMLButtonElement>,
    memberId: string,
  ) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;
    const shouldOpenUp = window.innerHeight - rect.bottom < 220;

    setMemberMenuPosition({
      memberId,
      right: isMobile ? 12 : Math.max(12, window.innerWidth - rect.right),
      ...(isMobile || shouldOpenUp
        ? { bottom: isMobile ? 12 : window.innerHeight - rect.top + 6 }
        : { top: rect.bottom + 6 }),
    });
  };

  const handleRequestLeaveMember = (memberId: string) => {
    setMemberMenuPosition(null);
    setLeavingMemberId(memberId);
    setLeaveDate(today());
  };

  const handleRestoreMember = (memberId: string) => {
    setMemberMenuPosition(null);
    updateMember(memberId, { status: "active", leftAt: null });
    setRestoreLeftMembersResult(null);
    notifyMembersChanged();
  };

  const handleConfirmLeaveMember = () => {
    if (!leavingMemberId || !leaveDate) {
      return;
    }

    markMemberAsLeft(leavingMemberId, leaveDate);
    setSelectedMemberIds((currentIds) =>
      currentIds.filter(
        (selectedMemberId) => selectedMemberId !== leavingMemberId,
      ),
    );
    setRestoreLeftMembersResult(null);
    setLeavingMemberId(null);
    notifyMembersChanged();
  };

  const handleViewMemberHistory = (memberId: string) => {
    setHistoryMemberId(memberId);
  };

  const handleCloseMemberHistory = () => {
    setHistoryMemberId(null);
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
      `${scopeLabel} 메모를 모두 삭제할까요? 이 작업은 되돌릴 수 없습니다.`,
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
    setServerImportState({ status: "idle" });

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

  const handleImportBackupToServer = async () => {
    if (backupImportState.status !== "valid") {
      return;
    }

    const trimmedServerImportToken = serverImportToken.trim();

    if (!trimmedServerImportToken) {
      setServerImportState({
        status: "error",
        message: "서버 반영 토큰을 입력해주세요.",
      });
      return;
    }

    const shouldImport = window.confirm(
      "선택한 JSON 백업을 서버 DB로 가져올까요?\n기존 서버 DB 데이터는 백업 파일 내용으로 덮어씁니다.",
    );

    if (!shouldImport) {
      return;
    }

    setServerImportState({ status: "loading" });

    try {
      const response = await fetch("/api/import/json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${trimmedServerImportToken}`,
        },
        body: JSON.stringify(backupImportState.backup),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        memberCount?: number;
        activityCount?: number;
        participantCount?: number;
        conquestTypeCount?: number;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "서버 DB 가져오기에 실패했습니다.");
      }

      setServerImportState({
        status: "success",
        memberCount: result.memberCount ?? 0,
        activityCount: result.activityCount ?? 0,
        participantCount: result.participantCount ?? 0,
        conquestTypeCount: result.conquestTypeCount ?? 0,
      });
    } catch (error) {
      setServerImportState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "서버 DB 가져오기 중 문제가 발생했습니다.",
      });
    }
  };

  const handleEditMember = (member: GuildMember) => {
    setActiveAdminSection("members");
    setEditingMemberId(member.id);
    setMemberEditNickname(member.nickname);
    setMemberEditStatus(member.status);
    setMemberEditJoinedAt(member.joinedAt);
    setMemberEditLeftAt(member.leftAt ?? "");
    setMemberEditMemo(member.memo ?? "");
    setMemberEditGender(member.gender ?? "");
    setMemberEditBirthYearInput(
      member.birthYear ? String(member.birthYear) : "",
    );
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

    if (!memberEditBirthYearResult.valid) {
      setMemberFeedbackMessage(memberEditBirthYearResult.error);
      return;
    }

    updateMember(editingMemberId, {
      nickname: trimmedNickname,
      status: memberEditStatus,
      joinedAt: memberEditJoinedAt,
      leftAt: memberEditStatus === "left" ? memberEditLeftAt || null : null,
      memo: memberEditMemo.trim() || undefined,
      gender: memberEditGender || undefined,
      birthYear: memberEditBirthYearResult.birthYear,
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
    setIsSiegeTitleAutoSuggested(false);
    setHasManuallyEditedActivityTitle(false);
  };

  const handleToggleConquestType = (conquestType: ConquestType) => {
    setActivityConquestTypes((currentTypes) =>
      currentTypes.includes(conquestType)
        ? currentTypes.filter((currentType) => currentType !== conquestType)
        : [...currentTypes, conquestType],
    );
  };

  const handleSubmitActivity = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      activityType === "other" &&
      activityEndDate &&
      activityEndDate < activityDate
    ) {
      setActivityFeedbackMessage("종료일은 시작일과 같거나 이후여야 합니다.");
      return;
    }

    const activityData = {
      date: activityDate,
      endDate:
        activityType === "other" &&
        activityEndDate &&
        activityEndDate !== activityDate
          ? activityEndDate
          : undefined,
      type: activityType,
      airshipType: activityType === "airship" ? activityAirshipType : undefined,
      conquestTypes:
        activityType === "siege" && activityConquestTypes.length > 0
          ? activityConquestTypes
          : undefined,
      title: activityTitle.trim() || undefined,
      participantIds: selectedMemberIds,
      memo: activityMemo.trim() || undefined,
    };

    const wasEditingActivity = Boolean(editingActivityId);

    try {
      if (editingActivityId) {
        updateActivityLog(editingActivityId, activityData);
      } else {
        addActivityLog(activityData);
      }
    } catch {
      setActivityFeedbackMessage(
        "활동 기록을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
      return;
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
    setActiveAdminSection("activity");
    setEditingActivityId(activity.id);
    setActivityDate(activity.date);
    setActivityEndDate(activity.endDate ?? "");
    setActivityType(getVisibleActivityType(activity.type));
    setActivityAirshipType(getKnownAirshipType(activity.airshipType) ?? "ocean");
    setActivityConquestTypes(getKnownConquestTypes(activity.conquestTypes));
    setActivityTitle(activity.title ?? "");
    setIsSiegeTitleAutoSuggested(false);
    setHasManuallyEditedActivityTitle(!isSystemGeneratedActivityTitle(activity));
    setActivityMemo(activity.memo ?? "");
    setSelectedMemberIds(activity.participantIds);
    setParticipantSearch("");
    setIsParticipantActiveOpen(true);
    setIsParticipantLeftOpen(
      members.some(
        (member) =>
          member.status === "left" && activity.participantIds.includes(member.id),
      ),
    );
    requestAnimationFrame(() => {
      activityFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleAddEventToMonthlyHighlights = (activity: ActivityLog) => {
    highlightDraftRequestIdRef.current += 1;
    setMonthlyHighlightDraft({
      requestId: highlightDraftRequestIdRef.current,
      sourceActivityId: activity.id,
      startDate: activity.date,
      endDate: activity.endDate,
      title: activity.title?.trim() || "이벤트",
      description: activity.memo?.trim() || undefined,
    });
    setActiveAdminSection("highlights");
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

  const handleCopyMonthlyShareText = async () => {
    const shareText = getMonthlyShareText(monthlyReport);

    try {
      await navigator.clipboard.writeText(shareText);
      setShareFeedbackMessage("공유 문구를 클립보드에 복사했습니다.");
    } catch {
      setShareFeedbackMessage(
        "클립보드 복사에 실패했습니다. 문구를 직접 선택해 복사해주세요.",
      );
    }
  };

  const historyMemberStats = selectedHistoryMember
    ? getMemberActivityStats(activities, selectedHistoryMember.id)
    : null;

  return (
    <>
    <main className="app-shell gap-8" data-admin-section={activeAdminSection}>
      <AppHeader
        currentPath="/admin"
        description="길드 활동과 길드원 정보를 관리합니다."
        eyebrow="테일즈런너 길드 활동 아카이브"
        title="냥춘 길드 관리"
      />

      <AdminSectionNav
        activeSection={activeAdminSection}
        onChange={(section) => {
          setActiveAdminSection(section);
          if (section === "data") {
            setIsDataToolsOpen(true);
          }
        }}
      />

      <section className="hidden" data-admin-panel="activity">
        <h2 className="text-lg font-semibold text-neutral-900">
          월별 정산 설정
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700 sm:max-w-xs sm:flex-1">
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
          <button
            className="shrink-0 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
            type="button"
            onClick={handleCopyMonthlyShareText}
          >
            공유 문구 복사
          </button>
        </div>

        {shareFeedbackMessage ? (
          <p className="rounded-md bg-white px-3 py-2 text-sm text-neutral-700">
            {shareFeedbackMessage}
          </p>
        ) : null}
      </section>

      <section className="hidden" data-admin-panel="activity">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-neutral-950">
            냥춘 {getMonthLabel(reportMonth)} 활동 정산
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-sky-100 bg-sky-50/70 px-4 py-4 text-[var(--text-primary)]">
            <p className="text-xs font-medium text-[var(--text-secondary)]">이번 달 활동</p>
            <p className="text-2xl font-bold">
              {monthlyReport.totalActivities}회
            </p>
          </div>
          <div className="rounded-md border border-sky-100 bg-sky-50/70 px-4 py-4 text-[var(--text-primary)]">
            <p className="text-xs font-medium text-[var(--text-secondary)]">함께한 길드원</p>
            <p className="text-2xl font-bold">
              {monthlyReport.participantMemberCount}명
            </p>
          </div>
          <div className="rounded-md border border-sky-100 bg-sky-50/70 px-4 py-4 text-[var(--text-primary)]">
            <p className="text-xs font-medium text-[var(--text-secondary)]">총 참여 횟수</p>
            <p className="text-2xl font-bold">
              {monthlyReport.totalParticipationCount}회
            </p>
          </div>
        </div>

        <div className="rounded-md border border-neutral-200 p-4">
          <h3 className="text-sm font-semibold text-neutral-900">
            활동별 기록
          </h3>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-md bg-neutral-100 px-3 py-3">
              <dt className="text-neutral-500">비공정</dt>
              <dd className="font-semibold text-neutral-950">
                {monthlyReport.airshipCount}회
              </dd>
            </div>
            <div className="rounded-md bg-neutral-100 px-3 py-3">
              <dt className="text-neutral-500">점령전</dt>
              <dd className="font-semibold text-neutral-950">
                {monthlyReport.siegeCount}회
              </dd>
            </div>
            <div className="rounded-md bg-neutral-100 px-3 py-3">
              <dt className="text-neutral-500">이벤트</dt>
              <dd className="font-semibold text-neutral-950">
                {monthlyReport.otherCount}회
              </dd>
            </div>
          </dl>
        </div>

        <div className="grid items-stretch gap-3 lg:grid-cols-2">
          <div className="flex h-full flex-col rounded-md border border-neutral-200 p-4">
            <h3 className="text-sm font-semibold text-neutral-900">비공정</h3>
            {airshipDetailSummaries.length === 0 ? (
              <p className="mt-3 rounded-md bg-neutral-50 px-3 py-4 text-center text-sm text-neutral-500">
                이번 달 기록 없음
              </p>
            ) : (
              <dl className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
                {airshipDetailSummaries.map((summary) => (
                  <div className="flex min-h-16 flex-col justify-center rounded-md bg-neutral-100 px-3 py-2.5" key={summary.label}>
                    <dt className="text-neutral-500">{summary.label}</dt>
                    <dd className="font-semibold text-neutral-950">{summary.count}회</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="flex h-full flex-col rounded-md border border-neutral-200 p-4">
            <h3 className="text-sm font-semibold text-neutral-900">점령전</h3>
            {monthlyReport.conquestSummaries.length === 0 ? (
              <p className="mt-3 rounded-md bg-neutral-50 px-3 py-4 text-center text-sm text-neutral-500">
                이번 달 기록 없음
              </p>
            ) : (
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                {monthlyReport.conquestSummaries.map((summary) => (
                  <div
                    className="flex min-h-16 flex-col justify-center rounded-md bg-neutral-100 px-3 py-2.5"
                    key={summary.label}
                  >
                    <dt className="text-neutral-500">{summary.label}</dt>
                    <dd className="font-semibold text-neutral-950">
                      {summary.count}회
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-md border border-neutral-200 p-4">
            <h3 className="text-sm font-semibold text-neutral-900">
              참여 TOP
            </h3>
            {monthlyReport.topParticipants.length === 0 ? (
              <p className="mt-3 rounded-md border border-dashed border-neutral-300 px-3 py-5 text-center text-sm text-neutral-500">
                이 달의 참여 기록이 없습니다.
              </p>
            ) : (
              <ol className="mt-3 grid gap-2 md:grid-flow-col md:grid-cols-2 md:grid-rows-6 lg:grid-cols-3 lg:grid-rows-4">
                {monthlyReport.topParticipants.map((participant, index) => (
                  <li
                    className="flex items-center justify-between gap-3 rounded-md bg-neutral-100 px-3 py-2 text-sm"
                    key={participant.memberId}
                  >
                    <span className="shrink-0 font-bold text-[var(--brand-strong)]">
                      {index + 1}위
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium text-neutral-900">
                      {participant.nickname}
                    </span>
                    <span className="shrink-0 font-semibold text-neutral-950">
                      {participant.count}회
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {monthlyReport.eventSummaries.length > 0 ? (
            <div className="rounded-md border border-neutral-200 p-4">
              <h3 className="text-sm font-semibold text-neutral-900">
                이번 달 이벤트
              </h3>
              <ul className="mt-3 space-y-3">
                {monthlyReport.eventSummaries.map((activity) => (
                  <li
                    className="rounded-md bg-neutral-100 px-3 py-3 text-sm"
                    key={activity.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block text-xs text-neutral-500">
                          {activity.displayDate}
                        </span>
                        <span className="block truncate font-semibold text-neutral-950">
                          {activity.title}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-md bg-sky-100 px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)]">
                        참여 {activity.participantCount}명
                      </span>
                    </div>
                    {activity.memo ? (
                      <p className="mt-2 whitespace-pre-wrap text-neutral-600">
                        {activity.memo}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
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
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {monthlyReport.activitySummaries.map((activity) => (
                <li
                  className="rounded-md bg-neutral-100 px-3 py-3 text-sm"
                  key={activity.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-neutral-900">
                        {activity.displayDate} {activity.label}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-sm border px-2 py-0.5 text-xs font-medium text-slate-700 ${activity.isMostParticipated ? "border-sky-300 bg-sky-200" : "border-sky-100 bg-sky-50"}`}>
                      참여 {activity.participantCount}명
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="space-y-4" data-admin-panel="data">
        <div>
          <h2 className="ui-section-title">데이터 관리</h2>
          <p className="ui-supporting-text">
            길드 데이터를 백업하거나 복원하고, 필요한 경우 유지보수 도구를 사용할 수 있습니다.
          </p>
        </div>

        {isDataToolsOpen ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className={`${isDangerDataToolsOpen ? "" : "hidden"} order-5 space-y-3 rounded-md border border-red-200 bg-white p-4 md:col-span-2`} id="danger-data-tools">
              <h3 className="ui-card-title text-[var(--danger)]">
                메모 일괄 삭제
              </h3>
              <p className="ui-supporting-text">
                선택한 범위의 메모가 일괄 삭제됩니다. 삭제 후 되돌릴 수 없습니다.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                  <span>메모 삭제 범위</span>
                  <select
                    className="ui-form-control sm:w-auto"
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
                  className="ui-button-danger"
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

            <div className={`${isAdvancedDataToolsOpen ? "" : "hidden"} order-3 space-y-3 rounded-md border border-neutral-200 bg-white p-4 md:col-span-2`} id="advanced-data-tools">
              <h3 className="ui-card-title">
                탈퇴 길드원 복구
              </h3>
              <p className="ui-supporting-text">
                탈퇴 상태인 길드원을 기존 활동 기록 연결을 유지한 채 활동중으로 복구합니다.
              </p>
              {leftMembers.length > 0 ? (
                <button
                  className="ui-button-secondary"
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

            <div className="order-1 space-y-3 rounded-md border border-neutral-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  백업 및 복원
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
                className="ui-button-secondary w-full sm:w-auto"
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

            <div className="order-1 space-y-3 rounded-md border border-neutral-200 bg-white p-4">
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
                className="block w-full min-w-0 rounded-md border border-[var(--border)] px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--brand-strong)] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
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
                  <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
                    <span>서버 반영 토큰 (서버 DB로 가져오기에만 필요)</span>
                    <input
                      className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-neutral-900"
                      type="password"
                      autoComplete="off"
                      placeholder="ADMIN_IMPORT_TOKEN 값 입력"
                      value={serverImportToken}
                      onChange={(event) => setServerImportToken(event.target.value)}
                    />
                  </label>
                  <p className="text-xs text-neutral-500">
                    입력한 토큰은 저장되지 않고 이 화면에서만 사용되며, 서버 DB로
                    가져오기를 요청할 때만 서버로 전송됩니다.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-md bg-[var(--brand-strong)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
                      type="button"
                      onClick={handleRestoreBackup}
                    >
                      이 백업으로 복원
                    </button>
                    <button
                      className="rounded-md border border-[var(--brand-strong)] bg-white px-4 py-2 text-sm font-semibold text-[var(--brand-strong)] transition hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400"
                      type="button"
                      disabled={serverImportState.status === "loading"}
                      onClick={handleImportBackupToServer}
                    >
                      {serverImportState.status === "loading"
                        ? "서버 DB로 가져오는 중"
                        : "서버 DB로 가져오기"}
                    </button>
                    <button
                      className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
                      type="button"
                      onClick={handleCancelBackupImport}
                    >
                      취소
                    </button>
                  </div>
                  {serverImportState.status === "success" ? (
                    <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                      서버 DB 가져오기가 완료되었습니다. 길드원{" "}
                      {serverImportState.memberCount}명, 활동 기록{" "}
                      {serverImportState.activityCount}개, 참여 연결{" "}
                      {serverImportState.participantCount}개를 저장했습니다.
                    </p>
                  ) : null}
                  {serverImportState.status === "error" ? (
                    <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                      {serverImportState.message}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {restoreResultMessage ? (
                <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                  {restoreResultMessage}
                </p>
              ) : null}
            </div>

            <div className="order-1 space-y-2 rounded-md border border-[var(--border)] bg-white p-4 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                주의사항
              </p>
              <ul className="list-disc space-y-1 rounded-md bg-neutral-50 px-4 py-3 pl-8 text-sm text-neutral-600">
                <li>
                  관리 화면의 편집 데이터는 이 브라우저에 저장되므로 정기적인 JSON
                  백업을 권장합니다.
                </li>
                <li>D1 반영은 백업 파일 확인 후 서버 DB로 가져오기를 실행해야 합니다.</li>
                <li>복원 시 현재 데이터가 백업 파일 내용으로 덮어써집니다.</li>
              </ul>
            </div>

            <button
              aria-controls="advanced-data-tools"
              aria-expanded={isAdvancedDataToolsOpen}
              className="ui-focus-ring order-2 flex min-h-11 w-full items-center justify-between rounded-md border border-[var(--border)] bg-white px-4 text-left text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] md:col-span-2"
              onClick={() => setIsAdvancedDataToolsOpen((value) => !value)}
              type="button"
            >
              <span>고급 관리 도구</span>
              <span aria-hidden>{isAdvancedDataToolsOpen ? "▾" : "▸"}</span>
            </button>

            <button
              aria-controls="danger-data-tools"
              aria-expanded={isDangerDataToolsOpen}
              className="ui-focus-ring order-4 flex min-h-11 w-full items-center justify-between rounded-md border border-red-200 bg-white px-4 text-left text-sm font-semibold text-[var(--danger)] hover:bg-red-50 md:col-span-2"
              onClick={() => setIsDangerDataToolsOpen((value) => !value)}
              type="button"
            >
              <span>위험 작업</span>
              <span aria-hidden>{isDangerDataToolsOpen ? "▾" : "▸"}</span>
            </button>
          </div>
        ) : null}
      </section>

      <MonthlyHighlightsAdmin
        draft={monthlyHighlightDraft}
        isActive={activeAdminSection === "highlights"}
        key={monthlyHighlightDraft?.requestId ?? "monthly-highlights"}
        onSourceActivityIdsChange={setHighlightSourceActivityIds}
      />

      <section className="space-y-4" data-admin-panel="members">
        <div className="flex items-center justify-between gap-3">
          <h2 className="ui-section-title">
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

        <div className="ui-surface ui-surface-section space-y-4">
          <div>
            <h3 className="ui-card-title">
              새 길드원 등록
            </h3>
            <p className="ui-supporting-text">
              가입일은 오늘로 설정되며, 필요한 경우 과거 날짜로 변경할 수 있습니다.
            </p>
          </div>
          <form className="space-y-4" onSubmit={handleAddMember}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="ui-form-field">
                <span>닉네임</span>
                <input
                  className="ui-form-control"
                  type="text"
                  placeholder="닉네임 입력"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                />
              </label>
              <label className="ui-form-field">
                <span>가입일</span>
                <input
                  className="ui-form-control"
                  onChange={(event) => setNewMemberJoinedAt(event.target.value)}
                  required
                  type="date"
                  onClick={openNativePicker}
                  value={newMemberJoinedAt}
                />
              </label>
              <label className="ui-form-field">
                <span>성별 (선택)</span>
                <select
                  className="ui-form-control"
                  value={newMemberGender}
                  onChange={(event) =>
                    setNewMemberGender(
                      event.target.value as GuildMemberGender | "",
                    )
                  }
                >
                  <option value="">미입력</option>
                  {Object.entries(guildMemberGenderLabels).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label className="ui-form-field">
                <span>출생연도 (선택)</span>
                <input
                  className="ui-form-control"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="예: 98 또는 1998"
                  type="text"
                  value={newMemberBirthYearInput}
                  onChange={(event) =>
                    setNewMemberBirthYearInput(event.target.value)
                  }
                />
              </label>
            </div>
            {newMemberBirthYearInput ? (
              <p
                className={`text-sm ${
                  newMemberBirthYearResult.error
                    ? "text-red-600"
                    : "text-emerald-700"
                }`}
              >
                {newMemberBirthYearResult.error ??
                  `${getMemberDemographicsLabel(
                    newMemberBirthYearResult.birthYear,
                    currentYear,
                  )}으로 저장됩니다.`}
              </p>
            ) : null}
            <button
              className="ui-button-primary sm:w-fit"
              type="submit"
            >
              등록
            </button>
          </form>
        </div>

        <div>
          <button
            aria-expanded={isActiveMembersOpen}
            className="ui-focus-ring flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-left text-base font-semibold text-neutral-900 hover:bg-neutral-50"
            type="button"
            onClick={() => {
              setIsActiveMembersOpen((value) => !value);
              setActiveMemberPage(1);
            }}
          >
            <span aria-hidden>{isActiveMembersOpen ? "▾" : "▸"}</span>
            <span>&#54876;&#46041;&#51473; &#44600;&#46300;&#50896; {activeMembers.length}&#47749;</span>
          </button>
        </div>

        {isActiveMembersOpen ? (
          activeMembers.length === 0 ? (
            <p className="rounded-md border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500">
              &#50500;&#51649; &#46321;&#47197;&#46108; &#54876;&#46041;&#51473; &#44600;&#46300;&#50896;&#51060; &#50630;&#49845;&#45768;&#45796;.
            </p>
          ) : (
            <div className="space-y-3">
              <label className="block space-y-1 text-sm font-medium text-neutral-700">
                <span>활동중 길드원 검색</span>
                <input
                  className="ui-focus-ring min-h-11 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm sm:max-w-sm"
                  onChange={(event) => {
                    setActiveMemberSearch(event.target.value);
                    setActiveMemberPage(1);
                  }}
                  placeholder="닉네임 검색"
                  type="search"
                  value={activeMemberSearch}
                />
              </label>
              {filteredActiveMembers.length === 0 ? (
                <p className="rounded-md border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500">
                  검색 결과가 없습니다.
                </p>
              ) : (
            <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200">
              {paginatedActiveMembers.map((member) => (
                  <li
                    className="flex gap-3 bg-white px-3 py-2.5"
                    key={member.id}
                  >
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <div className="min-w-0 sm:flex sm:items-center sm:gap-3">
                        <p className="truncate font-semibold text-neutral-950 sm:min-w-28">
                          {member.nickname}
                        </p>
                        {member.joinedAt ? (
                          <p className="whitespace-nowrap text-xs text-neutral-500">
                            &#44032;&#51077;&#51068; {member.joinedAt}
                          </p>
                        ) : null}
                        {member.gender || member.birthYear ? (
                          <p className="whitespace-nowrap text-xs text-neutral-500">
                            {[
                              member.gender
                                ? guildMemberGenderLabels[member.gender]
                                : null,
                              getMemberDemographicsLabel(
                                member.birthYear,
                                currentYear,
                              ),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        ) : null}
                        <p className="truncate text-xs text-neutral-500">
                          {getMemberActivityStatsSummary(activities, member.id)}
                        </p>
                      </div>
                      <button
                        aria-label="길드원 상세 메뉴"
                        className="ui-focus-ring flex size-11 shrink-0 items-center justify-center rounded-md border border-neutral-200 text-xl font-bold text-neutral-600 hover:bg-neutral-100"
                        onClick={(event) => handleOpenMemberMenu(event, member.id)}
                        type="button"
                      >
                          <span aria-hidden>⋯</span>
                      </button>
                    </div>
                  </li>
              ))}
            </ul>
              )}
              <Pagination
                currentPage={currentActiveMemberPage}
                label="활동중 길드원 페이지"
                onPageChange={setActiveMemberPage}
                totalPages={activeMemberTotalPages}
              />
            </div>
          )
        ) : null}

        <div className="pt-2">
          <button
            aria-expanded={isLeftMembersOpen}
            className="ui-focus-ring flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-left text-base font-semibold text-neutral-900 hover:bg-neutral-50"
            type="button"
            onClick={() => {
              setIsLeftMembersOpen((value) => !value);
              setLeftMemberPage(1);
            }}
          >
            <span aria-hidden>{isLeftMembersOpen ? "▾" : "▸"}</span>
            <span>&#53448;&#53748; &#44600;&#46300;&#50896; {leftMembers.length}&#47749;</span>
          </button>
        </div>

        {isLeftMembersOpen ? (
          leftMembers.length === 0 ? (
            <p className="rounded-md border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500">
              &#53448;&#53748; &#49345;&#53468;&#51064; &#44600;&#46300;&#50896;&#51060; &#50630;&#49845;&#45768;&#45796;.
            </p>
          ) : (
            <div className="space-y-3">
              <label className="block space-y-1 text-sm font-medium text-neutral-700">
                <span>탈퇴 길드원 검색</span>
                <input
                  className="ui-focus-ring min-h-11 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm sm:max-w-sm"
                  onChange={(event) => {
                    setLeftMemberSearch(event.target.value);
                    setLeftMemberPage(1);
                  }}
                  placeholder="닉네임 검색"
                  type="search"
                  value={leftMemberSearch}
                />
              </label>
              {filteredLeftMembers.length === 0 ? (
                <p className="rounded-md border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500">
                  검색 결과가 없습니다.
                </p>
              ) : (
            <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 bg-white">
              {paginatedLeftMembers.map((member) => (
                  <li
                    className="flex gap-3 px-3 py-2.5"
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
                        {member.gender || member.birthYear ? (
                          <p className="text-xs text-neutral-500">
                            {[
                              member.gender
                                ? guildMemberGenderLabels[member.gender]
                                : null,
                              getMemberDemographicsLabel(
                                member.birthYear,
                                currentYear,
                              ),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-neutral-500">
                          {getMemberActivityStatsSummary(activities, member.id)}
                        </p>
                      </div>
                      <button
                        aria-label="길드원 상세 메뉴"
                        className="ui-focus-ring flex size-11 shrink-0 items-center justify-center rounded-md border border-neutral-200 text-xl font-bold text-neutral-600 hover:bg-neutral-100"
                        onClick={(event) => handleOpenMemberMenu(event, member.id)}
                        type="button"
                      >
                          <span aria-hidden>⋯</span>
                      </button>
                    </div>
                  </li>
              ))}
            </ul>
              )}
              <Pagination
                currentPage={currentLeftMemberPage}
                label="탈퇴 길드원 페이지"
                onPageChange={setLeftMemberPage}
                totalPages={leftMemberTotalPages}
              />
            </div>
          )
        ) : null}
      </section>

      {isEditingMember ? (
        <section className="space-y-4" data-admin-panel="members" ref={memberFormRef}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="ui-section-title">
              길드원 정보 수정
            </h2>
            <button
              className="ui-button-ghost"
              type="button"
              onClick={resetMemberForm}
            >
              수정 취소
            </button>
          </div>
          <form
            className="admin-member-form ui-surface ui-surface-section space-y-4"
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
                <span>성별 (선택)</span>
                <select
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-neutral-900"
                  value={memberEditGender}
                  onChange={(event) =>
                    setMemberEditGender(
                      event.target.value as GuildMemberGender | "",
                    )
                  }
                >
                  <option value="">미입력</option>
                  {Object.entries(guildMemberGenderLabels).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="space-y-1 text-sm font-medium text-neutral-700">
                <span>출생연도 (선택)</span>
                <input
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-neutral-900"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="예: 98 또는 1998"
                  type="text"
                  value={memberEditBirthYearInput}
                  onChange={(event) =>
                    setMemberEditBirthYearInput(event.target.value)
                  }
                />
              </label>
            </div>
            {memberEditBirthYearInput ? (
              <p
                className={`text-sm ${
                  memberEditBirthYearResult.error
                    ? "text-red-600"
                    : "text-emerald-700"
                }`}
              >
                {memberEditBirthYearResult.error ??
                  `${getMemberDemographicsLabel(
                    memberEditBirthYearResult.birthYear,
                    currentYear,
                  )}으로 저장됩니다.`}
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
                  onClick={openNativePicker}
                  value={memberEditJoinedAt}
                  onChange={(event) => setMemberEditJoinedAt(event.target.value)}
                />
              </label>

              <label className="space-y-1 text-sm font-medium text-neutral-700">
                <span>탈퇴일</span>
                <input
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-neutral-900 disabled:bg-neutral-100 disabled:text-neutral-400"
                  type="date"
                  onClick={openNativePicker}
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
              className="rounded-md bg-[var(--brand-strong)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
              type="submit"
            >
              길드원 정보 저장
            </button>
          </form>
        </section>
      ) : null}

      <section className="space-y-4" data-admin-panel="activity" ref={activityFormRef}>
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
          className="space-y-5 rounded-md border border-neutral-200 bg-white p-4 shadow-sm sm:p-5"
          onSubmit={handleSubmitActivity}
        >
          {isEditingActivity ? (
            <p className="rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
              {editingActivity?.title || "선택한 활동 기록"}을 수정 중입니다.
            </p>
          ) : null}
          <div className="grid gap-4 rounded-md border border-neutral-200 bg-white p-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-neutral-700">
              <span>시작일</span>
              <input
                className="ui-focus-ring min-h-11 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm transition focus:border-[var(--brand-strong)]"
                type="date"
                onClick={openNativePicker}
                value={activityDate}
                onChange={(event) => setActivityDate(event.target.value)}
                required
              />
            </label>

            {activityType === "other" ? (
              <label className="space-y-1 text-sm font-medium text-neutral-700">
                <span>종료일 <span className="font-normal text-neutral-500">(선택)</span></span>
                <input
                  className="ui-focus-ring min-h-11 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm transition focus:border-[var(--brand-strong)]"
                  min={activityDate}
                  type="date"
                  onClick={openNativePicker}
                  value={activityEndDate}
                  onChange={(event) => setActivityEndDate(event.target.value)}
                />
              </label>
            ) : null}

            <label className="space-y-1 text-sm font-medium text-neutral-700">
              <span>활동 종류</span>
              <select
                className="ui-focus-ring min-h-11 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm transition focus:border-[var(--brand-strong)]"
                value={activityType}
                onChange={(event) => {
                  const nextType = event.target.value as VisibleActivityType;
                  setActivityType(nextType);

                  if (!hasManuallyEditedActivityTitle) {
                    const nextTitle = nextType === "siege"
                      ? getNextSiegeTitle(activities)
                      : nextType === "airship"
                        ? getAirshipAutoTitle(activityAirshipType)
                        : "";
                    setActivityTitle(nextTitle);
                    setIsSiegeTitleAutoSuggested(nextType === "siege");
                  }

                  if (nextType !== "airship") {
                    setActivityAirshipType("ocean");
                  }

                  if (nextType !== "siege") {
                    setActivityConquestTypes([]);
                  }

                  if (nextType !== "other") {
                    setActivityEndDate("");
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
                            ? "ui-focus-ring min-h-11 rounded-md border border-[var(--brand-strong)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]"
                            : "ui-focus-ring min-h-11 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
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
                            ? "ui-focus-ring min-h-11 rounded-md border border-[var(--brand-strong)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]"
                            : "ui-focus-ring min-h-11 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
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

          <label className="block space-y-1 rounded-md border border-neutral-200 bg-white p-4 text-sm font-medium text-neutral-700">
            <span>제목</span>
            <input
              className="ui-focus-ring min-h-11 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm transition focus:border-[var(--brand-strong)]"
              type="text"
              placeholder="예: 6월 4주차 비공정"
              value={activityTitle}
              onChange={(event) => {
                setActivityTitle(event.target.value);
                setIsSiegeTitleAutoSuggested(false);
                setHasManuallyEditedActivityTitle(true);
              }}
            />
            {isSiegeTitleAutoSuggested ? (
              <span className="block text-xs font-normal text-[var(--brand-strong)]">
                기존 점령전 기록을 기준으로 다음 회차를 입력했습니다.
              </span>
            ) : null}
          </label>

          <fieldset className="space-y-3 rounded-md border border-neutral-200 bg-white p-4">
            <legend className="space-x-2 text-sm font-medium text-neutral-700">
              <span>참여자</span>
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
                            className={`flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-sm ${selectedMemberIds.includes(member.id) ? "border-[var(--brand-strong)] bg-[var(--surface-muted)] text-[var(--text-primary)]" : "border-neutral-200 bg-white text-neutral-800"}`}
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
                            className={`flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-sm ${selectedMemberIds.includes(member.id) ? "border-[var(--brand-strong)] bg-[var(--surface-muted)] text-[var(--text-primary)]" : "border-neutral-200 bg-neutral-50 text-neutral-500"}`}
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

          <button
            className="ui-focus-ring min-h-11 w-full rounded-md bg-[var(--brand-strong)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 sm:w-auto sm:min-w-48"
            type="submit"
          >
            {isEditingActivity ? "활동 기록 수정" : "활동 기록 저장"}
          </button>
        </form>
      </section>

      <section className="space-y-3" data-admin-panel="activity">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">
              전체 활동 기록
            </h2>
            <p className="text-sm text-neutral-500">
              전체 {filteredActivities.length}개 중 {activityRangeStart}–{activityRangeEnd}개 표시
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[10rem_minmax(16rem,1fr)_9rem_10rem_auto] lg:items-end">
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
              <span className="h-5">월 선택</span>
              <select
                className="ui-focus-ring min-h-11 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                value={activityMonthFilter}
                onChange={(event) => {
                  setActivityMonthFilter(event.target.value);
                  setActivityPage(1);
                }}
              >
                <option value="all">전체 월</option>
                {activityMonthOptions.map((month) => (
                  <option key={month} value={month}>
                    {getMonthLabel(month)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
              <span className="h-5">제목·날짜 검색</span>
              <input
                className="ui-focus-ring min-h-11 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                type="search"
                placeholder="제목, YYYY-MM-DD, MM/DD"
                value={activitySearch}
                onChange={(event) => {
                  setActivitySearch(event.target.value);
                  setActivityPage(1);
                }}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
              <span className="h-5">정렬</span>
              <select
                className="ui-focus-ring min-h-11 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                value={activitySortOrder}
                onChange={(event) => {
                  setActivitySortOrder(event.target.value as ActivitySortOrder);
                  setActivityPage(1);
                }}
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
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
              <span className="h-5">활동 종류</span>
              <select
                className="ui-focus-ring min-h-11 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                value={activityFilter}
                onChange={(event) => {
                  setActivityFilter(event.target.value as ActivityFilter);
                  setActivityPage(1);
                }}
              >
                {Object.entries(activityFilterLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {hasActiveActivityFilters ? (
              <button
                aria-label="활동 기록 필터 초기화"
                className="ui-focus-ring min-h-11 justify-self-end rounded-md border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] md:col-span-2 lg:col-span-1"
                onClick={() => {
                  setActivityMonthFilter("all");
                  setActivitySearch("");
                  setActivitySortOrder("latest");
                  setActivityFilter("all");
                  setActivityPage(1);
                }}
                type="button"
              >
                ↶ 초기화
              </button>
            ) : null}
          </div>
        </div>

        {activities.length === 0 ? (
          <p className="rounded-md border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500">
            아직 저장된 활동 기록이 없습니다.
          </p>
        ) : filteredActivities.length === 0 ? (
          <p className="rounded-md border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500">
            조건에 맞는 활동이 없습니다.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleActivities.map((activity) => {
              const participantNames = getParticipantNames(
                activity,
                memberNamesById,
              );

              return (
                <li
                  className="flex flex-col rounded-md border border-neutral-200 bg-white px-4 py-3 shadow-sm"
                  key={activity.id}
                >
                  <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <span className="text-xs text-neutral-500">
                        {formatDateRange(activity.date, activity.endDate)}
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
                    </div>
                    <span className={`shrink-0 rounded-sm border px-2 py-0.5 text-xs font-medium text-slate-700 ${maxFilteredParticipantCount > 0 && activity.participantIds.length === maxFilteredParticipantCount ? "border-sky-300 bg-sky-200" : "border-sky-100 bg-sky-50"}`}>
                      참여 {activity.participantIds.length}명
                    </span>
                  </div>
                  </div>
                  <div className="mt-3 flex flex-1 flex-col gap-2">
                    <h3 className="text-base font-semibold leading-6 text-neutral-950">
                      {activity.title || getActivityTypeLabel(activity)}
                    </h3>
                    <p className="text-sm leading-6 text-neutral-600">
                      참여자{" "}
                      {participantNames.length === 0
                        ? "없음"
                        : participantNames.join(", ")}
                    </p>
                    {activity.memo ? (
                      <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-neutral-500">
                        {activity.memo}
                      </p>
                    ) : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {getVisibleActivityType(activity.type) === "other" ? (
                      highlightSourceActivityIds.includes(activity.id) ? (
                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                          주요 기록 등록됨
                        </span>
                      ) : (
                        <button
                          className="rounded-md border border-[var(--brand-strong)] px-3 py-1.5 text-sm font-semibold text-[var(--brand-strong)] transition hover:bg-[var(--surface-muted)]"
                          type="button"
                          onClick={() => handleAddEventToMonthlyHighlights(activity)}
                        >
                          주요 기록으로 추가
                        </button>
                      )
                    ) : null}
                    <button
                      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
                      type="button"
                      onClick={() => handleEditActivity(activity)}
                    >
                      수정
                    </button>
                    <button
                      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-700 transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
                      type="button"
                      onClick={() => handleDeleteActivity(activity.id)}
                    >
                      삭제
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Pagination
          currentPage={currentActivityPage}
          label="전체 활동 기록 페이지"
          onPageChange={setActivityPage}
          totalPages={activityTotalPages}
        />
      </section>
    </main>

    {memberMenuPosition && menuMember ? (
      <div
        className="fixed inset-0 z-50"
        onClick={() => setMemberMenuPosition(null)}
        role="presentation"
      >
        <div
          aria-label={`${menuMember.nickname} 관리 메뉴`}
          className="fixed z-[60] grid w-64 max-w-[calc(100vw-1.5rem)] gap-1 rounded-md border border-[var(--border)] bg-white p-2 shadow-xl sm:w-56"
          onClick={(event) => event.stopPropagation()}
          role="menu"
          style={{
            bottom: memberMenuPosition.bottom,
            right: memberMenuPosition.right,
            top: memberMenuPosition.top,
          }}
        >
          <p className="truncate border-b border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">
            {menuMember.nickname}
          </p>
          <button
            className="ui-focus-ring min-h-11 rounded-md px-3 text-left text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
            onClick={() => {
              setMemberMenuPosition(null);
              handleEditMember(menuMember);
            }}
            role="menuitem"
            type="button"
          >
            수정
          </button>
          <button
            className="ui-focus-ring min-h-11 rounded-md px-3 text-left text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
            onClick={() => {
              setMemberMenuPosition(null);
              handleViewMemberHistory(menuMember.id);
            }}
            role="menuitem"
            type="button"
          >
            활동 이력 보기
          </button>
          {menuMember.status === "active" ? (
            <button
              className="ui-focus-ring min-h-11 rounded-md px-3 text-left text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
              onClick={() => handleRequestLeaveMember(menuMember.id)}
              role="menuitem"
              type="button"
            >
              탈퇴 처리
            </button>
          ) : (
            <button
              className="ui-focus-ring min-h-11 rounded-md px-3 text-left text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
              onClick={() => handleRestoreMember(menuMember.id)}
              role="menuitem"
              type="button"
            >
              활동중으로 복구
            </button>
          )}
          <button
            className="ui-focus-ring min-h-11 rounded-md px-3 text-left text-sm font-medium text-[var(--danger)] hover:bg-red-50"
            onClick={() => {
              setMemberMenuPosition(null);
              handleDeleteMember(menuMember.id);
            }}
            role="menuitem"
            type="button"
          >
            삭제
          </button>
        </div>
      </div>
    ) : null}

    {leavingMember ? (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4"
        onClick={() => setLeavingMemberId(null)}
        role="presentation"
      >
        <div
          aria-labelledby="leave-member-title"
          aria-modal="true"
          className="w-full max-w-md rounded-md border border-[var(--border)] bg-white p-5 shadow-xl"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
        >
          <h2 className="text-lg font-bold text-[var(--text-primary)]" id="leave-member-title">
            길드원 탈퇴 처리
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)]">{leavingMember.nickname}</strong>님의
            탈퇴일을 확인해주세요. 기존 활동 기록과 길드원 ID는 유지됩니다.
          </p>
          <label className="mt-5 block space-y-1 text-sm font-medium text-[var(--text-primary)]">
            <span>탈퇴일</span>
            <input
              className="ui-focus-ring min-h-11 w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
              onChange={(event) => setLeaveDate(event.target.value)}
              required
              type="date"
              onClick={openNativePicker}
              value={leaveDate}
            />
          </label>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              className="ui-focus-ring min-h-11 rounded-md border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--text-secondary)] hover:bg-neutral-50"
              onClick={() => setLeavingMemberId(null)}
              type="button"
            >
              취소
            </button>
            <button
              className="ui-focus-ring min-h-11 rounded-md bg-[var(--brand-strong)] px-4 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-40"
              disabled={!leaveDate}
              onClick={handleConfirmLeaveMember}
              type="button"
            >
              탈퇴 처리 확인
            </button>
          </div>
        </div>
      </div>
    ) : null}

    {selectedHistoryMember && historyMemberStats ? (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={handleCloseMemberHistory}
        role="presentation"
      >
        <div
          className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-md bg-white shadow-lg"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedHistoryMember.nickname} 활동 이력`}
        >
          <div className="flex items-start justify-between gap-3 border-b border-neutral-200 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-neutral-950">
                {selectedHistoryMember.nickname} 활동 이력
              </h3>
              <span className="rounded-sm bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                {memberStatusLabels[selectedHistoryMember.status]}
              </span>
            </div>
            <button
              className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
              type="button"
              onClick={handleCloseMemberHistory}
            >
              닫기
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            <div className="space-y-1">
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
              <button
                className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
                type="button"
                onClick={() => handleEditMember(selectedHistoryMember)}
              >
                정보 수정
              </button>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-neutral-900">
                활동 요약
              </h4>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
                <div className="rounded-md bg-neutral-100 px-3 py-2">
                  <dt className="text-xs text-neutral-500">전체 참여</dt>
                  <dd className="font-semibold text-neutral-950">
                    {historyMemberStats.total}회
                  </dd>
                </div>
                <div className="rounded-md bg-neutral-100 px-3 py-2">
                  <dt className="text-xs text-neutral-500">비공정</dt>
                  <dd className="font-semibold text-neutral-950">
                    {historyMemberStats.airship}회
                  </dd>
                </div>
                <div className="rounded-md bg-neutral-100 px-3 py-2">
                  <dt className="text-xs text-neutral-500">점령전</dt>
                  <dd className="font-semibold text-neutral-950">
                    {historyMemberStats.siege}회
                  </dd>
                </div>
                <div className="rounded-md bg-neutral-100 px-3 py-2">
                  <dt className="text-xs text-neutral-500">이벤트</dt>
                  <dd className="font-semibold text-neutral-950">
                    {historyMemberStats.other}회
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-neutral-900">
                활동 이력
              </h4>
              {selectedMemberActivities.length === 0 ? (
                <p className="mt-2 rounded-md border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500">
                  이 길드원이 참여한 활동 기록이 없습니다.
                </p>
              ) : (
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {selectedMemberActivities.map((activity) => (
                    <li
                      className="rounded-md border border-neutral-200 px-4 py-3"
                      key={activity.id}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <span className="text-xs text-neutral-500">
                            {formatDateRange(activity.date, activity.endDate)}
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
                        </div>
                        <span className="shrink-0 rounded-md bg-sky-100 px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)]">
                          참여 {activity.participantIds.length}명
                        </span>
                      </div>
                      <h5 className="mt-3 text-sm font-semibold text-neutral-950">
                        {activity.title || getActivityTypeLabel(activity)}
                      </h5>
                      {activity.memo ? (
                        <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-neutral-500">
                          {activity.memo}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
