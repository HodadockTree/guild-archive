export const IMAGE_DATA_MIGRATION_BATCH_SIZE = 10;
export const MAX_MIGRATION_IMAGE_DATA_URL_LENGTH = 1_500_000;
export const MAX_MIGRATION_BATCH_LENGTH = 4_500_000;

export type ImageDataMigrationMode = "preview" | "apply";

export type ImageDataMigrationItem = {
  id: string;
  imageDataUrl: string;
};

const SUPPORTED_IMAGE_DATA_URL_PATTERN =
  /^data:image\/(?:jpeg|png|webp|gif);base64,[a-z0-9+/=\s]+$/i;

export function validateImageDataMigrationRequest(data: unknown): {
  mode: ImageDataMigrationMode;
  images: ImageDataMigrationItem[];
} {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("이미지 보충 요청 형식이 올바르지 않습니다.");
  }

  const record = data as Record<string, unknown>;
  const mode = record.mode;
  const images = record.images;

  if (mode !== "preview" && mode !== "apply") {
    throw new Error("이미지 보충 실행 모드가 올바르지 않습니다.");
  }

  if (!Array.isArray(images) || images.length === 0) {
    throw new Error("보충할 이미지가 없습니다.");
  }

  if (images.length > IMAGE_DATA_MIGRATION_BATCH_SIZE) {
    throw new Error(
      `이미지는 한 번에 ${IMAGE_DATA_MIGRATION_BATCH_SIZE}개까지만 처리할 수 있습니다.`,
    );
  }

  const normalizedImages = images.map((image) => {
    if (!image || typeof image !== "object" || Array.isArray(image)) {
      throw new Error("일부 이미지 보충 데이터 형식이 올바르지 않습니다.");
    }

    const imageRecord = image as Record<string, unknown>;
    const id = typeof imageRecord.id === "string" ? imageRecord.id.trim() : "";
    const imageDataUrl =
      typeof imageRecord.imageDataUrl === "string"
        ? imageRecord.imageDataUrl.trim()
        : "";

    if (!id || !imageDataUrl) {
      throw new Error("활동 ID와 비어 있지 않은 이미지 데이터가 필요합니다.");
    }

    if (imageDataUrl.length > MAX_MIGRATION_IMAGE_DATA_URL_LENGTH) {
      throw new Error(
        `활동 ${id}의 이미지가 안전한 D1 저장 크기(약 1.5MB)를 초과합니다.`,
      );
    }

    if (!SUPPORTED_IMAGE_DATA_URL_PATTERN.test(imageDataUrl)) {
      throw new Error(`활동 ${id}의 이미지 데이터 형식이 올바르지 않습니다.`);
    }

    return { id, imageDataUrl };
  });

  const uniqueIds = new Set(normalizedImages.map((image) => image.id));

  if (uniqueIds.size !== normalizedImages.length) {
    throw new Error("한 요청에 동일한 활동 ID가 중복되어 있습니다.");
  }

  const totalLength = normalizedImages.reduce(
    (sum, image) => sum + image.id.length + image.imageDataUrl.length,
    0,
  );

  if (totalLength > MAX_MIGRATION_BATCH_LENGTH) {
    throw new Error("한 번에 전송한 이미지 데이터가 4.5MB를 초과합니다.");
  }

  return { mode, images: normalizedImages };
}

export function createImageDataMigrationBatches(
  images: ImageDataMigrationItem[],
) {
  const batches: ImageDataMigrationItem[][] = [];
  let currentBatch: ImageDataMigrationItem[] = [];
  let currentLength = 0;

  images.forEach((image) => {
    const itemLength = image.id.length + image.imageDataUrl.length;
    const shouldStartNextBatch =
      currentBatch.length >= IMAGE_DATA_MIGRATION_BATCH_SIZE ||
      (currentBatch.length > 0 &&
        currentLength + itemLength > MAX_MIGRATION_BATCH_LENGTH);

    if (shouldStartNextBatch) {
      batches.push(currentBatch);
      currentBatch = [];
      currentLength = 0;
    }

    currentBatch.push(image);
    currentLength += itemLength;
  });

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}
