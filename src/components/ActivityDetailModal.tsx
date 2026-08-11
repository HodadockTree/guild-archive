"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Badge } from "@/src/components/ui/Badge";
import { Surface } from "@/src/components/ui/Surface";
import { formatDateRange } from "@/src/lib/displayFormat";
import type { MemberActivityRecord } from "@/src/lib/memberActivity";

export type ActivityDetail = MemberActivityRecord;

type ActivityDetailModalProps = {
  activity: ActivityDetail | null;
  onClose: () => void;
};

function ActivityDetailDialog({
  initialActivity,
  onClose,
}: {
  initialActivity: ActivityDetail;
  onClose: () => void;
}) {
  const displayedActivity = initialActivity;
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const memo = displayedActivity.memo?.trim();
  const detailLabel = displayedActivity.label.startsWith("점령전 (")
    ? displayedActivity.label
    : null;
  const activityMonth = /^\d{4}-\d{2}/.test(displayedActivity.date)
    ? displayedActivity.date.slice(0, 7)
    : null;
  const activityMonthLabel = activityMonth
    ? `${Number(activityMonth.slice(5, 7))}월 기록 보기`
    : null;

  return (
    <div
      aria-labelledby="activity-detail-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 px-4 py-4 sm:items-center"
      onClick={onClose}
      role="dialog"
    >
      <Surface
        as="div"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto shadow-xl shadow-slate-900/15"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-sky-100 bg-white px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-sm text-[var(--text-secondary)]">
              <span className="whitespace-nowrap">{formatDateRange(displayedActivity.date, displayedActivity.endDate)}</span>
              {activityMonth && activityMonthLabel ? (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                    <Link
                      className="ui-focus-ring -my-1 inline-flex min-h-8 items-center rounded-md px-1.5 text-xs text-slate-500 transition hover:bg-sky-50 hover:text-slate-700 focus-visible:bg-sky-50 focus-visible:text-slate-700"
                      href={`/viewer?month=${activityMonth}`}
                    >
                      {activityMonthLabel}
                    </Link>
                </>
              ) : null}
              {detailLabel ? <Badge className="py-0.5">{detailLabel}</Badge> : null}
            </div>
            <h2 className="mt-2 text-xl font-bold leading-7 text-slate-900" id="activity-detail-title">
              {displayedActivity.title}
            </h2>
          </div>
          <button aria-label="상세 보기 닫기" className="shrink-0 rounded-md border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50" onClick={onClose} ref={closeButtonRef} type="button">
            닫기
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <>
              <section>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">함께한 길드원</h3>
                  <Badge tone="brand">{displayedActivity.participantCount}명</Badge>
                </div>
                {displayedActivity.participants.length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {displayedActivity.participants.map((participant) => (
                      <li key={participant.id}>
                        {participant.isKnownMember === false ? (
                          <span className="inline-flex min-h-11 max-w-full items-center rounded-md px-3 py-2 text-sm text-slate-500">
                            {participant.nickname}
                          </span>
                        ) : (
                          <Link
                            aria-label={`${participant.nickname} 개인 기록 보기`}
                            className="ui-focus-ring inline-flex min-h-11 max-w-full items-center rounded-md px-3 py-2 text-sm text-slate-700 transition hover:bg-sky-50 hover:text-slate-900 focus-visible:bg-sky-50 focus-visible:text-slate-900"
                            href={`/members/${encodeURIComponent(participant.id)}`}
                          >
                            {participant.nickname}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 rounded-md border border-dashed border-sky-200 bg-sky-50 px-4 py-5 text-center text-sm text-slate-500">참여 기록 없음</p>
                )}
              </section>

              {memo ? (
                <section>
                  <h3 className="text-sm font-semibold text-slate-900">활동 메모</h3>
                  <p className="mt-3 whitespace-pre-wrap rounded-md bg-sky-50 px-4 py-4 text-sm leading-6 text-slate-600">{memo}</p>
                </section>
              ) : null}
          </>
        </div>
      </Surface>
    </div>
  );
}

export function ActivityDetailModal({ activity, onClose }: ActivityDetailModalProps) {
  return activity ? (
    <ActivityDetailDialog
      initialActivity={activity}
      key={activity.id}
      onClose={onClose}
    />
  ) : null;
}
