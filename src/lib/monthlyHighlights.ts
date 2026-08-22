import type {
  MonthlyHighlight,
  MonthlyHighlightCategory,
} from "@/src/types";

export const monthlyHighlightCategoryLabels: Record<
  MonthlyHighlightCategory,
  string
> = {
  game_update: "게임 업데이트",
  game_event: "게임 이벤트",
  guild_news: "길드 소식",
  other: "기타",
};

export const monthlyHighlightCategoryBadgeClasses: Record<
  MonthlyHighlightCategory,
  string
> = {
  game_update: "bg-violet-100 font-semibold text-violet-800",
  game_event: "bg-amber-100 font-semibold text-amber-800",
  guild_news: "bg-emerald-100 font-medium text-emerald-800",
  other: "bg-slate-100 font-medium text-slate-600",
};

export const monthlyHighlightCategories = Object.keys(
  monthlyHighlightCategoryLabels,
) as MonthlyHighlightCategory[];

export type MonthlyHighlightInput = Pick<
  MonthlyHighlight,
  "month" | "category" | "title"
> &
  Partial<Pick<MonthlyHighlight, "startDate" | "endDate" | "dateText" | "description">>;

export type PublicMonthlyHighlight = Pick<
  MonthlyHighlight,
  | "id"
  | "month"
  | "category"
  | "title"
  | "startDate"
  | "endDate"
  | "dateText"
  | "description"
>;

export function toPublicMonthlyHighlight(
  highlight: MonthlyHighlight,
): PublicMonthlyHighlight {
  return {
    id: highlight.id,
    month: highlight.month,
    category: highlight.category,
    title: highlight.title,
    startDate: highlight.startDate,
    endDate: highlight.endDate,
    dateText: highlight.dateText,
    description: highlight.description,
  };
}

export function validateMonthlyHighlightInput(data: unknown): MonthlyHighlightInput {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("주요 기록 형식이 올바르지 않습니다.");
  }

  const record = data as Record<string, unknown>;
  const month = typeof record.month === "string" ? record.month.trim() : "";
  const category =
    typeof record.category === "string" ? record.category.trim() : "";
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const startDate = typeof record.startDate === "string" ? record.startDate.trim() : "";
  const endDate = typeof record.endDate === "string" ? record.endDate.trim() : "";
  const dateText =
    typeof record.dateText === "string" ? record.dateText.trim() : "";
  const description =
    typeof record.description === "string" ? record.description.trim() : "";

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error("대상 월을 YYYY-MM 형식으로 입력해 주세요.");
  }

  if (startDate && !/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(startDate)) {
    throw new Error("시작일을 YYYY-MM-DD 형식으로 입력해 주세요.");
  }

  if (endDate && !startDate) {
    throw new Error("종료일을 입력하려면 시작일이 필요합니다.");
  }

  if (endDate && endDate < startDate) {
    throw new Error("종료일은 시작일과 같거나 이후여야 합니다.");
  }

  if (
    !monthlyHighlightCategories.includes(
      category as MonthlyHighlightCategory,
    )
  ) {
    throw new Error("주요 기록 구분이 올바르지 않습니다.");
  }

  if (!title || title.length > 120) {
    throw new Error("제목은 1자 이상 120자 이하로 입력해 주세요.");
  }

  if (dateText.length > 80) {
    throw new Error("날짜·기간은 80자 이하로 입력해 주세요.");
  }

  if (description.length > 500) {
    throw new Error("설명은 500자 이하로 입력해 주세요.");
  }

  return {
    month,
    category: category as MonthlyHighlightCategory,
    title,
    startDate: startDate || undefined,
    endDate: endDate && endDate !== startDate ? endDate : undefined,
    dateText: dateText || undefined,
    description: description || undefined,
  };
}

export function sortMonthlyHighlights(highlights: MonthlyHighlight[]) {
  const categoryPriority: Record<MonthlyHighlightCategory, number> = {
    game_event: 0,
    game_update: 0,
    guild_news: 1,
    other: 2,
  };

  return [...highlights].sort((first, second) => {
    const categoryOrder =
      categoryPriority[first.category] - categoryPriority[second.category];
    const firstDate = first.startDate || first.dateText?.trim() || "9999";
    const secondDate = second.startDate || second.dateText?.trim() || "9999";
    const dateOrder = firstDate.localeCompare(secondDate, "ko");

    return (
      categoryOrder ||
      dateOrder ||
      first.createdAt.localeCompare(second.createdAt)
    );
  });
}

export function getMonthlyHighlightDateText(highlight: Pick<MonthlyHighlight, "startDate" | "endDate" | "dateText">) {
  if (!highlight.startDate) return highlight.dateText?.trim() || "";
  const start = highlight.startDate.slice(5).replace("-", "/");
  const end = highlight.endDate?.slice(5).replace("-", "/");
  return end ? `${start}~${end}` : start;
}

export function getMonthlyHighlightMonths(highlight: Pick<MonthlyHighlight, "month" | "startDate" | "endDate">) {
  if (!highlight.startDate) return [highlight.month];
  const endMonth = (highlight.endDate ?? highlight.startDate).slice(0, 7);
  const months: string[] = [];
  let [year, month] = highlight.startDate.slice(0, 7).split("-").map(Number);
  while (`${year}-${String(month).padStart(2, "0")}` <= endMonth) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month === 13) { year += 1; month = 1; }
  }
  return months;
}
