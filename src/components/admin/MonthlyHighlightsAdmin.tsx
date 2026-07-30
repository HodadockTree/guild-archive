"use client";

import { FormEvent, useState } from "react";
import type {
  MonthlyHighlight,
  MonthlyHighlightCategory,
} from "@/src/types";
import { ActivityImage } from "@/src/components/ActivityImage";
import {
  monthlyHighlightCategoryBadgeClasses,
  monthlyHighlightCategories,
  monthlyHighlightCategoryLabels,
  validateMonthlyHighlightInput,
} from "@/src/lib/monthlyHighlights";

function currentMonth() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 7);
}

export function MonthlyHighlightsAdmin() {
  const [month, setMonth] = useState(currentMonth);
  const [category, setCategory] =
    useState<MonthlyHighlightCategory>("game_update");
  const [title, setTitle] = useState("");
  const [dateText, setDateText] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [highlights, setHighlights] = useState<MonthlyHighlight[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading"; message: string }
    | { type: "success"; message: string }
    | { type: "error"; message: string }
  >({ type: "idle" });

  const resetForm = () => {
    setCategory("game_update");
    setTitle("");
    setDateText("");
    setDescription("");
    setImageUrl("");
    setEditingId(null);
  };

  const requestHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${adminToken.trim()}`,
  });

  const loadHighlights = async (targetMonth = month) => {
    if (!adminToken.trim()) {
      setStatus({
        type: "error",
        message: "월별 주요 기록을 관리하려면 관리자 토큰을 입력해 주세요.",
      });
      return;
    }

    setStatus({ type: "loading", message: "주요 기록을 불러오는 중입니다." });

    try {
      const response = await fetch(
        `/api/admin/monthly-highlights?month=${encodeURIComponent(targetMonth)}`,
        { headers: requestHeaders(), cache: "no-store" },
      );
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        highlights?: MonthlyHighlight[];
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "주요 기록을 불러오지 못했습니다.");
      }

      setHighlights(result.highlights ?? []);
      setStatus({
        type: "success",
        message: `${targetMonth} 주요 기록 ${result.highlights?.length ?? 0}건을 불러왔습니다.`,
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "주요 기록을 불러오지 못했습니다.",
      });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!adminToken.trim()) {
      setStatus({
        type: "error",
        message: "저장하려면 관리자 토큰을 입력해 주세요.",
      });
      return;
    }

    let input;

    try {
      input = validateMonthlyHighlightInput({
        month,
        category,
        title,
        dateText,
        description,
        imageUrl,
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error ? error.message : "입력값을 확인해 주세요.",
      });
      return;
    }

    setStatus({
      type: "loading",
      message: editingId ? "주요 기록을 수정하는 중입니다." : "주요 기록을 추가하는 중입니다.",
    });

    try {
      const response = await fetch(
        editingId
          ? `/api/admin/monthly-highlights/${encodeURIComponent(editingId)}`
          : "/api/admin/monthly-highlights",
        {
          method: editingId ? "PUT" : "POST",
          headers: requestHeaders(),
          body: JSON.stringify(input),
        },
      );
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "주요 기록을 저장하지 못했습니다.");
      }

      const successMessage = editingId
        ? "주요 기록을 수정했습니다."
        : "주요 기록을 추가했습니다.";
      resetForm();
      await loadHighlights(month);
      setStatus({ type: "success", message: successMessage });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "주요 기록을 저장하지 못했습니다.",
      });
    }
  };

  const handleEdit = (highlight: MonthlyHighlight) => {
    setMonth(highlight.month);
    setCategory(highlight.category);
    setTitle(highlight.title);
    setDateText(highlight.dateText ?? "");
    setDescription(highlight.description ?? "");
    setImageUrl(highlight.imageUrl ?? "");
    setEditingId(highlight.id);
    setStatus({ type: "idle" });
  };

  const handleDelete = async (highlight: MonthlyHighlight) => {
    if (!window.confirm(`"${highlight.title}" 주요 기록을 삭제할까요?`)) {
      return;
    }

    setStatus({ type: "loading", message: "주요 기록을 삭제하는 중입니다." });

    try {
      const response = await fetch(
        `/api/admin/monthly-highlights/${encodeURIComponent(highlight.id)}`,
        { method: "DELETE", headers: requestHeaders() },
      );
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "주요 기록을 삭제하지 못했습니다.");
      }

      if (editingId === highlight.id) {
        resetForm();
      }
      await loadHighlights(month);
      setStatus({ type: "success", message: "주요 기록을 삭제했습니다." });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "주요 기록을 삭제하지 못했습니다.",
      });
    }
  };

  return (
    <section className="space-y-4" data-admin-panel="highlights">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">
          월별 주요 기록 관리
        </h2>
        <p className="text-sm text-neutral-500">
          게임 업데이트, 이벤트와 길드 소식을 활동 기록과 별도로 관리합니다.
        </p>
      </div>

      <form
        className="space-y-4 rounded-md border border-neutral-200 bg-white p-4"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-neutral-700">
            <span>대상 월</span>
            <input
              className="ui-focus-ring min-h-11 w-full rounded-md border border-neutral-300 px-3 py-2"
              type="month"
              value={month}
              onChange={(event) => {
                setMonth(event.target.value);
                setHighlights([]);
                setEditingId(null);
                setStatus({ type: "idle" });
              }}
              required
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-neutral-700">
            <span>구분</span>
            <select
              className="ui-focus-ring min-h-11 w-full rounded-md border border-neutral-300 px-3 py-2"
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as MonthlyHighlightCategory)
              }
            >
              {monthlyHighlightCategories.map((value) => (
                <option key={value} value={value}>
                  {monthlyHighlightCategoryLabels[value]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block space-y-1 text-sm font-medium text-neutral-700">
          <span>제목</span>
          <input
            className="ui-focus-ring min-h-11 w-full rounded-md border border-neutral-300 px-3 py-2"
            maxLength={120}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-neutral-700">
            <span>날짜·기간</span>
            <input
              className="ui-focus-ring min-h-11 w-full rounded-md border border-neutral-300 px-3 py-2"
              maxLength={80}
              placeholder="예: 7월 1일~7월 14일"
              value={dateText}
              onChange={(event) => setDateText(event.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-neutral-700">
            <span>HTTPS 이미지 URL</span>
            <input
              className="ui-focus-ring min-h-11 w-full rounded-md border border-neutral-300 px-3 py-2"
              inputMode="url"
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
            />
          </label>
        </div>

        <label className="block space-y-1 text-sm font-medium text-neutral-700">
          <span>한 줄 설명</span>
          <textarea
            className="min-h-20 w-full resize-y rounded-md border border-neutral-300 px-3 py-2 text-sm"
            maxLength={500}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        {imageUrl.trim().startsWith("https://") ? (
          <ActivityImage
            alt="주요 기록 이미지 미리보기"
            className="max-h-48 rounded-md border border-neutral-200 object-contain"
            src={imageUrl.trim()}
          />
        ) : null}

        <label className="block space-y-1 text-sm font-medium text-neutral-700">
          <span>관리자 토큰</span>
          <input
            autoComplete="off"
            className="ui-focus-ring min-h-11 w-full rounded-md border border-neutral-300 px-3 py-2"
            placeholder="ADMIN_IMPORT_TOKEN 값 입력"
            type="password"
            value={adminToken}
            onChange={(event) => setAdminToken(event.target.value)}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md bg-[var(--brand-strong)] px-4 py-2 text-sm font-semibold text-white disabled:bg-neutral-300"
            disabled={status.type === "loading"}
            type="submit"
          >
            {editingId ? "주요 기록 수정" : "주요 기록 추가"}
          </button>
          {editingId ? (
            <button
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold"
              type="button"
              onClick={resetForm}
            >
              수정 취소
            </button>
          ) : null}
          <button
            className="rounded-md border border-sky-300 px-4 py-2 text-sm font-semibold text-sky-800"
            disabled={status.type === "loading"}
            type="button"
            onClick={() => loadHighlights(month)}
          >
            선택 월 기록 불러오기
          </button>
        </div>

        {status.type !== "idle" ? (
          <p
            className={`rounded-md px-3 py-2 text-sm ${
              status.type === "error"
                ? "bg-red-50 text-red-700"
                : "bg-neutral-100 text-neutral-700"
            }`}
          >
            {status.message}
          </p>
        ) : null}
      </form>

      {highlights.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500">
          불러온 월별 주요 기록이 없습니다.
        </p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {highlights.map((highlight) => (
            <li
              className="rounded-md border border-neutral-200 bg-white p-4"
              key={highlight.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${monthlyHighlightCategoryBadgeClasses[highlight.category]}`}
                  >
                    {monthlyHighlightCategoryLabels[highlight.category]}
                  </span>
                  <h3 className="mt-2 font-semibold text-neutral-950">
                    {highlight.title}
                  </h3>
                  {highlight.dateText ? (
                    <p className="mt-1 text-xs text-neutral-500">
                      {highlight.dateText}
                    </p>
                  ) : null}
                  {highlight.description ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-600">
                      {highlight.description}
                    </p>
                  ) : null}
                </div>
              </div>
              {highlight.imageUrl ? (
                <ActivityImage
                  alt={`${highlight.title} 이미지`}
                  className="mt-3 max-h-44 w-full rounded-md border border-neutral-200 object-contain"
                  src={highlight.imageUrl}
                />
              ) : null}
              <div className="mt-4 flex gap-2">
                <button
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-semibold"
                  type="button"
                  onClick={() => handleEdit(highlight)}
                >
                  수정
                </button>
                <button
                  className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700"
                  type="button"
                  onClick={() => handleDelete(highlight)}
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
