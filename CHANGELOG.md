# CHANGELOG

## Unreleased

### Added

- 관리 화면의 활동 입력·수정 폼에 HTTPS 이미지 URL 입력과 미리보기를 추가했습니다.
- D1 `activities.imageUrl` 컬럼과 기존 DB용 비파괴 마이그레이션을 추가했습니다.
- 기존 JSON 백업의 `imageDataUrl`을 활동 ID 기준으로 사전 점검하고, D1의 빈 이미지
  필드에만 분할 보충하는 관리자용 임시 마이그레이션 기능을 추가했습니다.
- 활동과 분리된 월별 주요 기록 D1 테이블, 관리자 CRUD, 아카이브·월간 리포트
  공개 표시를 추가했습니다.
- 길드원 선택 정보로 성별과 출생연도를 추가하고, 관리자 화면에 출생연도 변환
  안내와 연령대 표시를 추가했습니다.

### Changed

- 공개 활동 이미지는 `imageUrl`, `imageDataUrl` 순서로 선택하며 로딩 실패 시 숨깁니다.
- 기존 파일 선택·붙여넣기와 `imageDataUrl` 데이터 호환은 유지합니다.
- 월간 리포트의 총 참여 횟수를 참여 합계와 활동당 평균의 2열 요약으로 변경했습니다.
- 공개 길드원 응답은 성별, 출생연도, 연령대와 관리자 메모를 포함하지 않습니다.

## v2.0 - 공개 대시보드와 월간 리포트 고도화

### 목표

v2.0은 길드 활동을 입력하고 보관하는 앱에서, 기록된 데이터를 길드원과 공유하는 공개 대시보드/월간 리포트 서비스로 발전한 버전입니다.

새로운 입력 기능을 늘리기보다, v1.9에서 Cloudflare D1로 공유 조회 기반을 만든 활동 데이터를 더 가치 있게 보여주는 데 집중했습니다.

### Added

- 공개 홈 대시보드 `/`를 추가했습니다.
  - 현재 활동중 길드원 수
  - 이번 달 활동 수
  - 이번 달 함께한 길드원 수
  - 최근 활동
- 월별 활동량 그래프를 추가했습니다.
- 월별 참여 인원 그래프를 추가했습니다.
- 대시보드용 D1 API `GET /api/dashboard`를 추가했습니다.
- 월간 리포트에 가장 참여가 많았던 활동 요약을 추가했습니다.
- 월간 리포트에 활동 종류별 통계를 더 명확하게 표시했습니다.

### Changed

- 기존 관리자 화면을 `/`에서 `/admin`으로 분리했습니다.
- `/`는 길드원이 볼 수 있는 공개 홈 대시보드 역할로 변경했습니다.
- `/viewer` 월간 리포트 상단 요약을 강화했습니다.
- 사진 없는 활동 카드가 비어 보이지 않도록 카드 디자인을 개선했습니다.
- `/archive`와 `/viewer`의 이동 링크를 공개 홈 대시보드와 관리자 화면 구조에 맞게 정리했습니다.
- 앱 메타데이터를 서비스명에 맞게 정리했습니다.

### Removed

- 공개 월간 리포트에서 개인별 참여 TOP 5/랭킹성 정보 노출을 제거했습니다.

### Kept

- 기존 관리자 입력/수정/삭제 기능을 `/admin`에서 유지했습니다.
- 길드원 관리, 개인별 활동 확인, JSON 백업/복원, 서버 import 흐름을 유지했습니다.
- 기존 Cloudflare + D1 연동 구조를 유지했습니다.
- `/archive`, `/viewer`, `/viewer?month=YYYY-MM` 공개 조회 흐름을 유지했습니다.

### 검증

- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run cf:build`
- 브라우저에서 `/`, `/viewer`, `/admin` 렌더링 확인
- `/viewer`에서 개인별 참여 TOP 문구가 노출되지 않는 것 확인

## v1.9 - Cloudflare D1 서버 아카이브 전환 + 관리자 토큰 보호

### 목표

v1.8의 Vercel + 파일 기반 SQLite(`better-sqlite3`) 서버 아카이브는 서버리스 배포 환경에서 근본적인 한계가 있었습니다. 서버리스 런타임은 파일시스템이 읽기 전용이거나 일시적이라 파일 DB에 쓴 데이터가 유지되지 않고, `better-sqlite3`는 네이티브 애드온이라 서버리스/엣지 런타임에서 로드되지 않는 경우가 많았습니다.

v1.9의 목표는 이 한계에 대응해 Cloudflare Workers/Pages + Cloudflare D1 기반으로 서버 아카이브를 이전하고, 운영 전 필요한 최소한의 접근 제어(관리자 토큰)를 추가하는 것입니다.

### 구현

- Cloudflare Workers/Pages용 Next.js 배포 구조 추가
  - `wrangler.jsonc`: Workers 배포 설정 + D1 바인딩(`DB`)
  - `open-next.config.ts`: OpenNext(`@opennextjs/cloudflare`) 빌드 설정
  - `next.config.ts`에 `initOpenNextCloudflareForDev()` 추가 (`next dev`에서도 D1 바인딩 접근 가능)
  - `package.json`에 `cf:build` / `cf:preview` / `cf:deploy` / `cf:typegen` / `db:migrate:local` / `db:migrate:remote` 스크립트 추가
  - `better-sqlite3`, `@types/better-sqlite3` 제거
- Cloudflare D1 schema 추가 (`schema.sql`)
  - 기존 v1.8 SQLite 테이블 구조(`members`, `activities`, `activity_participants`, `activity_conquest_types`, `import_logs`)를 그대로 이식
  - 조회/조인에 쓰이는 index 추가(`activities.date`, `activity_participants.memberId`, `activity_conquest_types.activityId`)
- `src/lib/serverDb.ts`를 better-sqlite3 기반에서 Cloudflare D1 기반으로 전면 전환
  - `getServerMembers`, `getServerActivities`, `getServerArchiveMonths`, `getServerMonthlyReport`, `importBackupJson`의 함수명과 반환 구조는 그대로 유지, 내부만 D1 API(`prepare`/`bind`/`all`/`batch`)로 교체
  - `importBackupJson`은 `db.batch()`로 삭제 + 재삽입을 원자적으로 처리
  - 순수 집계 함수 `monthlyArchive.ts`, `monthlyReport.ts`는 변경 없이 재사용
  - 기존 `better-sqlite3` 기반 서버리스 오류 안내 로직(`isKnownServerlessEnvironment` 등) 제거
- API Route 4개는 응답 구조를 유지한 채 D1 비동기 호출에 맞게 내부만 수정
  - `GET /api/health`, `POST /api/import/json`, `GET /api/archive/months`, `GET /api/archive/months/[month]`
- `POST /api/import/json`에 `ADMIN_IMPORT_TOKEN` 기반 Bearer 토큰 보호 추가
  - `Authorization` 헤더 없음 → `401`
  - 토큰이 서버 설정과 다르거나 서버에 토큰이 설정되어 있지 않음 → `403`
  - 정상 응답 구조는 기존과 동일하게 유지
- 관리 화면 `/`에 "서버 반영 토큰" 입력 UI 추가
  - React state로만 보관, LocalStorage/sessionStorage에 저장하지 않음, 화면에 재노출하지 않음
  - "서버 DB로 가져오기" 요청 시 `Authorization: Bearer <token>` 헤더로 전송
  - 토큰이 비어 있으면 요청을 보내지 않고 안내 메시지만 표시
  - **관리 화면의 LocalStorage 기반 입력/수정/삭제 흐름은 변경 없이 그대로 유지**
- `imageDataUrl`은 D1에도 저장하지 않고 v1.8과 동일하게 항상 `null`/`"skipped"` 처리 유지

### 결과

- 서버 아카이브가 Cloudflare Workers/Pages + D1 기반으로 동작하며, 파일 기반 SQLite의 서버리스 한계에서 벗어났습니다.
- `/archive`, `/viewer`는 UI 변경 없이 D1 데이터를 조회합니다.
- 관리 화면 `/`의 LocalStorage 기반 입력/수정/삭제는 v1.8과 동일하게 동작합니다.
- 서버 DB에 데이터를 반영하는 유일한 쓰기 경로(`POST /api/import/json`)가 토큰 없이는 동작하지 않도록 보호되었습니다.

### 주의사항 / 다음 과제

- 로그인, 세션/쿠키 인증, 권한 관리는 아직 없습니다. 단일 관리자 토큰으로 import 엔드포인트만 보호합니다.
- 관리 화면은 아직 D1 직접 저장으로 전환하지 않았습니다(향후 후보).
- 길드원 CRUD, 활동 수정/삭제는 아직 서버 API화되지 않았습니다(향후 후보).
- 이미지/R2 연동은 아직 검토 전입니다(향후 후보). `imageDataUrl`은 여전히 저장하지 않습니다.

### 검증

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npm run cf:build`
- 로컬 D1 에뮬레이션(`wrangler d1 execute --local`) 및 `next dev` 환경에서 `/api/health`, `POST /api/import/json`(무토큰/오답/정상 토큰), `/api/archive/months`, `/api/archive/months/[month]`, `/archive`, `/viewer`, `/` 관리 화면 실제 동작 확인

### 배포 후 핫픽스 - Turbopack 빌드 → webpack 강제

Cloudflare Workers 실제 배포 후 모든 동적 라우트(`/api/health`, `/favicon.ico` 등)에서 `Internal Server Error`가 발생했습니다. `wrangler tail` 로그에서 `ChunkLoadError`와 `components.ComponentMod.handler is not a function`이 확인되었습니다.

- 원인: Next.js 16은 `next build`의 기본 번들러가 Turbopack입니다. `@opennextjs/cloudflare` 1.20.1의 Turbopack 청크 인라이닝 로직이 이 조합에서 일부 서버 청크(`[root-of-the-server]__*`, `[externals]_*`)를 제대로 인라인하지 못해 workerd 런타임에서 로드에 실패했습니다.
- 조치: `package.json`의 `build` 스크립트를 `next build --webpack`으로 변경해 프로덕션 빌드(및 `cf:build`가 내부적으로 실행하는 빌드)를 webpack 산출물로 강제했습니다. `next dev`는 영향 없이 Turbopack을 계속 사용합니다.
- 결과: 로컬 workerd 프리뷰(`npm run cf:preview`)와 실제 배포(`npm run cf:deploy`) 모두에서 `/api/health`, `/api/archive/months`, `/api/archive/months/[month]`, `/archive`, `/viewer`, `/`, `/favicon.ico`, `POST /api/import/json`이 정상 동작함을 확인했습니다.

## v1.8 - SQLite 서버 아카이브 MVP

### 목표

기존 LocalStorage 관리 앱을 유지하면서 서버 기반 공유 아카이브 구조를 도입합니다.

길드원들이 같은 앱 주소에서 같은 월별 아카이브와 보기 전용 리포트를 볼 수 있게 하는 것이 목표입니다.

### 구현

- SQLite 서버 DB 도입
- DB 파일 위치: `.data/guild-archive.sqlite`
- `.data`를 `.gitignore`에 추가
- Next.js API Route 추가
  - `GET /api/health`
  - `POST /api/import/json`
  - `GET /api/archive/months`
  - `GET /api/archive/months/[month]`
- 기존 JSON 백업 데이터를 서버 DB로 import하는 기능 추가
- import 방식은 서버 DB 기존 데이터를 삭제한 뒤 JSON 기준으로 재삽입하는 덮어쓰기 방식
- SQLite 테이블 추가
  - `members`
  - `activities`
  - `activity_participants`
  - `activity_conquest_types`
  - `import_logs`
- `/archive`를 서버 DB/API 기반 조회 화면으로 전환
- `/viewer?month=YYYY-MM`를 서버 DB/API 기반 조회 화면으로 전환
- 기존 관리 화면 `/`의 LocalStorage 기반 입력/수정/삭제 유지
- `imageDataUrl` 컬럼은 유지하되 v1.8 MVP import 시 `null`로 저장

### 결과

- 관리 화면은 기존처럼 브라우저 LocalStorage로 빠르게 기록을 입력할 수 있습니다.
- JSON 백업 파일을 서버 SQLite DB로 가져와 공유용 아카이브 데이터를 만들 수 있습니다.
- `/archive`와 `/viewer`는 서버 DB 기준의 동일한 데이터를 조회합니다.
- LocalStorage 관리 영역과 서버 아카이브 조회 영역이 분리되었습니다.

### 주의사항 / 다음 과제

- 서버 아카이브에서는 이미지 data URL을 사용하지 않습니다.
- 관리 화면 `/`은 아직 서버 저장으로 전환하지 않았습니다.
- LocalStorage와 SQLite DB는 자동 동기화되지 않습니다.
- 로그인, 권한 관리, 실시간 동기화는 아직 없습니다.
- 다음 단계에서는 관리 화면 일부 서버 저장 전환을 검토할 수 있습니다.

### 검증

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

## v1.7 - 월별 아카이브 홈

### 목표

월별 기록을 모아볼 수 있는 아카이브 홈을 만들고, 특정 월 리포트로 자연스럽게 이동할 수 있게 합니다.

### 구현

- `/archive` 월별 아카이브 홈 추가
- 월별 아카이브 카드 표시
- 월별 활동 수 표시
- 월별 참여 길드원 수 표시
- 월별 총 참여 횟수 표시
- 이벤트가 있는 월에는 이벤트 수와 대표 이벤트 표시
- `/archive`에서 `/viewer?month=YYYY-MM` 이동
- 관리 화면 `/` 상단에 `/archive` 이동 링크 추가

### 결과

월별 활동 기록을 한 화면에서 훑고, 원하는 월의 보기 전용 리포트로 이동할 수 있게 되었습니다.

### 다음 과제

- v1.8에서 `/archive`와 `/viewer`를 서버 DB/API 조회 화면으로 전환했습니다.

## v1.6 - 보기 전용 월간 리포트

### 목표

길드원들이 볼 수 있는 보기 전용 화면을 만듭니다.

관리 기능 없이 월간 활동 리포트를 열람할 수 있게 하는 것이 목표입니다.

### 구현

- `/viewer` 보기 전용 페이지 추가
- 월간 활동 리포트 표시
- 활동 종류별 통계 표시
- 점령전 세부 카테고리 통계 표시
- 참여 TOP 5 표시 (당시 기능, v2.0 공개 화면에서는 제거됨)
- 이번 달 이벤트 표시
- 최근 활동 기록 표시
- 관리 기능 없이 읽기 전용 화면으로 구성
- 카드/그리드 형태로 UI 정리
- 이벤트가 없는 월에는 이벤트 섹션 숨김

### 결과

길드원이 관리 화면에 접근하지 않고도 월별 활동 리포트를 확인할 수 있는 기반이 생겼습니다.

### 다음 과제

- v1.7에서 월별 아카이브 홈을 추가해 리포트 접근 흐름을 개선했습니다.

## 이전 버전 요약

- v1.5.x: 월별 정산 공유 문구와 이벤트 모아보기 개선
- v1.4: JSON 백업 내보내기/불러오기와 LocalStorage 복원 안정화
- v1.3.x: 월별 활동 정산 대시보드, JSON 백업 내보내기, 점령전 세부 카테고리 보완
- v1.2.x: 활동 기록 구조 개선, 초성 검색, 데이터 관리 도구 정리
- v1.0~v1.1: 길드원/활동 기록 CRUD와 LocalStorage 기반 MVP
