import type { ActivityLog } from "@/src/types";

type ActivityImageFields = Pick<ActivityLog, "imageUrl" | "imageDataUrl">;

export function getActivityImageSource(activity: ActivityImageFields) {
  const imageDataUrl =
    typeof activity.imageDataUrl === "string"
      ? activity.imageDataUrl.trim() || undefined
      : undefined;

  // A stored image is durable, while external URLs (notably signed Discord
  // attachment URLs) can expire. Prefer the stored copy when both exist.
  if (imageDataUrl) {
    return imageDataUrl;
  }

  const imageUrl =
    typeof activity.imageUrl === "string"
      ? validateActivityImageUrl(activity.imageUrl)
      : null;

  if (imageUrl?.valid && imageUrl.value) {
    return imageUrl.value;
  }

  return undefined;
}

export function isTemporaryDiscordImageUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const isDiscordAttachmentHost =
      url.hostname === "cdn.discordapp.com" ||
      url.hostname === "media.discordapp.net";

    return (
      isDiscordAttachmentHost &&
      url.pathname.startsWith("/attachments/") &&
      url.searchParams.has("ex") &&
      url.searchParams.has("hm")
    );
  } catch {
    return false;
  }
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
