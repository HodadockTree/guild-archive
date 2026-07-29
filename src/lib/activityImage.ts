import type { ActivityLog } from "@/src/types";

type ActivityImageFields = Pick<ActivityLog, "imageUrl" | "imageDataUrl">;

export function getActivityImageSource(activity: ActivityImageFields) {
  const imageUrl =
    typeof activity.imageUrl === "string"
      ? validateActivityImageUrl(activity.imageUrl)
      : null;

  if (imageUrl?.valid && imageUrl.value) {
    return imageUrl.value;
  }

  return typeof activity.imageDataUrl === "string"
    ? activity.imageDataUrl.trim() || undefined
    : undefined;
}

export function validateActivityImageUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return { valid: true as const, value: undefined };
  }

  try {
    const url = new URL(trimmedValue);

    if (url.protocol !== "https:") {
      return {
        valid: false as const,
        error: "이미지 URL은 https://로 시작하는 주소만 사용할 수 있습니다.",
      };
    }

    return { valid: true as const, value: url.toString() };
  } catch {
    return {
      valid: false as const,
      error: "올바른 이미지 URL을 입력해 주세요. 예: https://example.com/image.jpg",
    };
  }
}
