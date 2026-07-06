# PROJECT_CONTEXT

## 프로젝트 목적

`냥춘 길드 활동 아카이브`는 테일즈런너 길드 `냥춘`의 활동 기록을 입력, 보관, 월별 조회하기 위한 웹앱입니다.

핵심은 길드원 관리 시스템이 아니라 **길드 활동 아카이브**입니다. 길마는 활동 기록을 관리하고, 길드원은 보기 전용 월별 리포트와 월별 아카이브를 통해 기록을 조회합니다.

## 현재 버전과 상태

현재 구현 상태는 v1.9입니다.

v1.8까지는 서버 아카이브가 Vercel + 파일 기반 SQLite(`better-sqlite3`)였습니다. v1.9에서는 이를 **Cloudflare Workers/Pages + Cloudflare D1** 기반으로 이전하고, 서버 반영 경로(`POST /api/import/json`)에 관리자 토큰 보호를 추가했습니다. 기존 LocalStorage 관리 화면과 `/archive`, `/viewer`의 UI/API 응답 구조는 유지됩니다.

## 핵심 라우트

- `/`
  - 길마용 관리 화면
  - LocalStorage 기반 입력/수정/삭제
  - JSON 백업 내보내기/불러오기
  - JSON 백업 파일을 D1 서버 DB로 import하는 진입점 (v1.9부터 서버 반영 토큰 입력 필요)

- `/archive`
  - 월별 아카이브 홈
  - D1 서버 DB/API 기반 조회
  - 월별 활동 수, 참여 길드원 수, 총 참여 횟수, 이벤트 요약 표시
  - 월 카드에서 `/viewer?month=YYYY-MM`로 이동

- `/viewer`
  - 보기 전용 월간 활동 리포트
  - D1 서버 DB/API 기반 조회
  - 월 선택 가능
  - 관리 기능 없음

- `/viewer?month=YYYY-MM`
  - 특정 월 상세 리포트
  - D1 서버 DB/API 기반 조회

## 데이터 저장 구조

### LocalStorage 영역

기존 관리 화면 `/`은 LocalStorage 기반입니다.

주요 역할:

- 길드원 등록/수정/탈퇴
- 활동 기록 추가/수정/삭제
- 참여자 선택
- 스크린샷/디스코드 이미지 첨부
- JSON 백업 내보내기/불러오기
- (v1.9) 서버 반영 토큰 입력 — React state로만 보관, 저장하지 않음

이 영역은 빠른 개인 입력 UX를 유지하기 위해 아직 서버 저장으로 전환하지 않았습니다.

### Cloudflare D1 서버 DB 영역

v1.8에서 SQLite로 처음 추가되었고, v1.9에서 Cloudflare D1로 이전한 서버 아카이브 저장소입니다.

- D1 바인딩 이름: `DB` (`wrangler.jsonc`의 `d1_databases`에서 설정)
- `/archive`, `/viewer`는 D1을 조회합니다.
- 관리 화면의 LocalStorage 데이터와 자동 동기화되지 않습니다.
- JSON 백업 데이터를 관리자 토큰과 함께 import해야 서버 아카이브에 반영됩니다.
- import 시 D1 기존 데이터를 삭제한 뒤 JSON 기준으로 재삽입하는 덮어쓰기 방식이며, `db.batch()`로 원자적으로 처리합니다.

D1 테이블 (`schema.sql`):

- `members`
- `activities`
- `activity_participants`
- `activity_conquest_types`
- `import_logs`

인덱스: `activities(date)`, `activity_participants(memberId)`, `activity_conquest_types(activityId)`

## v1.9 기준 아키텍처

```text
관리 화면 (/)
  LocalStorage
  JSON 백업 내보내기/불러오기
  서버 반영 토큰 입력 (React state)
  JSON 백업 파일 서버 DB import (Authorization: Bearer <token>)

API Routes (Next.js, Cloudflare Workers 위에서 실행)
  GET  /api/health                     D1 연결 확인
  POST /api/import/json                Bearer 토큰 검증 후 D1 import
  GET  /api/archive/months             D1 월별 아카이브 조회
  GET  /api/archive/months/[month]     D1 월간 리포트 조회

Cloudflare D1 (바인딩: DB)
  members / activities /
  activity_participants / activity_conquest_types / import_logs

조회 화면
  /archive
  /viewer
  /viewer?month=YYYY-MM

배포 계층 (OpenNext)
  next.config.ts        initOpenNextCloudflareForDev() (로컬 dev용 D1 접근)
  open-next.config.ts   OpenNext Cloudflare 빌드 설정
  wrangler.jsonc        Workers 배포 + D1 바인딩 + 정적 자산
```

관련 주요 파일:

- `app/page.tsx`: 길마용 관리 화면 (v1.9: 서버 반영 토큰 입력 UI 추가)
- `app/archive/page.tsx`: 월별 아카이브 홈
- `app/viewer/page.tsx`: 보기 전용 월간 리포트
- `app/api/health/route.ts`: D1 연결 확인
- `app/api/import/json/route.ts`: 토큰 검증 + JSON 백업 D1 import
- `app/api/archive/months/route.ts`: D1 월 목록 조회
- `app/api/archive/months/[month]/route.ts`: 특정 월 리포트 조회
- `src/lib/serverDb.ts`: D1 연결, import, 서버 조회 (v1.9: better-sqlite3 → D1 전환)
- `src/lib/serverAuth.ts`: (v1.9 신규) 관리자 토큰 조회 + Bearer 헤더 파싱
- `src/lib/monthlyArchive.ts`: 월별 아카이브 요약 계산 (DB 무관, 순수 함수, 변경 없음)
- `src/lib/monthlyReport.ts`: 월간 리포트 계산 (DB 무관, 순수 함수, 변경 없음)
- `src/lib/backup.ts`: JSON 백업/복원 관련 유틸
- `schema.sql`: D1 스키마 (v1.9 신규)
- `wrangler.jsonc`, `open-next.config.ts`, `cloudflare-env.d.ts`: Cloudflare/OpenNext 배포 설정 (v1.9 신규)
- `.dev.vars.example`: 로컬 환경변수 템플릿 (v1.9 신규, `.dev.vars` 자체는 git에 커밋하지 않음)

## 관리 화면을 아직 서버 저장으로 전환하지 않은 이유

v1.9는 여전히 서버 아카이브 배포 인프라 전환(Cloudflare/D1)과 최소한의 접근 제어에 집중한 범위입니다.

기존 관리 화면은 이미 LocalStorage 기반으로 입력/수정/삭제 흐름이 안정화되어 있습니다. 이를 한 번에 서버 저장으로 전환하면 데이터 수정, 삭제, 이미지 처리, 충돌 처리, 권한 관리까지 함께 설계해야 합니다.

따라서 v1.9에서도 범위를 다음처럼 나눴습니다.

- 입력/수정/삭제: 기존 LocalStorage 관리 화면 유지
- 공유/조회: JSON import(관리자 토큰 인증) 후 Cloudflare D1 서버 DB 기반 archive/viewer 제공

## JSON 백업/import 흐름

1. 관리 화면 `/`에서 기존 LocalStorage 데이터를 JSON으로 백업합니다.
2. 관리 화면에서 서버 반영 토큰을 입력합니다(React state로만 보관).
3. JSON 백업 파일을 서버 DB import 기능으로 업로드하면, `Authorization: Bearer <token>` 헤더와 함께 `POST /api/import/json`을 호출합니다.
4. 서버는 토큰을 검증합니다. 토큰이 없으면 `401`, 토큰이 틀리거나 서버에 설정되어 있지 않으면 `403`을 반환합니다.
5. 토큰이 유효하면 서버는 기존 D1 데이터를 삭제합니다.
6. JSON의 `members`, `activityLogs`, `participantIds`, `conquestTypes`를 기준으로 D1 테이블에 재삽입합니다(`db.batch()`로 원자적 처리).
7. `/archive`, `/viewer`는 새로 import된 D1 데이터를 조회합니다.

import는 증분 병합이 아니라 **덮어쓰기 방식**입니다.

## imageDataUrl 처리 방침

LocalStorage 관리 화면에서는 활동 기록 이미지 첨부를 유지합니다.

다만 서버 아카이브에서는 v1.8부터 지금(v1.9)까지 이미지 data URL을 D1에 저장하지 않습니다.

- `activities.imageDataUrl` 컬럼은 D1 스키마에도 존재합니다.
- JSON import 시 `imageDataUrl`은 항상 `null`로 저장하고, import 응답의 `imageDataUrl` 필드는 `"skipped"`로 고정됩니다.
- 서버 아카이브 `/archive`, `/viewer`에서는 이미지 data URL을 사용하지 않습니다.

이 결정은 D1 용량/행 크기 제한과 공유 화면 안정성을 우선한 범위이며, v2.2에서 R2 연동을 검토할 예정입니다.

## 향후 로드맵

### v1.9 (완료)

- Cloudflare Workers/Pages + OpenNext 배포 구조 도입
- Cloudflare D1로 서버 아카이브 이전 (better-sqlite3 제거)
- `POST /api/import/json`에 `ADMIN_IMPORT_TOKEN` 기반 Bearer 토큰 보호 추가
- 관리 화면에 서버 반영 토큰 입력 UI 추가 (LocalStorage 흐름은 유지)

### v2.0 후보

- 관리 화면의 **신규 활동 등록**을 D1 직접 저장으로 전환 검토
- 로그인/권한 관리 도입 여부 검토
- 서버 DB 백업/복원 흐름 정리

### v2.1 후보

- 활동 기록 **수정/삭제**, **길드원 관리**(등록/수정/탈퇴)의 서버 API화
- 관리자 토큰을 넘어서는 세션/권한 모델 검토(v2.0 로그인 검토와 연계)

### v2.2 후보

- 이미지/R2 연동 검토 (`imageDataUrl`을 D1 대신 Cloudflare R2에 저장하는 방식)
- 서버 DB import 결과 UI 개선

### 이후 후보

- 길드원별 상세 조회
- 연도별 아카이브
- 이벤트 연혁
- 공유 이미지 생성
- 읽기 전용 공개 범위 설정

## 주의사항

- 코드 변경 시 `AGENTS.md` 지침을 우선 확인합니다.
- Next.js 관련 코드를 수정할 때는 `node_modules/next/dist/docs/`의 현재 버전 문서를 확인합니다.
- v1.9 기준 로그인/세션/쿠키 인증은 없습니다. `POST /api/import/json`만 단일 관리자 토큰(`ADMIN_IMPORT_TOKEN`)으로 보호됩니다.
- LocalStorage와 D1은 자동 동기화되지 않습니다.
- 서버 아카이브 갱신은 관리자 토큰과 함께 JSON import가 필요합니다.
- JSON import는 서버 DB 덮어쓰기 방식입니다.
- 실제 `ADMIN_IMPORT_TOKEN` 값은 코드/문서/커밋에 포함하지 않습니다. 로컬은 `.dev.vars`(git 미포함), 배포 환경은 `wrangler secret`으로 관리합니다.
- `imageDataUrl`은 D1 import 시 저장하지 않습니다.
- 서버 아카이브에서 이미지 data URL은 사용하지 않습니다.
