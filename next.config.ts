import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

// `next dev`에서도 getCloudflareContext()로 D1 바인딩(wrangler.jsonc 기준)에 접근할 수 있도록 합니다.
initOpenNextCloudflareForDev();
