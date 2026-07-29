"use client";

import { useState } from "react";

type ActivityImageProps = {
  alt: string;
  className: string;
  src?: string;
};

export function ActivityImage({ alt, className, src }: ActivityImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);

  if (!src || failedSource === src) {
    return null;
  }

  return (
    // 외부 HTTPS URL은 R2 전환 전 단계에서도 원본 비율을 유지해야 하므로 img를 사용합니다.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className={className}
      src={src}
      onError={() => setFailedSource(src)}
    />
  );
}
