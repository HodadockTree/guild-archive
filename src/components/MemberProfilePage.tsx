"use client";

import Link from "next/link";
import { useState } from "react";
import { ActivityDetailModal, type ActivityDetail } from "@/src/components/ActivityDetailModal";
import { AppHeader } from "@/src/components/ui/AppHeader";
import { Surface } from "@/src/components/ui/Surface";
import { formatFullDate, formatMonth } from "@/src/lib/displayFormat";
import {
  memberProfileActivityTypeLabels,
  type MemberProfileData,
} from "@/src/lib/memberProfile";

function displayDate(date: string | null) {
  return date ? formatFullDate(date) : "-";
}

export function MemberProfilePage({ profile }: { profile: MemberProfileData }) {
  const [selectedActivity, setSelectedActivity] = useState<ActivityDetail | null>(null);
  const { member, summary } = profile;
  const mostFrequentLabel = summary.mostFrequentTypes.length
    ? summary.mostFrequentTypes
        .map((type) => memberProfileActivityTypeLabels[type])
        .join(", ")
    : "-";
  const maxMonthlyCount = Math.max(
    1,
    ...profile.monthlyParticipation.map((item) => item.count),
  );

  return (
    <main className="app-shell">
      <AppHeader
        currentPath="/members"
        description="누가 더 많이 참여했는지가 아니라, 냥춘에서 함께해온 활동을 시간순으로 살펴봅니다."
        eyebrow="길드원 개인 활동 기록"
        title={`${member.nickname}님의 기록`}
      />

      <div>
        <Link className="ui-focus-ring text-sm font-semibold text-[var(--brand-strong)] hover:underline" href="/">
          ← 길드원 목록으로 돌아가기
        </Link>
      </div>

      <Surface className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{member.nickname}</h2>
            <p className="mt-2 text-sm text-slate-600">
              가입일 {displayDate(member.joinedAt || null)}
              {member.leftAt ? ` · 탈퇴일 ${displayDate(member.leftAt)}` : ""}
            </p>
          </div>
          <span className="w-fit rounded-full bg-sky-50 px-3 py-1.5 text-sm font-semibold text-[var(--brand-strong)]">
            {member.status === "active" ? "활동 중" : "탈퇴"}
          </span>
        </div>
      </Surface>

      <section aria-labelledby="member-summary-title">
        <h2 className="text-lg font-semibold text-slate-900" id="member-summary-title">함께한 기록 요약</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-4 border-y border-sky-100 bg-white px-4 py-5 sm:grid-cols-2 lg:grid-cols-5">
          <div><dt className="text-xs text-slate-500">총 참여 활동</dt><dd className="mt-1 text-lg font-bold text-slate-900">{summary.totalActivityCount}회</dd></div>
          <div><dt className="text-xs text-slate-500">함께한 기간</dt><dd className="mt-1 font-semibold text-slate-900">{summary.togetherDayCount ? `${summary.togetherDayCount}일${member.status === "active" ? "째" : ""}` : "-"}</dd></div>
          <div><dt className="text-xs text-slate-500">처음 참여</dt><dd className="mt-1 font-semibold text-slate-900">{displayDate(summary.firstActivityDate)}</dd></div>
          <div><dt className="text-xs text-slate-500">최근 참여</dt><dd className="mt-1 font-semibold text-slate-900">{displayDate(summary.recentActivityDate)}</dd></div>
          <div><dt className="text-xs text-slate-500">가장 많이 함께한 활동</dt><dd className="mt-1 font-semibold text-slate-900">{mostFrequentLabel}</dd></div>
        </dl>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Surface className="p-5">
          <h2 className="text-lg font-semibold text-slate-900">활동 종류별 기록</h2>
          <ul className="mt-4 divide-y divide-sky-100">
            {profile.typeCounts.map((item) => (
              <li className="flex items-center justify-between py-3 first:pt-0 last:pb-0" key={item.type}>
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
                <span className="font-bold text-slate-900">{item.count}회</span>
              </li>
            ))}
          </ul>
        </Surface>

        <Surface className="p-5">
          <h2 className="text-lg font-semibold text-slate-900">월별 참여 흐름</h2>
          {profile.monthlyParticipation.length ? (
            <ul className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
              {profile.monthlyParticipation.map((item) => (
                <li className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-3" key={item.month}>
                  <span className="text-sm text-slate-600">{formatMonth(item.month)}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-sky-50">
                    <span className="block h-full rounded-full bg-[var(--brand)]" style={{ width: `${(item.count / maxMonthlyCount) * 100}%` }} />
                  </span>
                  <span className="text-right text-sm font-semibold text-slate-800">{item.count}회</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">표시할 가입 기간 정보가 없습니다.</p>
          )}
        </Surface>
      </div>

      <section aria-labelledby="activity-list-title">
        <h2 className="text-lg font-semibold text-slate-900" id="activity-list-title">개인 활동 기록</h2>
        {profile.activities.length ? (
          <ul className="mt-3 space-y-2">
            {profile.activities.map((activity) => (
              <li key={activity.id}>
                <button className="ui-focus-ring flex w-full flex-col gap-2 rounded-md border border-sky-100 bg-white px-4 py-4 text-left transition hover:border-sky-300 hover:bg-sky-50 sm:flex-row sm:items-center sm:justify-between" onClick={() => setSelectedActivity(activity)} type="button">
                  <span className="min-w-0">
                    <span className="block text-xs text-slate-500">{formatFullDate(activity.date)} · {activity.label}</span>
                    <span className="mt-1 block font-semibold text-slate-900">{activity.title}</span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">함께한 길드원 {activity.participantCount}명</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-md border border-dashed border-sky-200 bg-white px-5 py-10 text-center text-sm text-slate-500">아직 함께한 활동 기록이 없습니다.</p>
        )}
      </section>

      <ActivityDetailModal activity={selectedActivity} onClose={() => setSelectedActivity(null)} />
    </main>
  );
}
