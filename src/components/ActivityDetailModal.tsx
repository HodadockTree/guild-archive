"use client";

import { useEffect } from "react";
import { Badge } from "@/src/components/ui/Badge";
import { Surface } from "@/src/components/ui/Surface";

export type ActivityDetail = {
  id: string;
  date: string;
  label: string;
  title: string;
  participantCount: number;
  participantNames: string[];
  memo?: string;
  imageDataUrl?: string;
};

type ActivityDetailModalProps = {
  activity: ActivityDetail | null;
  onClose: () => void;
};

export function ActivityDetailModal({
  activity,
  onClose,
}: ActivityDetailModalProps) {
  useEffect(() => {
    if (!activity) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activity, onClose]);

  if (!activity) {
    return null;
  }

  const memo = activity.memo?.trim();

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
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-500">{activity.date}</span>
              <Badge className="py-0.5">
                {activity.label}
              </Badge>
            </div>
            <h2
              className="mt-2 text-xl font-bold leading-7 text-slate-900"
              id="activity-detail-title"
            >
              {activity.title}
            </h2>
          </div>
          <button
            aria-label="상세 보기 닫기"
            className="shrink-0 rounded-md border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
            onClick={onClose}
            type="button"
          >
            닫기
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {activity.imageDataUrl ? (
            <section>
              <h3 className="text-sm font-semibold text-slate-900">기록 사진</h3>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`${activity.title} 기록 사진`}
                className="mt-3 max-h-[60vh] w-full rounded-md border border-sky-100 object-contain"
                src={activity.imageDataUrl}
              />
            </section>
          ) : null}

          <section>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                함께한 길드원
              </h3>
              <Badge tone="brand">
                {activity.participantCount}명
              </Badge>
            </div>
            {activity.participantNames.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {activity.participantNames.map((name, index) => (
                  <li
                    className="max-w-full rounded-md bg-sky-50 px-2.5 py-1 text-sm text-slate-700"
                    key={`${name}-${index}`}
                  >
                    {name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-md border border-dashed border-sky-200 bg-sky-50 px-4 py-5 text-center text-sm text-slate-500">
                참여 기록 없음
              </p>
            )}
          </section>

          {memo ? (
            <section>
              <h3 className="text-sm font-semibold text-slate-900">활동 메모</h3>
              <p className="mt-3 whitespace-pre-wrap rounded-md bg-sky-50 px-4 py-4 text-sm leading-6 text-slate-600">
                {memo}
              </p>
            </section>
          ) : null}
        </div>
      </Surface>
    </div>
  );
}
