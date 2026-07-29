import type {
  MonthlyHighlight,
  MonthlyHighlightCategory,
} from "@/src/types";
import { validateActivityImageUrl } from "@/src/lib/activityImage";

export const monthlyHighlightCategoryLabels: Record<
  MonthlyHighlightCategory,
  string
> = {
  game_update: "게임 업데이트",
  game_event: "게임 이벤트",
  guild_news: "길드 소식",
  other: "기타",
};

export const monthlyHighlightCategories = Object.keys(
  monthlyHighlightCategoryLabels,
) as MonthlyHighlightCategory[];

export type MonthlyHighlightInput = Pick<
  MonthlyHighlight,
  "month" | "category" | "title"
> &
  Partial<
    Pick<MonthlyHighlight, "dateText" | "description" | "imageUrl">
  >;

export type PublicMonthlyHighlight = Pick<
  MonthlyHighlight,
  | "id"
  | "month"
  | "category"
  | "title"
  | "dateText"
  | "description"
  | "imageUrl"
>;

export function toPublicMonthlyHighlight(
  highlight: MonthlyHighlight,
): PublicMonthlyHighlight {
  return {
    id: highlight.id,
    month: highlight.month,
    category: highlight.category,
    title: highlight.title,
    dateText: highlight.dateText,
    description: highlight.description,
    imageUrl: highlight.imageUrl,
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
  const dateText =
    typeof record.dateText === "string" ? record.dateText.trim() : "";
  const description =
    typeof record.description === "string" ? record.description.trim() : "";
  const imageUrl =
    typeof record.imageUrl === "string" ? record.imageUrl.trim() : "";

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error("대상 월을 YYYY-MM 형식으로 입력해 주세요.");
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

  const imageUrlResult = validateActivityImageUrl(imageUrl);

  if (!imageUrlResult.valid) {
    throw new Error(imageUrlResult.error);
  }

  return {
    month,
    category: category as MonthlyHighlightCategory,
    title,
    dateText: dateText || undefined,
    description: description || undefined,
    imageUrl: imageUrlResult.value,
  };
}

export function sortMonthlyHighlights(highlights: MonthlyHighlight[]) {
  return [...highlights].sort((first, second) => {
    const firstDate = first.dateText?.trim() || "9999";
    const secondDate = second.dateText?.trim() || "9999";
    const dateOrder = firstDate.localeCompare(secondDate, "ko");

    return dateOrder || first.createdAt.localeCompare(second.createdAt);
  });
}
