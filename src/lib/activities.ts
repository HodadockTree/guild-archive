import type { ActivityLog } from "@/src/types";
import { readStorageList, writeStorageList } from "@/src/lib/storage";

const ACTIVITIES_STORAGE_KEY = "guild-archive:activities";

type NewActivityLog = Omit<ActivityLog, "id"> & {
  id?: string;
};

type ActivityLogUpdate = Partial<Omit<ActivityLog, "id">>;

type StoredActivityLog = ActivityLog & {
  participantMemberIds?: string[];
};

function createId() {
  return crypto.randomUUID();
}

export function getActivityLogs() {
  return readStorageList<StoredActivityLog>(ACTIVITIES_STORAGE_KEY).map(
    ({ participantMemberIds, ...activity }) => ({
      ...activity,
      participantIds: activity.participantIds ?? participantMemberIds ?? [],
    }),
  );
}

export function addActivityLog(activity: NewActivityLog) {
  const activities = getActivityLogs();
  const newActivity: ActivityLog = {
    ...activity,
    id: activity.id ?? createId(),
    participantIds: [...activity.participantIds],
  };

  writeStorageList(ACTIVITIES_STORAGE_KEY, [...activities, newActivity]);
  return newActivity;
}

export function updateActivityLog(activityId: string, update: ActivityLogUpdate) {
  let updatedActivity: ActivityLog | null = null;
  const activities = getActivityLogs().map((activity) => {
    if (activity.id !== activityId) {
      return activity;
    }

    updatedActivity = {
      ...activity,
      ...update,
      participantIds: update.participantIds ?? activity.participantIds,
    };
    return updatedActivity;
  });

  writeStorageList(ACTIVITIES_STORAGE_KEY, activities);
  return updatedActivity;
}

export function deleteActivityLog(activityId: string) {
  const activities = getActivityLogs();
  const nextActivities = activities.filter((activity) => activity.id !== activityId);

  writeStorageList(ACTIVITIES_STORAGE_KEY, nextActivities);
}
