"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ActivityLog } from "@/src/types";
import { getMonthlyActivityLabel } from "@/src/lib/activityLabels";
import type { MonthlyReport } from "@/src/lib/monthlyReport";
import {
  ActivityDetailModal,
  type ActivityDetail,
} from "@/src/components/ActivityDetailModal";
import { AppHeader } from "@/src/components/ui/AppHeader";

type MonthSummary = {
  month: string;
};

type MonthsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; months: MonthSummary[] };

type ReportState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; report: MonthlyReport; hasData: boolean };

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

function getMostFrequentActivityType(report: MonthlyReport) {
  const summaries = [
    { label: "비공정", count: report.airshipCount },
    { label: "점령전", count: report.siegeCount },
    { label: "이벤트", count: report.otherCount },
  ].sort((a, b) => b.count - a.count);

  return summaries[0]?.count ? summaries[0] : null;
}

function getMostParticipatedActivity<T extends ActivityLog>(activities: T[]) {
  return [...activities].sort((a, b) => {
    const participantOrder = b.participantIds.length - a.participantIds.length;

    if (participantOrder !== 0) {
      return participantOrder;
    }

    const dateOrder = b.date.localeCompare(a.date);
    return dateOrder === 0 ? b.id.localeCompare(a.id) : dateOrder;
  })[0];
}

function toActivityDetail(activity: ActivityLog & { participantNames?: string[] }) {
  return {
    id: activity.id,
    date: activity.date,
    label: getMonthlyActivityLabel(activity),
    title: getActivityTitle(activity),
    participantCount: activity.participantIds.length,
    participantNames: activity.participantNames ?? [],
    memo: activity.memo?.trim() || undefined,
    imageDataUrl: activity.imageDataUrl,
  };
}

function subscribeLocation(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);

  return () => {
    window.removeEventListener("popstate", onStoreChange);
  };
}

function getServerMonthSnapshot() {
  return "";
}

function getMonthSnapshot() {
  return new URLSearchParams(window.location.search).get("month") ?? "";
}

function ViewerImage({
  alt,
  className,
  src,
}: {
  alt: string;
  className?: string;
  src: string;
}) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      alt={alt}
      className={
        className ??
        "mt-3 max-h-72 w-full rounded-md border border-sky-100 object-contain"
      }
      src={src}
    />
  );
}

export default function ViewerPage() {
  const [selectedMonth, setSelectedMonth] = useState("");
  const [monthsState, setMonthsState] = useState<MonthsState>({
    status: "loading",
  });
  const [reportState, setReportState] = useState<ReportState>({
    status: "idle",
  });
  const [selectedActivity, setSelectedActivity] =
    useState<ActivityDetail | null>(null);
  const queryMonth = useSyncExternalStore<string>(
    subscribeLocation,
    getMonthSnapshot,
    getServerMonthSnapshot,
  );

  useEffect(() => {
    let isActive = true;

    async function loadMonths() {
      setMonthsState({ status: "loading" });

      try {
        const response = await fetch("/api/archive/months", {
          cache: "no-store",
        });
        const data: unknown = await response.json();

        if (
          !response.ok ||
          typeof data !== "object" ||
          data === null ||
          !("months" in data) ||
          !Array.isArray(data.months)
        ) {
          throw new Error("월 목록을 불러오지 못했습니다.");
        }

        if (isActive) {
          setMonthsState({
            status: "success",
            months: data.months as MonthSummary[],
          });
        }
      } catch (error) {
        if (isActive) {
          setMonthsState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "월 목록을 불러오지 못했습니다.",
          });
        }
      }
    }

    loadMonths();

    return () => {
      isActive = false;
    };
  }, []);

  const serverMonths = useMemo(
    () =>
      monthsState.status === "success"
        ? monthsState.months.map((summary) => summary.month)
        : [],
    [monthsState],
  );
  const currentMonth = today().slice(0, 7);
  const reportMonth = selectedMonth || queryMonth || serverMonths[0] || currentMonth;
  const monthOptions = useMemo(
    () =>
      Array.from(
        new Set([reportMonth, currentMonth, ...serverMonths].filter(Boolean)),
      ).sort((a, b) => b.localeCompare(a)),
    [currentMonth, reportMonth, serverMonths],
  );

  useEffect(() => {
    if (!reportMonth) {
      return;
    }

    let isActive = true;

    async function loadReport() {
      setReportState({ status: "loading" });

      try {
        const response = await fetch(
          `/api/archive/months/${encodeURIComponent(reportMonth)}`,
          { cache: "no-store" },
        );
        const data: unknown = await response.json();

        if (
          !response.ok ||
          typeof data !== "object" ||
          data === null ||
          !("report" in data) ||
          !("hasData" in data)
        ) {
          throw new Error("월간 리포트를 불러오지 못했습니다.");
        }

        if (isActive) {
          setReportState({
            status: "success",
            report: data.report as MonthlyReport,
            hasData: Boolean(data.hasData),
          });
        }
      } catch (error) {
        if (isActive) {
          setReportState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "월간 리포트를 불러오지 못했습니다.",
          });
        }
      }
    }

    loadReport();

    return () => {
      isActive = false;
    };
  }, [reportMonth]);

  const monthlyReport =
    reportState.status === "success" ? reportState.report : null;
  const hasReportData =
    reportState.status === "success" ? reportState.hasData : false;
  const mostFrequentActivityType = monthlyReport
    ? getMostFrequentActivityType(monthlyReport)
    : null;
  const mostParticipatedActivity = monthlyReport
    ? getMostParticipatedActivity(monthlyReport.activities)
    : null;
  const recentActivities = monthlyReport
    ? [...monthlyReport.activities].sort((a, b) => {
        const dateOrder = b.date.localeCompare(a.date);
        return dateOrder === 0 ? b.id.localeCompare(a.id) : dateOrder;
      })
    : [];
  const activitiesById = new Map(
    monthlyReport?.activities.map((activity) => [activity.id, activity]) ?? [],
  );

  return (
    <main className="app-shell">
      <AppHeader
        currentPath="/viewer"
        eyebrow="월간 활동 리포트"
        title="냥춘 활동 리포트"
      />

      <section className="rounded-md border border-sky-100 bg-white p-4 shadow-sm shadow-sky-100/50">
        <label className="flex max-w-xs flex-col gap-1 text-sm font-medium text-slate-700">
          <span>월 선택</span>
          <select
            className="w-full rounded-md border border-sky-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-300"
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

      {monthsState.status === "error" ? (
        <section className="rounded-md border border-red-100 bg-red-50 px-5 py-6">
          <h2 className="text-lg font-semibold text-red-800">
            월 목록을 불러오지 못했습니다.
          </h2>
          <p className="mt-2 text-sm text-red-700">{monthsState.message}</p>
        </section>
      ) : null}

      {reportState.status === "loading" ? (
        <section className="rounded-md border border-sky-100 bg-white p-5 shadow-sm shadow-sky-100/50">
          <h2 className="text-lg font-semibold text-slate-900">
            월간 리포트를 불러오는 중입니다.
          </h2>
        </section>
      ) : null}

      {reportState.status === "error" ? (
        <section className="rounded-md border border-red-100 bg-red-50 px-5 py-6">
          <h2 className="text-lg font-semibold text-red-800">
            월간 리포트를 불러오지 못했습니다.
          </h2>
          <p className="mt-2 text-sm text-red-700">{reportState.message}</p>
        </section>
      ) : null}

      {monthlyReport && !hasReportData ? (
        <section className="rounded-md border border-dashed border-sky-200 bg-white px-5 py-10 text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            {getMonthLabel(reportMonth)} 활동 기록이 없습니다.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            다른 월을 선택하면 기록된 활동을 볼 수 있습니다.
          </p>
        </section>
      ) : null}

      {monthlyReport && hasReportData ? (
        <>
          <section className="space-y-5 rounded-md border border-sky-100 bg-white p-5 shadow-sm shadow-sky-100/50">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">
                {getMonthLabel(reportMonth)} 활동 리포트
              </h2>
              <p className="text-sm leading-6 text-slate-600">
                이번 달에는 {monthlyReport.totalActivities}개의 활동이 기록되었고,{" "}
                {monthlyReport.participantMemberCount}명의 길드원이 한 번 이상 함께했습니다.
              </p>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["이번 달 활동", `${monthlyReport.totalActivities}회`],
                ["함께한 길드원", `${monthlyReport.participantMemberCount}명`],
                [
                  "가장 많이 진행한 활동",
                  mostFrequentActivityType
                    ? `${mostFrequentActivityType.label} ${mostFrequentActivityType.count}회`
                    : "없음",
                ],
                [
                  "가장 참여가 많았던 활동",
                  mostParticipatedActivity
                    ? `${getActivityTitle(mostParticipatedActivity)} · ${mostParticipatedActivity.participantIds.length}명`
                    : "없음",
                ],
              ].map(([label, value]) => (
                <div className="rounded-md bg-sky-50 px-4 py-4" key={label}>
                  <dt className="text-xs font-medium text-slate-500">{label}</dt>
                  <dd className="text-2xl font-bold text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-md border border-sky-100 bg-white p-5 shadow-sm shadow-sky-100/50">
              <h2 className="text-lg font-semibold text-slate-900">
                활동 종류별 통계
              </h2>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-md bg-sky-50 px-3 py-3">
                  <dt className="text-slate-500">비공정</dt>
                  <dd className="font-semibold text-slate-900">
                    {monthlyReport.airshipCount}개
                  </dd>
                </div>
                <div className="rounded-md bg-sky-50 px-3 py-3">
                  <dt className="text-slate-500">점령전</dt>
                  <dd className="font-semibold text-slate-900">
                    {monthlyReport.siegeCount}개
                  </dd>
                </div>
                <div className="rounded-md bg-sky-50 px-3 py-3">
                  <dt className="text-slate-500">이벤트</dt>
                  <dd className="font-semibold text-slate-900">
                    {monthlyReport.otherCount}개
                  </dd>
                </div>
              </dl>

              <h3 className="mt-5 text-sm font-semibold text-slate-900">
                점령전 세부 카테고리
              </h3>
              {monthlyReport.conquestSummaries.length === 0 ? (
                <p className="mt-3 rounded-md border border-dashed border-sky-200 bg-sky-50 px-3 py-5 text-center text-sm text-slate-500">
                  기록된 점령전 세부 카테고리가 없습니다.
                </p>
              ) : (
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                  {monthlyReport.conquestSummaries.map((summary) => (
                    <div
                      className="rounded-md bg-sky-50 px-3 py-2.5"
                      key={summary.label}
                    >
                      <dt className="text-slate-500">{summary.label}</dt>
                      <dd className="font-semibold text-slate-900">
                        {summary.count}회
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>

            <div className="rounded-md border border-sky-100 bg-white p-5 shadow-sm shadow-sky-100/50">
              <h2 className="text-lg font-semibold text-slate-900">
                가장 참여가 많았던 활동
              </h2>
              {!mostParticipatedActivity ? (
                <p className="mt-3 rounded-md border border-dashed border-sky-200 bg-sky-50 px-3 py-5 text-center text-sm text-slate-500">
                  이 달의 활동 기록이 없습니다.
                </p>
              ) : (
                <button
                  className="mt-3 w-full rounded-md bg-sky-50 px-4 py-4 text-left text-sm transition hover:bg-sky-100/70 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2"
                  onClick={() => setSelectedActivity(toActivityDetail(mostParticipatedActivity))}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">
                        {mostParticipatedActivity.date}
                      </p>
                      <h3 className="mt-1 text-base font-semibold leading-6 text-slate-900">
                        {getActivityTitle(mostParticipatedActivity)}
                      </h3>
                    </div>
                    <span className="shrink-0 rounded-md bg-sky-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      참여 {mostParticipatedActivity.participantIds.length}명
                    </span>
                  </div>
                  {mostParticipatedActivity.memo?.trim() ? (
                    <p className="mt-3 line-clamp-4 whitespace-pre-wrap leading-6 text-slate-600">
                      {mostParticipatedActivity.memo.trim()}
                    </p>
                  ) : null}
                </button>
              )}
            </div>
          </section>

          {monthlyReport.eventSummaries.length > 0 ? (
            <section className="rounded-md border border-sky-100 bg-white p-5 shadow-sm shadow-sky-100/50">
              <h2 className="text-lg font-semibold text-slate-900">
                이번 달 이벤트
              </h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {monthlyReport.eventSummaries.map((activity) => (
                  <li
                    className="rounded-md border border-sky-100 bg-white px-3 py-3 text-sm shadow-sm shadow-sky-100/40 transition hover:border-sky-200 hover:bg-sky-50/40"
                    key={activity.id}
                  >
                    <button
                      className="w-full text-left focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2"
                      onClick={() => {
                        const detailActivity = activitiesById.get(activity.id);

                        if (detailActivity) {
                          setSelectedActivity(toActivityDetail(detailActivity));
                        }
                      }}
                      type="button"
                    >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">
                          {activity.date}
                        </p>
                        <h3 className="truncate font-semibold text-slate-900">
                          {activity.title}
                        </h3>
                      </div>
                      <span className="w-fit shrink-0 rounded-md bg-sky-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        참여 {activity.participantCount}명
                      </span>
                    </div>
                    {activity.memo ? (
                      <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-slate-600">
                        {activity.memo}
                      </p>
                    ) : null}
                    {activity.imageDataUrl ? (
                      <ViewerImage
                        alt="이벤트 첨부 이미지"
                        src={activity.imageDataUrl}
                      />
                    ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="rounded-md border border-sky-100 bg-white p-5 shadow-sm shadow-sky-100/50">
            <h2 className="text-lg font-semibold text-slate-900">
              최근 활동 기록
            </h2>
            {recentActivities.length === 0 ? (
              <p className="mt-3 rounded-md border border-dashed border-sky-200 bg-sky-50 px-3 py-5 text-center text-sm text-slate-500">
                선택한 월에 저장된 활동 기록이 없습니다.
              </p>
            ) : (
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {recentActivities.map((activity) => (
                  <li
                    className={`flex rounded-md border border-sky-100 bg-white shadow-sm shadow-sky-100/50 transition hover:border-sky-200 hover:bg-sky-50/40 ${
                      activity.imageDataUrl ? "flex-col overflow-hidden" : "flex-col px-4 py-4"
                    }`}
                    key={activity.id}
                  >
                    <button
                      className="flex w-full flex-1 flex-col text-left focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2"
                      onClick={() => setSelectedActivity(toActivityDetail(activity))}
                      type="button"
                    >
                    {activity.imageDataUrl ? (
                      <ViewerImage
                        alt="활동 첨부 이미지"
                        className="max-h-56 w-full border-b border-sky-100 object-contain"
                        src={activity.imageDataUrl}
                      />
                    ) : null}
                    <div
                      className={
                        activity.imageDataUrl
                          ? "flex flex-1 flex-col px-4 py-4"
                          : "flex flex-1 flex-col"
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <span className="text-xs text-slate-500">
                            {getDisplayDate(activity.date)}
                          </span>
                        </div>
                        <span className="shrink-0 rounded-md bg-sky-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {activity.participantIds.length}명
                        </span>
                      </div>
                      <h3 className="mt-3 text-base font-semibold leading-6 text-slate-900">
                        {getActivityTitle(activity)}
                      </h3>
                      {activity.memo?.trim() ? (
                        <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                          {activity.memo.trim()}
                        </p>
                      ) : null}
                    </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      <ActivityDetailModal
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />
    </main>
  );
}
