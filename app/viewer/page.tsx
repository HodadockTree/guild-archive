"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import type { ActivityLog, GuildMember } from "@/src/types";
import { getActivityLogs } from "@/src/lib/activities";
import { getMembers } from "@/src/lib/members";
import { getMonthlyActivityLabel } from "@/src/lib/activityLabels";
import {
  getAvailableActivityMonths,
  getDefaultReportMonth,
  getMonthlyReport,
} from "@/src/lib/monthlyReport";

const EMPTY_ACTIVITIES: ActivityLog[] = [];
const EMPTY_MEMBERS: GuildMember[] = [];
const ACTIVITIES_STORAGE_KEY = "guild-archive:activities";
const MEMBERS_STORAGE_KEY = "guild-archive:members";

let cachedActivitiesValue: string | null = null;
let cachedActivitiesSnapshot: ActivityLog[] = EMPTY_ACTIVITIES;
let cachedMembersValue: string | null = null;
let cachedMembersSnapshot: GuildMember[] = EMPTY_MEMBERS;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-");
  return year && monthNumber ? `${year}년 ${Number(monthNumber)}월` : month;
}

function getDisplayDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(5).replace("-", "/") : date;
}

function getActivityTitle(activity: ActivityLog) {
  return activity.title?.trim() || getMonthlyActivityLabel(activity);
}

function subscribeStorage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
  };
}

function subscribeLocation(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);

  return () => {
    window.removeEventListener("popstate", onStoreChange);
  };
}

function getServerActivitiesSnapshot() {
  return EMPTY_ACTIVITIES;
}

function getServerMembersSnapshot() {
  return EMPTY_MEMBERS;
}

function getServerMonthSnapshot() {
  return "";
}

function getMonthSnapshot() {
  return new URLSearchParams(window.location.search).get("month") ?? "";
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

function getMembersSnapshot() {
  const storedMembers = window.localStorage.getItem(MEMBERS_STORAGE_KEY);

  if (storedMembers === cachedMembersValue) {
    return cachedMembersSnapshot;
  }

  cachedMembersValue = storedMembers;
  cachedMembersSnapshot = getMembers();
  return cachedMembersSnapshot;
}

function ViewerImage({
  alt,
  src,
}: {
  alt: string;
  src: string;
}) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      alt={alt}
      className="mt-3 max-h-72 w-full rounded-md border border-neutral-200 object-contain"
      src={src}
    />
  );
}

export default function ViewerPage() {
  const [selectedMonth, setSelectedMonth] = useState("");
  const queryMonth = useSyncExternalStore<string>(
    subscribeLocation,
    getMonthSnapshot,
    getServerMonthSnapshot,
  );
  const activities = useSyncExternalStore<ActivityLog[]>(
    subscribeStorage,
    getActivitiesSnapshot,
    getServerActivitiesSnapshot,
  );
  const members = useSyncExternalStore<GuildMember[]>(
    subscribeStorage,
    getMembersSnapshot,
    getServerMembersSnapshot,
  );

  const currentMonth = today().slice(0, 7);
  const availableMonths = getAvailableActivityMonths(activities);
  const defaultMonth = getDefaultReportMonth(activities, today());
  const reportMonth = selectedMonth || queryMonth || defaultMonth;
  const monthOptions = useMemo(
    () =>
      Array.from(
        new Set([reportMonth, currentMonth, ...availableMonths].filter(Boolean)),
      ).sort((a, b) => b.localeCompare(a)),
    [availableMonths, currentMonth, reportMonth],
  );
  const monthlyReport = getMonthlyReport(activities, members, reportMonth);
  const topParticipants = monthlyReport.topParticipants.slice(0, 5);
  const recentActivities = [...monthlyReport.activities].sort((a, b) => {
    const dateOrder = b.date.localeCompare(a.date);
    return dateOrder === 0 ? b.id.localeCompare(a.id) : dateOrder;
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-5 py-10">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-neutral-500">
              보기 전용 활동 리포트
            </p>
            <h1 className="text-3xl font-bold text-neutral-950">
              냥춘 활동 리포트
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="w-fit rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
              href="/archive"
            >
              아카이브로 돌아가기
            </Link>
            <Link
              className="w-fit rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
              href="/"
            >
              관리 화면으로 돌아가기
            </Link>
          </div>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-neutral-600">
          이 화면은 현재 기기에 저장된 길드 활동 기록을 보기 좋게 정리한
          화면입니다. 아직 온라인 공유 기능은 없으며, 톡방 공유 시에는 화면
          캡처를 활용할 수 있습니다.
        </p>
      </header>

      <section className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
        <label className="flex max-w-xs flex-col gap-1 text-sm font-medium text-neutral-700">
          <span>월 선택</span>
          <select
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-900"
            value={reportMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          >
            {monthOptions.map((month) => (
              <option key={month} value={month}>
                {getMonthLabel(month)}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="space-y-5 rounded-md border border-neutral-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-neutral-950">
            {getMonthLabel(reportMonth)} 월간 요약
          </h2>
          {activities.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-500">
              아직 현재 기기에 저장된 활동 기록이 없습니다.
            </p>
          ) : null}
        </div>

        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["전체 활동 수", `${monthlyReport.totalActivities}회`],
            ["참여 길드원 수", `${monthlyReport.participantMemberCount}명`],
            ["총 참여 횟수", `${monthlyReport.totalParticipationCount}회`],
            ["비공정 횟수", `${monthlyReport.airshipCount}회`],
            ["점령전 횟수", `${monthlyReport.siegeCount}회`],
            ["이벤트 횟수", `${monthlyReport.otherCount}회`],
          ].map(([label, value]) => (
            <div className="rounded-md bg-neutral-100 px-4 py-4" key={label}>
              <dt className="text-xs font-medium text-neutral-500">{label}</dt>
              <dd className="text-2xl font-bold text-neutral-950">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-neutral-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-neutral-950">
            활동 종류별 통계
          </h2>
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

          <h3 className="mt-5 text-sm font-semibold text-neutral-900">
            점령전 세부 카테고리
          </h3>
          {monthlyReport.conquestSummaries.length === 0 ? (
            <p className="mt-3 rounded-md border border-dashed border-neutral-300 px-3 py-5 text-center text-sm text-neutral-500">
              기록된 점령전 세부 카테고리가 없습니다.
            </p>
          ) : (
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
              {monthlyReport.conquestSummaries.map((summary) => (
                <div
                  className="rounded-md bg-neutral-100 px-3 py-2.5"
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

        <div className="rounded-md border border-neutral-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-neutral-950">
            월간 참여 TOP 5
          </h2>
          {topParticipants.length === 0 ? (
            <p className="mt-3 rounded-md border border-dashed border-neutral-300 px-3 py-5 text-center text-sm text-neutral-500">
              이 달의 참여 기록이 없습니다.
            </p>
          ) : (
            <ol className="mt-3 space-y-2">
              {topParticipants.map((participant, index) => (
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
      </section>

      {monthlyReport.eventSummaries.length > 0 ? (
        <section className="rounded-md border border-neutral-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-neutral-950">
            이번 달 이벤트
          </h2>
          <ul className="mt-3 space-y-3">
            {monthlyReport.eventSummaries.map((activity) => (
              <li
                className="rounded-md bg-neutral-100 px-3 py-3 text-sm"
                key={activity.id}
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-500">{activity.date}</p>
                    <h3 className="truncate font-semibold text-neutral-950">
                      {activity.title}
                    </h3>
                  </div>
                  <span className="w-fit shrink-0 rounded-md bg-neutral-950 px-2.5 py-1 text-xs font-semibold text-white">
                    참여 {activity.participantCount}명
                  </span>
                </div>
                {activity.memo ? (
                  <p className="mt-2 whitespace-pre-wrap text-neutral-600">
                    {activity.memo}
                  </p>
                ) : null}
                {activity.imageDataUrl ? (
                  <ViewerImage alt="이벤트 첨부 이미지" src={activity.imageDataUrl} />
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-neutral-950">
          최근 활동 기록
        </h2>
        {recentActivities.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-neutral-300 px-3 py-5 text-center text-sm text-neutral-500">
            선택한 월에 저장된 활동 기록이 없습니다.
          </p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentActivities.map((activity) => (
              <li
                className="flex min-h-44 flex-col rounded-md border border-neutral-200 px-4 py-3 text-sm shadow-sm"
                key={activity.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span className="text-xs text-neutral-500">
                      {getDisplayDate(activity.date)}
                    </span>
                    <span className="rounded-sm bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                      {getMonthlyActivityLabel(activity)}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-md bg-neutral-950 px-2.5 py-1 text-xs font-semibold text-white">
                    참여 {activity.participantIds.length}명
                  </span>
                </div>
                <h3 className="mt-3 text-base font-semibold leading-6 text-neutral-950">
                  {getActivityTitle(activity)}
                </h3>
                {activity.memo?.trim() ? (
                  <p className="mt-2 line-clamp-4 whitespace-pre-wrap leading-6 text-neutral-600">
                    {activity.memo.trim()}
                  </p>
                ) : null}
                {activity.imageDataUrl ? (
                  <ViewerImage alt="활동 첨부 이미지" src={activity.imageDataUrl} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="rounded-md bg-neutral-100 px-4 py-3 text-sm leading-6 text-neutral-600">
        이 화면은 현재 기기에 저장된 길드 활동 기록을 보기 좋게 정리한
        화면입니다. 아직 온라인 공유 기능은 없으며, 톡방 공유 시에는 화면
        캡처를 활용할 수 있습니다.
      </p>
    </main>
  );
}
