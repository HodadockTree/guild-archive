import type { D1Database } from "@cloudflare/workers-types";

// `wrangler.jsonc`의 d1_databases 바인딩(DB)에 대응하는 타입입니다.
// wrangler.jsonc의 database_id를 실제 값으로 채운 뒤 `npm run cf:typegen`으로
// 재생성할 수 있습니다.
declare global {
  interface CloudflareEnv {
    DB: D1Database;
    // 관리자 로그인 비밀번호 및 세션 서명용 Secret. wrangler secret 또는 .dev.vars로 설정합니다.
    ADMIN_IMPORT_TOKEN?: string;
  }
}

export {};
