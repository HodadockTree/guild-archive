"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/src/components/ui/Badge";
import { Surface } from "@/src/components/ui/Surface";
import { MemberActivityPanel } from "@/src/components/MemberActivityPanel";
import { formatFullDate } from "@/src/lib/displayFormat";
import type {
  ActivityParticipant,
  MemberActivityRecord,
} from "@/src/lib/memberActivity";

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
  const [displayedActivity, setDisplayedActivity] =
    useState<ActivityDetail>(initialActivity);
  const [selectedMember, setSelectedMember] =
    useState<ActivityParticipant | null>(null);
  const [memberContext, setMemberContext] =
    useState<ActivityParticipant | null>(null);
  const [activityOpenedFromMember, setActivityOpenedFromMember] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const participantTriggerRef = useRef<HTMLButtonElement | null>(null);

  const returnToActivity = () => {
    setSelectedMember(null);
    setMemberContext(null);
    setActivityOpenedFromMember(false);
    requestAnimationFrame(() => participantTriggerRef.current?.focus());
  };

  const returnToMember = () => {
    setSelectedMember(memberContext);
    setActivityOpenedFromMember(false);
  };

  useEffect(() => {
    if (selectedMember || activityOpenedFromMember) {
      backButtonRef.current?.focus();
    } else {
      closeButtonRef.current?.focus();
    }
  }, [activityOpenedFromMember, selectedMember]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (selectedMember) {
        setSelectedMember(null);
        setMemberContext(null);
        setActivityOpenedFromMember(false);
        requestAnimationFrame(() => participantTriggerRef.current?.focus());
      } else if (activityOpenedFromMember && memberContext) {
        setSelectedMember(memberContext);
        setActivityOpenedFromMember(false);
      } else {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activityOpenedFromMember, memberContext, onClose, selectedMember]);

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
  const isMemberView = Boolean(selectedMember);

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
            {isMemberView ? (
              <button className="ui-focus-ring mb-2 rounded-md px-2 py-1 text-sm font-semibold text-[var(--brand-strong)] hover:bg-sky-50" onClick={returnToActivity} ref={backButtonRef} type="button">
                ← 활동으로 돌아가기
              </button>
            ) : activityOpenedFromMember && memberContext ? (
              <button className="ui-focus-ring mb-2 rounded-md px-2 py-1 text-sm font-semibold text-[var(--brand-strong)] hover:bg-sky-50" onClick={returnToMember} ref={backButtonRef} type="button">
                ← {memberContext.nickname}님의 기록으로 돌아가기
              </button>
            ) : null}

            {selectedMember ? (
              <h2 className="text-xl font-bold leading-7 text-slate-900" id="activity-detail-title">
                {selectedMember.nickname}님의 활동 기록
              </h2>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-[var(--text-secondary)]">{formatFullDate(displayedActivity.date)}</span>
                  {detailLabel ? <Badge className="py-0.5">{detailLabel}</Badge> : null}
                </div>
                <h2 className="mt-2 text-xl font-bold leading-7 text-slate-900" id="activity-detail-title">
                  {displayedActivity.title}
                </h2>
              </>
            )}
          </div>
          <button aria-label="상세 보기 닫기" className="shrink-0 rounded-md border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50" onClick={onClose} ref={closeButtonRef} type="button">
            닫기
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {selectedMember ? (
            <MemberActivityPanel
              memberId={selectedMember.id}
              onSelectActivity={(activity) => {
                setDisplayedActivity(activity);
                setActivityOpenedFromMember(true);
                setSelectedMember(null);
              }}
            />
          ) : (
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
                        <button
                          aria-label={`${participant.nickname} 활동 기록 보기`}
                          className="ui-focus-ring min-h-11 max-w-full cursor-pointer rounded-md bg-sky-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-sky-100"
                          onClick={(event) => {
                            participantTriggerRef.current = event.currentTarget;
                            setMemberContext(participant);
                            setSelectedMember(participant);
                          }}
                          type="button"
                        >
                          {participant.nickname}
                        </button>
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
          )}
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
