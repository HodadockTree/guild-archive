"use client";

import { useEffect, useState } from "react";
import type {
  MemberActivityDetailData,
  MemberActivityRecord,
} from "@/src/lib/memberActivity";
import { formatFullDate } from "@/src/lib/displayFormat";

type DetailState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; detail: MemberActivityDetailData };

const detailCache = new Map<string, MemberActivityDetailData>();
const INITIAL_ACTIVITY_COUNT = 8;

function getDurationLabel(detail: MemberActivityDetailData) {
  const { joinedAt, leftAt } = detail.member;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(joinedAt)) {
    return "-";
  }

  const endDate = /^\d{4}-\d{2}-\d{2}$/.test(leftAt ?? "")
    ? leftAt
    : new Date().toISOString().slice(0, 10);

  if (!endDate) {
    return "-";
  }

  const dayCount =
    Math.floor(
      (new Date(`${endDate}T00:00:00`).getTime() -
        new Date(`${joinedAt}T00:00:00`).getTime()) /
        86_400_000,
    ) + 1;

  return Number.isFinite(dayCount) && dayCount > 0 ? `${dayCount}일` : "-";
}

export function MemberActivityPanel({
  initialData,
  memberId,
  onSelectActivity,
}: {
  initialData?: MemberActivityDetailData;
  memberId: string;
  onSelectActivity?: (activity: MemberActivityRecord) => void;
}) {
  const [retryCount, setRetryCount] = useState(0);
  const [visibleCount, setVisibleCount] = useState(INITIAL_ACTIVITY_COUNT);
  const [detailState, setDetailState] = useState<DetailState>(() => {
    const detail = initialData ?? detailCache.get(memberId);
    return detail ? { status: "success", detail } : { status: "loading" };
  });

  useEffect(() => {
    const cachedDetail = initialData ?? detailCache.get(memberId);

    if (cachedDetail) {
      return;
    }

    let isActive = true;

    async function loadDetail() {
      try {
        const response = await fetch(
          `/api/archive/members/${encodeURIComponent(memberId)}/activities`,
          { cache: "no-store" },
        );
        const data: unknown = await response.json();

        if (
          !response.ok ||
          typeof data !== "object" ||
          data === null ||
          !("detail" in data)
        ) {
          throw new Error("길드원 활동 기록을 불러오지 못했습니다.");
        }

        const detail = data.detail as MemberActivityDetailData;
        detailCache.set(memberId, detail);

        if (isActive) {
          setDetailState({ status: "success", detail });
        }
      } catch (error) {
        if (isActive) {
          setDetailState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "길드원 활동 기록을 불러오지 못했습니다.",
          });
        }
      }
    }

    loadDetail();
    return () => {
      isActive = false;
    };
  }, [initialData, memberId, retryCount]);

  if (detailState.status === "loading") {
    return <p className="py-10 text-center text-sm text-slate-500">길드원 활동 기록을 불러오는 중입니다.</p>;
  }

  if (detailState.status === "error") {
    return (
      <div className="rounded-md border border-red-100 bg-red-50 px-4 py-6 text-center">
        <p className="text-sm text-red-700">{detailState.message}</p>
        <button className="ui-focus-ring mt-3 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700" onClick={() => {
          setDetailState({ status: "loading" });
          setRetryCount((count) => count + 1);
        }} type="button">
          다시 시도
        </button>
      </div>
    );
  }

  const { detail } = detailState;
  const visibleActivities = detail.activities.slice(0, visibleCount);

  return (
    <div className="space-y-5">
      <dl className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-md bg-sky-50 px-3 py-3">
          <dt className="text-xs text-slate-500">현재 상태</dt>
          <dd className="mt-1 font-semibold text-slate-900">{detail.member.status === "active" ? "활동중" : "탈퇴"}</dd>
        </div>
        <div className="rounded-md bg-sky-50 px-3 py-3">
          <dt className="text-xs text-slate-500">누적 참여 활동</dt>
          <dd className="mt-1 font-semibold text-slate-900">{detail.activities.length}회</dd>
        </div>
        <div className="rounded-md bg-sky-50 px-3 py-3">
          <dt className="text-xs text-slate-500">가입일</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900">{detail.member.joinedAt ? formatFullDate(detail.member.joinedAt) : "-"}</dd>
        </div>
        <div className="rounded-md bg-sky-50 px-3 py-3">
          <dt className="text-xs text-slate-500">함께한 기간</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900">
            {getDurationLabel(detail)}
            {detail.member.leftAt ? ` · 탈퇴일 ${formatFullDate(detail.member.leftAt)}` : ""}
          </dd>
        </div>
      </dl>

      <section>
        <h3 className="text-sm font-semibold text-slate-900">활동 내역</h3>
        {detail.activities.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-sky-200 bg-sky-50 px-4 py-8 text-center text-sm text-slate-500">참여한 활동 기록이 없습니다.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {visibleActivities.map((activity) => {
              const content = (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">{formatFullDate(activity.date)} · {activity.label}</p>
                    <p className="mt-1 font-semibold leading-5 text-slate-900">{activity.title}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-slate-500">참여 {activity.participantCount}명</span>
                </div>
              );

              return (
                <li key={activity.id}>
                  {onSelectActivity ? (
                    <button className="ui-focus-ring w-full cursor-pointer rounded-md border border-sky-100 bg-white px-3 py-3 text-left transition hover:border-sky-300 hover:bg-sky-50" onClick={() => onSelectActivity(activity)} type="button">
                      {content}
                    </button>
                  ) : (
                    <div className="rounded-md border border-sky-100 bg-white px-3 py-3">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {visibleCount < detail.activities.length ? (
          <button className="ui-focus-ring mt-3 w-full rounded-md border border-sky-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-sky-50" onClick={() => setVisibleCount((count) => count + INITIAL_ACTIVITY_COUNT)} type="button">
            더 보기
          </button>
        ) : null}
      </section>
    </div>
  );
}
