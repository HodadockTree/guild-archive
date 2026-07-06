# 냥춘 길드 활동 아카이브

현재 버전: v1.9

테일즈런너 길드 `냥춘`의 활동 기록을 입력, 보관, 월별로 조회하기 위한 개인용 웹앱입니다.

이 프로젝트는 단순 길드원 관리 시스템이 아니라 **길드 활동 아카이브**를 목표로 합니다. 길마용 관리 화면에서는 기록을 입력하고, 길드원에게 공유할 수 있는 월별 아카이브/보기 전용 리포트는 서버 DB 기반으로 조회합니다.

## 주요 기능

- 길드원 등록, 수정, 탈퇴 처리
- 활동 기록 추가, 수정, 삭제
- 활동 종류 기록
  - 점령전
  - 비공정
  - 이벤트
- 비공정 세부 기록
  - 오션헤븐
  - 아우로라
- 점령전 세부 카테고리 다중 선택
  - 용기, 신념, 평화, 신성, 지혜, 예언, 초심, 긍지, 역전
- 참여자 검색 및 초성 검색
- 월별 활동 정산 대시보드
- 보기 전용 월간 활동 리포트
- 월별 아카이브 홈
- JSON 백업 내보내기/불러오기
- JSON 백업 데이터를 Cloudflare D1 서버 DB로 import (관리자 토큰 인증 필요)
- Cloudflare D1 기반 서버 아카이브 조회

## 라우트 구조

- `/`  
  길마용 관리 화면입니다. 기존 LocalStorage 기반 입력/수정/삭제 흐름을 유지합니다. v1.9부터 서버 반영(JSON import) 시 사용할 토큰 입력칸이 추가되었습니다.

- `/archive`  
  월별 아카이브 홈입니다. v1.9부터 Cloudflare D1 기반 API(`/api/archive/months`)로 월 목록을 조회합니다. (v1.8까지는 파일 기반 SQLite였습니다.)

- `/viewer`  
  보기 전용 월간 활동 리포트 화면입니다. 월 선택 후 D1에 저장된 리포트를 조회합니다.

- `/viewer?month=YYYY-MM`  
  특정 월 상세 리포트를 바로 엽니다.

## 데이터 저장 구조

- 관리 화면 `/`
  - 브라우저 LocalStorage 기반입니다.
  - 기존 입력/수정/삭제 UX를 유지합니다.
  - JSON 백업 내보내기/불러오기를 지원합니다.
  - v1.9부터 "서버 반영 토큰" 입력칸이 추가되어, 입력한 토큰을 `Authorization: Bearer <token>` 헤더로 서버 import 요청에 실어 보냅니다.

- 서버 아카이브 `/archive`, `/viewer`
  - v1.9부터 **Cloudflare D1** + Next.js API Route 기반으로 조회합니다.
  - D1 바인딩 이름은 `DB`이며 `wrangler.jsonc`의 `d1_databases`에서 설정합니다.
  - JSON 백업 데이터를 서버 DB로 import할 수 있습니다(관리자 토큰 필요).
  - import는 서버 DB 기존 데이터를 삭제한 뒤 JSON 기준으로 재삽입하는 덮어쓰기 방식입니다.

## Cloudflare / D1을 사용하는 이유

v1.8까지는 Vercel + 파일 기반 SQLite(`better-sqlite3`, `.data/guild-archive.sqlite`)를 서버 DB로 사용했습니다. 이 구조는 다음과 같은 서버리스 환경의 근본적인 한계가 있었습니다.

- Vercel 같은 서버리스 런타임은 배포마다 새 실행 환경을 쓰고 파일시스템이 읽기 전용이거나 일시적이라, 파일 기반 SQLite에 쓴 데이터가 유지되지 않습니다.
- `better-sqlite3`는 네이티브(N-API) 애드온이라 서버리스/엣지 런타임에서 아예 로드되지 않는 경우가 많습니다.

v1.9에서는 배포 대상을 **Cloudflare Workers/Pages**로 옮기고, 서버 DB를 **Cloudflare D1**(SQLite 호환, Workers 바인딩으로 접근하는 영속 스토리지)로 교체했습니다. Next.js를 Cloudflare Workers용으로 빌드하기 위해 **OpenNext(`@opennextjs/cloudflare`)** 를 사용합니다. D1은 기존 SQLite 스키마를 거의 그대로 이식할 수 있어 v1.8의 조회/집계 로직(`monthlyArchive.ts`, `monthlyReport.ts`)을 변경 없이 재사용할 수 있었습니다.

## LocalStorage 관리 화면과 D1 공개 아카이브의 역할 차이

| | 관리 화면 `/` | 공개 아카이브 `/archive`, `/viewer` |
|---|---|---|
| 저장소 | 브라우저 LocalStorage | Cloudflare D1 |
| 용도 | 길마 개인의 빠른 입력/수정/삭제 | 길드원에게 공유하는 보기 전용 조회 |
| 데이터 반영 시점 | 즉시 (로컬) | JSON 백업을 서버로 import한 시점 |
| 인증 | 없음 (로컬 브라우저 데이터) | import 시 관리자 토큰 필요 (조회는 인증 없음) |
| 자동 동기화 | 두 저장소는 자동 동기화되지 않습니다 | — |

즉, 길마가 관리 화면에서 기록을 관리하다가 길드원에게 공유하고 싶은 시점에 JSON 백업을 만들고, 그 백업을 서버로 import해야 `/archive`, `/viewer`에 반영됩니다.

## 서버 반영 토큰 사용 방식

`POST /api/import/json`은 `ADMIN_IMPORT_TOKEN` 환경변수 기반의 Bearer 토큰으로 보호됩니다.

- 관리 화면 `/` → "데이터 관리 도구" → "백업 / 복원" → JSON 백업 파일을 선택하면 나타나는 "서버 반영 토큰" 입력칸에 토큰을 입력합니다.
- 입력한 토큰은 React state로만 보관되고 LocalStorage/sessionStorage에 저장되지 않습니다. 화면에 다시 출력되지도 않습니다.
- "서버 DB로 가져오기" 클릭 시 `Authorization: Bearer <token>` 헤더로 전송됩니다.
- 토큰을 입력하지 않으면 요청 자체를 보내지 않고 안내 메시지만 표시합니다.
- 서버 쪽 응답:
  - 토큰 헤더가 없으면 `401`
  - 토큰이 서버 설정과 다르거나(또는 서버에 토큰이 설정되어 있지 않으면) `403`
  - 정상 토큰이면 import 진행 후 기존과 동일한 응답 구조 반환

## 로컬 개발 방법

```bash
npm install
cp .dev.vars.example .dev.vars
# .dev.vars에 ADMIN_IMPORT_TOKEN 값을 채워주세요.

npm run db:migrate:local   # 로컬 D1 에뮬레이션에 스키마 적용 (최초 1회)
npm run dev
```

브라우저에서 `http://localhost:3000`을 열어 확인합니다.

`next.config.ts`의 `initOpenNextCloudflareForDev()` 설정으로, `npm run dev`(`next dev`)에서도 `wrangler.jsonc`에 정의된 D1 바인딩(`DB`)에 접근할 수 있습니다. 로컬 개발 단계에서는 실제 Cloudflare D1 데이터베이스가 없어도, `wrangler.jsonc`의 `database_id`가 placeholder 상태여도 로컬 에뮬레이션(`.wrangler/state`)으로 정상 동작합니다.

## Cloudflare 배포 체크리스트

배포 전:

- [ ] `npx wrangler login`으로 Cloudflare 계정 인증
- [ ] `npx wrangler d1 create guild-archive-db`로 실제 D1 데이터베이스 생성
- [ ] 생성된 `database_id`를 `wrangler.jsonc`의 `d1_databases[0].database_id`에 채우기 (현재는 `REPLACE_WITH_D1_DATABASE_ID` placeholder)
- [ ] `npm run db:migrate:remote`로 원격 D1에 `schema.sql` 적용
- [ ] `npx wrangler secret put ADMIN_IMPORT_TOKEN`으로 관리자 토큰 시크릿 등록 (실제 값은 커맨드 실행 시 프롬프트로만 입력, 코드/문서에 남기지 않기)
- [ ] `npm run cf:build`로 OpenNext 빌드 성공 확인

배포:

- [ ] `npm run cf:deploy`로 Cloudflare Workers에 배포

배포 후 확인:

- [ ] `curl https://<배포 도메인>/api/health` → `{"ok":true,"db":"connected"}` 확인
- [ ] `/archive`에서 월별 아카이브 목록이 정상 표시되는지 확인
- [ ] `/viewer` 및 `/viewer?month=YYYY-MM`에서 월간 리포트가 정상 표시되는지 확인
- [ ] 관리 화면 `/`에서 실제 백업 JSON을 선택하고, 서버 반영 토큰을 입력해 "서버 DB로 가져오기"를 실행 → 정상 토큰으로 성공, 잘못된 토큰/무토큰으로 거부되는지 확인
- [ ] import 후 `/archive`, `/viewer`에 반영된 데이터가 실제와 일치하는지 확인

## D1 스키마 적용 방법

스키마는 [schema.sql](schema.sql)에 정의되어 있으며, 기존 v1.8 SQLite 테이블 구조(`members`, `activities`, `activity_participants`, `activity_conquest_types`, `import_logs`)를 그대로 이식했습니다.

```bash
npm run db:migrate:local    # 로컬 D1 에뮬레이션에 적용
npm run db:migrate:remote   # 실제 Cloudflare D1에 적용 (Cloudflare 인증 필요)
```

## 환경변수 / 시크릿 설정 방법

- **로컬 개발**: [.dev.vars.example](.dev.vars.example)을 `.dev.vars`로 복사한 뒤 실제 값으로 교체합니다. `.dev.vars`는 `.gitignore`에 등록되어 있어 git에 커밋되지 않습니다.
- **Cloudflare 배포 환경**: `wrangler.jsonc`나 코드에 실제 토큰 값을 하드코딩하지 않고, `npx wrangler secret put ADMIN_IMPORT_TOKEN` 또는 Cloudflare 대시보드(Workers & Pages → 해당 워커 → Settings → Variables and Secrets)에서 시크릿으로 등록합니다.
- D1 바인딩(`DB`)은 시크릿이 아니라 `wrangler.jsonc`의 `d1_databases` 설정으로 관리됩니다.

## 실행 방법

```bash
npm install
npm run dev
```

### Cloudflare 빌드 / 프리뷰 / 배포

```bash
npm run cf:build     # OpenNext로 Cloudflare Workers용 빌드
npm run cf:preview   # 로컬에서 workerd 런타임으로 프리뷰
npm run cf:deploy    # Cloudflare에 배포
npm run cf:typegen   # wrangler.jsonc 바인딩 기준으로 cloudflare-env.d.ts 재생성
```

> **`build` 스크립트는 `next build --webpack`으로 고정되어 있습니다.** Next.js 16의 기본 번들러(Turbopack)로 빌드하면 `@opennextjs/cloudflare` 1.20.1이 일부 서버 청크를 Workers 런타임에서 제대로 로드하지 못해 배포 후 모든 동적 라우트가 `Internal Server Error`로 실패합니다(자세한 내용은 [CHANGELOG.md](CHANGELOG.md)의 "배포 후 핫픽스" 참고). `--webpack`을 제거하지 마세요. `next dev`(로컬 개발)는 이 문제와 무관하며 계속 Turbopack을 사용합니다.

## 검증 명령

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run cf:build
```

## 주의사항

- v1.9 기준 로그인, 세션/쿠키 인증, 권한 관리는 없습니다. `POST /api/import/json`만 단일 관리자 토큰으로 보호됩니다.
- 관리 화면의 LocalStorage 데이터와 D1 서버 DB는 자동 동기화되지 않습니다.
- 서버 DB로 반영하려면 JSON 백업 파일을 관리자 토큰과 함께 import해야 합니다.
- `imageDataUrl` 컬럼은 D1 스키마에 남아 있지만, v1.9까지도 import 시 항상 `null`로 저장합니다. 이미지 저장/R2 연동은 아직 구현되지 않았습니다.
- 서버 아카이브(`/archive`, `/viewer`)에서는 이미지 data URL을 사용하지 않습니다.
- Next.js 관련 코드를 수정할 때는 `node_modules/next/dist/docs/`의 현재 버전 문서를 먼저 확인합니다(`AGENTS.md` 참고).
