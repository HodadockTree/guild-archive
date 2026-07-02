import type { ActivityLog, ConquestType } from "@/src/types";
import { getActivityStatsType, getKnownAirshipType } from "@/src/lib/activityStats";

export const conquestTypes = [
  "용기",
  "신념",
  "평화",
  "신성",
  "지혜",
  "예언",
  "초심",
  "긍지",
  "역전",
] as const satisfies readonly ConquestType[];

const conquestTypeSet = new Set<ConquestType>(conquestTypes);

const airshipSummaryLabels = {
  ocean: "오션헤븐",
  aurora: "아우로라",
} as const;

export function getKnownConquestTypes(value: unknown): ConquestType[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const knownTypes = value.filter((item): item is ConquestType =>
    conquestTypeSet.has(item as ConquestType),
  );

  return Array.from(new Set(knownTypes));
}

export function getSiegeActivityLabel(activity: ActivityLog) {
  const knownConquestTypes = getKnownConquestTypes(activity.conquestTypes);

  if (knownConquestTypes.length === 0) {
    return "점령전";
  }

  return `점령전 (${knownConquestTypes.join(", ")})`;
}

export function getMonthlyActivityLabel(activity: ActivityLog) {
  const statsType = getActivityStatsType(activity.type);

  if (statsType === "siege") {
    return getSiegeActivityLabel(activity);
  }

  if (statsType === "airship") {
    const airshipType = getKnownAirshipType(activity.airshipType);
    return airshipType ? airshipSummaryLabels[airshipType] : "비공정";
  }

  return "이벤트";
}
