"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type {
  DashboardActivitySummary,
  DashboardMonthlyTrend,
  DashboardStats,
} from "@/src/lib/dashboardStats";
import {
  ActivityDetailModal,
  type ActivityDetail,
} from "@/src/components/ActivityDetailModal";
import { DashboardSummaryModal } from "@/src/components/DashboardSummaryModal";

type DashboardState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; dashboard: DashboardStats };

type SummaryModalKey =
  | "activeMembers"
  | "currentMonthActivities"
  | "currentMonthParticipants"
  | "allActivities"
  | "allMembers";

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
  actionLabel,
  onClick,
}: {
  label: string;
  value: string;
  detail?: string;
  actionLabel?: string;
  onClick?: () => void;
}) {
  const isClickable = Boolean(onClick);

  return (
    <div
      className={`rounded-md border border-sky-100 bg-white px-4 py-4 shadow-sm shadow-sky-100/50 transition hover:border-sky-200 hover:bg-sky-50/40 ${
        isClickable
          ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2"
          : ""
      }`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick || (event.key !== "Enter" && event.key !== " ")) {
          return;
        }

        event.preventDefault();
        onClick();
      }}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-2 text-3xl font-bold text-slate-900">{value}</dd>
      {detail ? (
        <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>
      ) : null}
      {actionLabel ? (
        <p className="mt-3 text-xs font-semibold text-sky-700">
          {actionLabel}
        </p>
      ) : null}
    </div>
  );
}

function MemberChipList({
  emptyMessage,
  names,
}: {
  emptyMessage: string;
  names: string[];
}) {
  if (names.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-sky-200 bg-sky-50 px-4 py-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {names.map((name, index) => (
        <li
          className="max-w-full rounded-md bg-sky-50 px-2.5 py-1 text-sm text-slate-700"
          key={`${name}-${index}`}
        >
          {name}
        </li>
      ))}
    </ul>
  );
}

function ActivitySummaryList({
  activities,
  emptyMessage,
  onSelectActivity,
}: {
  activities: DashboardActivitySummary[];
  emptyMessage: string;
  onSelectActivity: (activity: ActivityDetail) => void;
}) {
  if (activities.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-sky-200 bg-sky-50 px-4 py-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {activities.map((activity) => (
        <li key={activity.id}>
          <button
            className="w-full rounded-md border border-sky-100 bg-white px-4 py-3 text-left text-sm shadow-sm shadow-sky-100/40 transition hover:border-sky-200 hover:bg-sky-50/50 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2"
            onClick={() => onSelectActivity(activity)}
            type="button"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs text-slate-500">{activity.date}</p>
                <h3 className="mt-1 font-semibold leading-6 text-slate-900">
                  {activity.title}
                </h3>
                <p className="mt-1 text-slate-600">{activity.label}</p>
              </div>
              <span className="w-fit shrink-0 rounded-md bg-sky-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                참여 {activity.participantCount}명
              </span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function CumulativeSummaryCard({
  actionLabel,
  label,
  onClick,
  value,
}: {
  actionLabel?: string;
  label: string;
  onClick?: () => void;
  value: string;
}) {
  const isClickable = Boolean(onClick);

  return (
    <div
      className={`rounded-md bg-sky-50 px-4 py-4 transition ${
        isClickable
          ? "cursor-pointer hover:bg-sky-100/70 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2"
          : ""
      }`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick || (event.key !== "Enter" && event.key !== " ")) {
          return;
        }

        event.preventDefault();
        onClick();
      }}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-2xl font-bold text-slate-900">{value}</dd>
      {actionLabel ? (
        <p className="mt-3 text-xs font-semibold text-sky-700">
          {actionLabel}
        </p>
      ) : null}
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
    <section className="rounded-md border border-sky-100 bg-white p-5 shadow-sm shadow-sky-100/50">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>

      {trends.length < 2 || maxValue === 0 ? (
        <p className="mt-5 rounded-md border border-dashed border-sky-200 bg-sky-50 px-4 py-8 text-center text-sm text-slate-500">
          {emptyMessage}
        </p>
      ) : (
        <div className="mt-6 flex h-64 items-end gap-3 border-b border-sky-100 pb-3">
          {trends.map((trend) => {
            const value = trend[valueKey];
            const height = Math.max(8, Math.round((value / maxValue) * 100));

            return (
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2" key={trend.month}>
                <span
                  className={`text-xs font-semibold ${
                    value === maxValue ? "text-slate-700" : "text-slate-500"
                  }`}
                >
                  {value}
                  {unit}
                </span>
                <div className="flex h-44 w-full items-end rounded-sm bg-sky-50">
                  <div
                    className={`w-full rounded-sm ${
                      value === maxValue ? "bg-slate-500" : "bg-sky-200"
                    }`}
                    style={{ height: `${height}%` }}
                    aria-label={`${getMonthLabel(trend.month)} ${value}${unit}`}
                    title={`${getMonthLabel(trend.month)} ${value}${unit}`}
                  />
                </div>
                <span className="w-full truncate text-center text-xs text-slate-500">
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

function ActivityCard({
  activity,
  onSelect,
}: {
  activity: DashboardActivitySummary;
  onSelect: (activity: ActivityDetail) => void;
}) {
  return (
    <li>
      <button
      className={`flex rounded-md border border-sky-100 bg-white shadow-sm shadow-sky-100/50 transition hover:border-sky-200 hover:bg-sky-50/40 ${
        activity.imageDataUrl ? "flex-col overflow-hidden" : "flex-col px-4 py-4"
      } w-full text-left focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2`}
        onClick={() => onSelect(activity)}
        type="button"
      >
      {activity.imageDataUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          alt={`${activity.title} 활동 사진`}
          className="max-h-56 w-full border-b border-sky-100 object-contain"
          src={activity.imageDataUrl}
        />
      ) : null}

      <div className={activity.imageDataUrl ? "flex flex-1 flex-col px-4 py-4" : "flex flex-1 flex-col"}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500">
              {getDisplayDate(activity.date)}
            </span>
          </div>
          <span className="shrink-0 rounded-md bg-sky-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {activity.participantCount}명
          </span>
        </div>

        <h3 className="mt-3 text-base font-semibold leading-6 text-slate-900">
          {activity.title}
        </h3>
        {activity.memo ? (
          <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {activity.memo}
          </p>
        ) : null}
      </div>
      </button>
    </li>
  );
}

export default function DashboardPage() {
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    status: "loading",
  });
  const [selectedActivity, setSelectedActivity] =
    useState<ActivityDetail | null>(null);
  const [selectedSummaryModal, setSelectedSummaryModal] =
    useState<SummaryModalKey | null>(null);

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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-7 bg-sky-50 px-5 py-10 text-slate-800">
      <header className="flex flex-col gap-4 border-b border-sky-100 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-600">
            냥춘 길드 활동 아카이브
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            길드 현황 대시보드
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            이번 달 활동과 최근 소식을 한눈에 모아봤어요.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="rounded-md border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
            href="/archive"
          >
            월별 아카이브
          </Link>
          <Link
            className="rounded-md border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
            href="/viewer"
          >
            월간 리포트
          </Link>
          <Link
            className="rounded-md bg-sky-200 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-sky-300"
            href="/admin"
          >
            관리자
          </Link>
        </div>
      </header>

      {dashboardState.status === "loading" ? (
        <section className="rounded-md border border-sky-100 bg-white px-5 py-10 text-center shadow-sm shadow-sky-100/50">
          <h2 className="text-lg font-semibold text-slate-900">
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
                actionLabel="목록 보기"
                onClick={() => setSelectedSummaryModal("activeMembers")}
              />
              <SummaryCard
                label="이번 달 활동 수"
                value={`${dashboard.currentMonthActivityCount}회`}
                actionLabel="활동 내역 보기"
                detail="월별 활동 기록"
                onClick={() => setSelectedSummaryModal("currentMonthActivities")}
              />
              <SummaryCard
                label="이번 달 함께한 인원"
                value={`${dashboard.currentMonthParticipantMemberCount}명`}
                actionLabel="목록 보기"
                detail="이번 달 한 번 이상 길드 활동에 참여한 인원입니다."
                onClick={() => setSelectedSummaryModal("currentMonthParticipants")}
              />
              <SummaryCard
                label="최근 활동"
                value={dashboard.recentActivity ? dashboard.recentActivity.title : "없음"}
                detail={
                  dashboard.recentActivity
                    ? dashboard.recentActivity.date
                    : "아직 기록된 활동이 없습니다."
                }
              />
            </dl>
          </section>

          <section className="rounded-md border border-sky-100 bg-white p-5 shadow-sm shadow-sky-100/50">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                지금까지의 냥춘 기록
              </h2>
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              <CumulativeSummaryCard
                actionLabel="활동 내역 보기"
                label="전체 활동"
                onClick={() => setSelectedSummaryModal("allActivities")}
                value={`${dashboard.totalActivityCount}회`}
              />
              <CumulativeSummaryCard
                actionLabel="목록 보기"
                label="함께했던 길드원"
                onClick={() => setSelectedSummaryModal("allMembers")}
                value={`${dashboard.totalMemberCount}명`}
              />
              <CumulativeSummaryCard label="길드 시작일" value="2026-01-22 ~" />
            </dl>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <TrendChart
              title="월별 활동 기록"
              description="월별로 기록된 길드 활동 수를 보여줍니다."
              emptyMessage="그래프로 표시할 활동 데이터가 아직 부족합니다."
              trends={dashboard.monthlyTrends}
              valueKey="activityCount"
              unit="회"
            />
            <TrendChart
              title="월별 참여 흐름"
              description="월별로 함께한 길드원 수를 보여줍니다."
              emptyMessage="그래프로 표시할 참여 데이터가 아직 부족합니다."
              trends={dashboard.monthlyTrends}
              valueKey="participantMemberCount"
              unit="명"
            />
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  최근 활동
                </h2>
              </div>
              <Link
                className="w-fit rounded-md border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
                href="/viewer"
              >
                리포트로 보기
              </Link>
            </div>

            {dashboard.recentActivities.length === 0 ? (
              <p className="rounded-md border border-dashed border-sky-200 bg-white px-5 py-10 text-center text-sm text-slate-500">
                아직 기록된 활동이 없습니다.
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {dashboard.recentActivities.map((activity) => (
                  <ActivityCard
                    activity={activity}
                    key={activity.id}
                    onSelect={setSelectedActivity}
                  />
                ))}
              </ul>
            )}
          </section>

          {selectedSummaryModal === "activeMembers" ? (
            <DashboardSummaryModal
              description="지금 활동중인 길드원 목록입니다."
              onClose={() => setSelectedSummaryModal(null)}
              title="현재 길드원"
            >
              <MemberChipList
                emptyMessage="현재 활동중인 길드원이 없습니다."
                names={dashboard.activeMembers.map((member) => member.nickname)}
              />
            </DashboardSummaryModal>
          ) : null}

          {selectedSummaryModal === "currentMonthActivities" ? (
            <DashboardSummaryModal
              description="이번 달에 기록된 활동 내역입니다."
              onClose={() => setSelectedSummaryModal(null)}
              title="이번 달 활동"
            >
              <ActivitySummaryList
                activities={dashboard.currentMonthActivities}
                emptyMessage="이번 달에 기록된 활동이 아직 없습니다."
                onSelectActivity={(activity) => {
                  setSelectedSummaryModal(null);
                  setSelectedActivity(activity);
                }}
              />
            </DashboardSummaryModal>
          ) : null}

          {selectedSummaryModal === "currentMonthParticipants" ? (
            <DashboardSummaryModal
              description="이번 달 활동에 한 번 이상 함께한 길드원입니다."
              onClose={() => setSelectedSummaryModal(null)}
              title="이번 달 함께한 인원"
            >
              <MemberChipList
                emptyMessage="이번 달에 함께한 길드원이 아직 없습니다."
                names={dashboard.currentMonthParticipantMembers.map(
                  (member) => member.nickname,
                )}
              />
            </DashboardSummaryModal>
          ) : null}

          {selectedSummaryModal === "allActivities" ? (
            <DashboardSummaryModal
              description="지금까지 기록된 활동 내역입니다."
              onClose={() => setSelectedSummaryModal(null)}
              title="전체 활동"
            >
              <ActivitySummaryList
                activities={dashboard.allActivities}
                emptyMessage="아직 기록된 활동이 없습니다."
                onSelectActivity={(activity) => {
                  setSelectedSummaryModal(null);
                  setSelectedActivity(activity);
                }}
              />
            </DashboardSummaryModal>
          ) : null}

          {selectedSummaryModal === "allMembers" ? (
            <DashboardSummaryModal
              description="지금까지 냥춘에 함께했던 길드원 목록입니다."
              onClose={() => setSelectedSummaryModal(null)}
              title="함께한 길드원"
            >
              <MemberChipList
                emptyMessage="아직 함께한 길드원 기록이 없습니다."
                names={dashboard.allMembers.map((member) => member.nickname)}
              />
            </DashboardSummaryModal>
          ) : null}

          <ActivityDetailModal
            activity={selectedActivity}
            onClose={() => setSelectedActivity(null)}
          />
        </>
      ) : null}
    </main>
  );
}
