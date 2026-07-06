"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { ActivityLog } from "@/src/types";
import { getActivityLogs } from "@/src/lib/activities";
import {
  getMonthDisplayLabel,
  getMonthlyArchiveSummaries,
} from "@/src/lib/monthlyArchive";

const ACTIVITIES_STORAGE_KEY = "guild-archive:activities";
const EMPTY_ACTIVITIES: ActivityLog[] = [];

let cachedActivitiesValue: string | null = null;
let cachedActivitiesSnapshot: ActivityLog[] = EMPTY_ACTIVITIES;

function subscribeStorage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
  };
}

function getServerActivitiesSnapshot() {
  return EMPTY_ACTIVITIES;
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

export default function ArchivePage() {
  const activities = useSyncExternalStore<ActivityLog[]>(
    subscribeStorage,
    getActivitiesSnapshot,
    getServerActivitiesSnapshot,
  );
  const monthlySummaries = getMonthlyArchiveSummaries(activities);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-5 py-10">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-neutral-500">
              월별 활동 아카이브
            </p>
            <h1 className="text-3xl font-bold text-neutral-950">
              냥춘 활동 아카이브
            </h1>
          </div>
          <Link
            className="w-fit rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
            href="/"
          >
            관리 화면으로 돌아가기
          </Link>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-neutral-600">
          기록이 있는 월만 모아 월간 리포트로 바로 이동할 수 있습니다.
        </p>
      </header>

      <p className="rounded-md bg-neutral-100 px-4 py-3 text-sm leading-6 text-neutral-600">
        현재는 이 브라우저에 저장된 활동 기록을 기준으로 표시됩니다. 다른
        기기나 다른 사람의 화면에는 동일한 데이터가 보이지 않을 수 있습니다.
      </p>

      {monthlySummaries.length === 0 ? (
        <section className="rounded-md border border-dashed border-neutral-300 bg-white px-5 py-10 text-center">
          <h2 className="text-lg font-semibold text-neutral-950">
            아직 기록된 활동이 없습니다.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-neutral-500">
            관리 화면에서 활동을 추가하면 월별 아카이브가 자동으로 생성됩니다.
          </p>
        </section>
      ) : (
        <section className="grid gap-4">
          {monthlySummaries.map((summary) => (
            <Link
              className="block rounded-md border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-900 hover:shadow-md"
              href={`/viewer?month=${summary.month}`}
              key={summary.month}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-neutral-500">
                      {summary.month}
                    </p>
                    <h2 className="text-2xl font-bold text-neutral-950">
                      {getMonthDisplayLabel(summary.month)}
                    </h2>
                  </div>

                  {summary.representativeEvents.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold text-neutral-500">
                        대표 이벤트
                      </p>
                      <ul className="mt-1 flex flex-wrap gap-2">
                        {summary.representativeEvents.map((event) => (
                          <li
                            className="rounded-sm bg-neutral-100 px-2 py-1 text-xs text-neutral-700"
                            key={event.id}
                          >
                            {event.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-500">
                      대표 이벤트가 없는 월입니다.
                    </p>
                  )}
                </div>

                <dl className="grid shrink-0 grid-cols-2 gap-2 text-sm sm:w-72">
                  <div className="rounded-md bg-neutral-100 px-3 py-3">
                    <dt className="text-xs text-neutral-500">활동 수</dt>
                    <dd className="font-semibold text-neutral-950">
                      {summary.activityCount}회
                    </dd>
                  </div>
                  <div className="rounded-md bg-neutral-100 px-3 py-3">
                    <dt className="text-xs text-neutral-500">이벤트 수</dt>
                    <dd className="font-semibold text-neutral-950">
                      {summary.eventCount}회
                    </dd>
                  </div>
                  <div className="rounded-md bg-neutral-100 px-3 py-3">
                    <dt className="text-xs text-neutral-500">참여 길드원</dt>
                    <dd className="font-semibold text-neutral-950">
                      {summary.participantMemberCount}명
                    </dd>
                  </div>
                  <div className="rounded-md bg-neutral-100 px-3 py-3">
                    <dt className="text-xs text-neutral-500">총 참여 횟수</dt>
                    <dd className="font-semibold text-neutral-950">
                      {summary.totalParticipationCount}회
                    </dd>
                  </div>
                </dl>
              </div>

              <span className="mt-4 inline-flex rounded-md bg-neutral-950 px-3 py-2 text-sm font-semibold text-white">
                월간 리포트 보기
              </span>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
