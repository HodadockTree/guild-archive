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
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    openerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeButtonRef.current?.focus();

    return () => openerRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = document.getElementById("activity-detail-dialog-content");
      const focusableElements = dialog?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      if (!focusableElements || focusableElements.length === 0) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
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
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div id="activity-detail-dialog-content">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-5 py-4">
            <div className="min-w-0 py-1.5">
              <h2
                className="text-xl font-bold leading-7 break-words text-[var(--color-text-primary)]"
                id="activity-detail-title"
              >
                {displayedActivity.title}
              </h2>
            </div>
            <button
              aria-label="상세 보기 닫기"
              className="ui-focus-ring inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-interactive)] hover:bg-[var(--color-bg-interactive)] hover:text-[var(--color-text-primary)]"
              onClick={onClose}
              ref={closeButtonRef}
              type="button"
            >
              닫기
            </button>
          </div>

          <div className="space-y-5 px-5 py-5">
            <section aria-label="활동 정보">
              <p className="ui-body-text font-semibold text-[var(--color-text-primary)]">
                {formatDateRange(displayedActivity.date, displayedActivity.endDate)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone="neutral">
                  {detailLabel ?? displayedActivity.label}
                </Badge>
                <span className="ui-caption">
                  참여{" "}
                  <strong className="font-semibold text-[var(--color-text-secondary)]">
                    {displayedActivity.participantCount}명
                  </strong>
                </span>
              </div>
            </section>

            <section>
              <h3 className="ui-card-title">함께한 길드원</h3>
              {displayedActivity.participants.length > 0 ? (
                <div className="mt-3 rounded-[var(--radius-card)] bg-[var(--color-bg-muted)] p-3">
                  <ul className="flex flex-wrap gap-1.5">
                    {displayedActivity.participants.map((participant) => (
                      <li key={participant.id}>
                        {participant.isKnownMember === false ? (
                          <span className="inline-flex min-h-9 max-w-full items-center rounded-full px-2.5 py-1 text-sm break-words text-[var(--color-text-muted)]">
                            {participant.nickname}
                          </span>
                        ) : (
                          <Link
                            aria-label={`${participant.nickname} 개인 기록 보기`}
                            className="ui-focus-ring inline-flex min-h-9 max-w-full items-center rounded-full border border-[var(--color-border-interactive)] bg-[var(--color-bg-surface)] px-2.5 py-1 text-sm font-medium break-words text-[var(--color-text-accent)] transition-colors hover:border-[var(--color-border-selected)] hover:bg-[var(--color-bg-interactive)]"
                            href={`/members/${encodeURIComponent(participant.id)}`}
                          >
                            {participant.nickname}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="ui-empty-state mt-3 px-4 py-5">참여 기록 없음</p>
              )}
            </section>

            {memo ? (
              <section>
                <h3 className="ui-card-title">활동 메모</h3>
                <p className="ui-body-text mt-3 whitespace-pre-wrap rounded-[var(--radius-card)] bg-[var(--color-bg-muted)] px-4 py-3 break-words">
                  {memo}
                </p>
              </section>
            ) : null}

            {activityMonth && activityMonthLabel ? (
              <div className="border-t border-[var(--color-border-subtle)] pt-3">
                <Link
                  className="ui-focus-ring inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-2 text-sm font-medium text-[var(--color-text-accent)] transition-colors hover:bg-[var(--color-bg-interactive)]"
                  href={`/viewer?month=${activityMonth}`}
                >
                  {activityMonthLabel}
                </Link>
              </div>
            ) : null}
          </div>
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
