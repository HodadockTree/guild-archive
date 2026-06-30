import type { ActivityLog } from "@/src/types";
import { readStorageList, writeStorageList } from "@/src/lib/storage";

const ACTIVITIES_STORAGE_KEY = "guild-archive:activities";

type NewActivityLog = Omit<ActivityLog, "id"> & {
  id?: string;
};

type ActivityLogUpdate = Partial<Omit<ActivityLog, "id">>;

function createId() {
  return crypto.randomUUID();
}

export function getActivityLogs() {
  return readStorageList<ActivityLog>(ACTIVITIES_STORAGE_KEY);
}

export function addActivityLog(activity: NewActivityLog) {
  const activities = getActivityLogs();
  const newActivity: ActivityLog = {
    ...activity,
    id: activity.id ?? createId(),
    participantMemberIds: [...activity.participantMemberIds],
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
      participantMemberIds:
        update.participantMemberIds ?? activity.participantMemberIds,
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
