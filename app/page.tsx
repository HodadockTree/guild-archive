"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  DashboardActivitySummary,
  DashboardMonthlyTrend,
  DashboardStats,
} from "@/src/lib/dashboardStats";

type DashboardState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; dashboard: DashboardStats };

function getMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-");
  return year && monthNumber ? `${year}년 ${Number(monthNumber)}월` : month;
}

function getShortMonthLabel(month: string) {
  const [, monthNumber] = month.split("-");
  return monthNumber ? `${Number(monthNumber)}월` : month;
}

function getDisplayDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(5).replace("-", "/") : date;
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white px-4 py-4 shadow-sm">
      <dt className="text-sm font-medium text-neutral-500">{label}</dt>
      <dd className="mt-2 text-3xl font-bold text-neutral-950">{value}</dd>
      <p className="mt-2 text-sm leading-6 text-neutral-500">{detail}</p>
    </div>
  );
}

function TrendChart({
  title,
  description,
  emptyMessage,
  trends,
  valueKey,
  unit,
}: {
  title: string;
  description: string;
  emptyMessage: string;
  trends: DashboardMonthlyTrend[];
  valueKey: "activityCount" | "participantMemberCount";
  unit: string;
}) {
  const maxValue = Math.max(...trends.map((trend) => trend[valueKey]), 0);

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-neutral-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-neutral-500">{description}</p>
      </div>

      {trends.length < 2 || maxValue === 0 ? (
        <p className="mt-5 rounded-md border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500">
          {emptyMessage}
        </p>
      ) : (
        <div className="mt-6 flex h-64 items-end gap-3 border-b border-neutral-200 pb-3">
          {trends.map((trend) => {
            const value = trend[valueKey];
            const height = Math.max(8, Math.round((value / maxValue) * 100));

            return (
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2" key={trend.month}>
                <span className="text-xs font-semibold text-neutral-700">
                  {value}
                  {unit}
                </span>
                <div className="flex h-44 w-full items-end rounded-sm bg-neutral-100">
                  <div
                    className="w-full rounded-sm bg-neutral-950"
                    style={{ height: `${height}%` }}
                    aria-label={`${getMonthLabel(trend.month)} ${value}${unit}`}
                    title={`${getMonthLabel(trend.month)} ${value}${unit}`}
                  />
                </div>
                <span className="w-full truncate text-center text-xs text-neutral-500">
                  {getShortMonthLabel(trend.month)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ActivityCard({ activity }: { activity: DashboardActivitySummary }) {
  return (
    <li
      className={`flex rounded-md border border-neutral-200 bg-white shadow-sm ${
        activity.imageDataUrl ? "flex-col overflow-hidden" : "flex-col px-4 py-4"
      }`}
    >
      {activity.imageDataUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          alt={`${activity.title} 활동 사진`}
          className="max-h-56 w-full border-b border-neutral-200 object-contain"
          src={activity.imageDataUrl}
        />
      ) : null}

      <div className={activity.imageDataUrl ? "flex flex-1 flex-col px-4 py-4" : "flex flex-1 flex-col"}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="text-xs text-neutral-500">
              {getDisplayDate(activity.date)}
            </span>
            <span className="rounded-sm bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
              {activity.label}
            </span>
          </div>
          <span className="shrink-0 rounded-md bg-neutral-950 px-2.5 py-1 text-xs font-semibold text-white">
            {activity.participantCount}명
          </span>
        </div>

        <h3 className="mt-3 text-base font-semibold leading-6 text-neutral-950">
          {activity.title}
        </h3>
        {activity.memo ? (
          <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-neutral-600">
            {activity.memo}
          </p>
        ) : (
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            함께한 인원과 활동 흐름을 중심으로 기록된 활동입니다.
          </p>
        )}
      </div>
    </li>
  );
}

export default function DashboardPage() {
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    status: "loading",
  });

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      setDashboardState({ status: "loading" });

      try {
        const response = await fetch("/api/dashboard", { cache: "no-store" });
        const data: unknown = await response.json();

        if (
          !response.ok ||
          typeof data !== "object" ||
          data === null ||
          !("dashboard" in data)
        ) {
          throw new Error("홈 대시보드 데이터를 불러오지 못했습니다.");
        }

        if (isActive) {
          setDashboardState({
            status: "success",
            dashboard: data.dashboard as DashboardStats,
          });
        }
      } catch (error) {
        if (isActive) {
          setDashboardState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "홈 대시보드 데이터를 불러오지 못했습니다.",
          });
        }
      }
    }

    loadDashboard();

    return () => {
      isActive = false;
    };
  }, []);

  const dashboard =
    dashboardState.status === "success" ? dashboardState.dashboard : null;
  const latestMonth = useMemo(
    () => dashboard?.monthlyTrends.at(-1)?.month ?? "",
    [dashboard],
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-7 px-5 py-10">
      <header className="flex flex-col gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-neutral-500">
            냥춘 길드 활동 아카이브
          </p>
          <h1 className="text-3xl font-bold text-neutral-950">
            길드 현황 대시보드
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-neutral-600">
            기록된 활동을 바탕으로 현재 길드 규모와 월별 활동 흐름을 한눈에 볼 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
            href="/archive"
          >
            월별 아카이브
          </Link>
          <Link
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
            href="/viewer"
          >
            월간 리포트
          </Link>
          <Link
            className="rounded-md bg-neutral-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
            href="/admin"
          >
            관리자
          </Link>
        </div>
      </header>

      {dashboardState.status === "loading" ? (
        <section className="rounded-md border border-neutral-200 bg-white px-5 py-10 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-950">
            대시보드 데이터를 불러오는 중입니다.
          </h2>
        </section>
      ) : null}

      {dashboardState.status === "error" ? (
        <section className="rounded-md border border-red-100 bg-red-50 px-5 py-10 text-center">
          <h2 className="text-lg font-semibold text-red-800">
            대시보드 데이터를 불러오지 못했습니다.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-red-700">
            {dashboardState.message}
          </p>
        </section>
      ) : null}

      {dashboard ? (
        <>
          <section>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                label="현재 길드원 수"
                value={`${dashboard.activeMemberCount}명`}
                detail="활동중 상태인 길드원 기준입니다."
              />
              <SummaryCard
                label="이번 달 활동 수"
                value={`${dashboard.currentMonthActivityCount}회`}
                detail={latestMonth ? `${getMonthLabel(latestMonth)}까지의 기록 흐름입니다.` : "기록이 쌓이면 월별 흐름이 표시됩니다."}
              />
              <SummaryCard
                label="이번 달 함께한 길드원"
                value={`${dashboard.currentMonthParticipantMemberCount}명`}
                detail="이번 달 한 번 이상 활동에 참여한 고유 인원입니다."
              />
              <SummaryCard
                label="최근 활동"
                value={dashboard.recentActivity ? dashboard.recentActivity.title : "없음"}
                detail={
                  dashboard.recentActivity
                    ? `${dashboard.recentActivity.date} · ${dashboard.recentActivity.label}`
                    : "아직 기록된 활동이 없습니다."
                }
              />
            </dl>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <TrendChart
              title="월별 활동량"
              description="월별로 기록된 활동 수를 보여줍니다."
              emptyMessage="그래프로 표시할 활동 데이터가 아직 부족합니다."
              trends={dashboard.monthlyTrends}
              valueKey="activityCount"
              unit="회"
            />
            <TrendChart
              title="월별 참여 인원"
              description="해당 월에 한 번이라도 함께한 고유 길드원 수입니다."
              emptyMessage="그래프로 표시할 참여 데이터가 아직 부족합니다."
              trends={dashboard.monthlyTrends}
              valueKey="participantMemberCount"
              unit="명"
            />
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-950">
                  최근 활동
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  최신 기록을 사진 여부와 관계없이 같은 밀도로 확인할 수 있습니다.
                </p>
              </div>
              <Link
                className="w-fit rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
                href="/viewer"
              >
                리포트로 보기
              </Link>
            </div>

            {dashboard.recentActivities.length === 0 ? (
              <p className="rounded-md border border-dashed border-neutral-300 bg-white px-5 py-10 text-center text-sm text-neutral-500">
                아직 기록된 활동이 없습니다.
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {dashboard.recentActivities.map((activity) => (
                  <ActivityCard activity={activity} key={activity.id} />
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}
