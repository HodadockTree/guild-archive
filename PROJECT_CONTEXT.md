# PROJECT_CONTEXT

## 프로젝트 목적

`냥춘 길드 활동 아카이브`는 테일즈런너 길드 `냥춘`의 활동 기록을 입력, 보관, 월별 조회하기 위한 웹앱입니다.

핵심은 길드원 관리 시스템이 아니라 **길드 활동 아카이브**입니다. 길마는 활동 기록을 관리하고, 길드원은 보기 전용 월별 리포트와 월별 아카이브를 통해 기록을 조회합니다.

## 현재 버전과 상태

현재 구현 상태는 v1.8입니다.

v1.8에서는 기존 LocalStorage 관리 화면을 유지하면서 SQLite 서버 DB와 API Route가 추가되었습니다. `/archive`와 `/viewer`는 서버 DB/API 기반 조회 화면으로 전환되었습니다.

## 핵심 라우트

- `/`
  - 길마용 관리 화면
  - LocalStorage 기반 입력/수정/삭제
  - JSON 백업 내보내기/불러오기
  - JSON 백업 파일을 서버 DB로 import하는 진입점

- `/archive`
  - 월별 아카이브 홈
  - 서버 DB/API 기반 조회
  - 월별 활동 수, 참여 길드원 수, 총 참여 횟수, 이벤트 요약 표시
  - 월 카드에서 `/viewer?month=YYYY-MM`로 이동

- `/viewer`
  - 보기 전용 월간 활동 리포트
  - 서버 DB/API 기반 조회
  - 월 선택 가능
  - 관리 기능 없음

- `/viewer?month=YYYY-MM`
  - 특정 월 상세 리포트
  - 서버 DB/API 기반 조회

## 데이터 저장 구조

### LocalStorage 영역

기존 관리 화면 `/`은 LocalStorage 기반입니다.

주요 역할:

- 길드원 등록/수정/탈퇴
- 활동 기록 추가/수정/삭제
- 참여자 선택
- 스크린샷/디스코드 이미지 첨부
- JSON 백업 내보내기/불러오기

이 영역은 빠른 개인 입력 UX를 유지하기 위해 아직 서버 저장으로 전환하지 않았습니다.

### SQLite 서버 DB 영역

v1.8에서 추가된 서버 아카이브 저장소입니다.

- DB 파일 위치: `.data/guild-archive.sqlite`
- `.data`는 `.gitignore`에 포함되어 git에 올리지 않습니다.
- `/archive`, `/viewer`는 서버 DB를 조회합니다.
- 관리 화면의 LocalStorage 데이터와 자동 동기화되지 않습니다.
- JSON 백업 데이터를 import해야 서버 아카이브에 반영됩니다.

SQLite 테이블:

- `members`
- `activities`
- `activity_participants`
- `activity_conquest_types`
- `import_logs`

## v1.8 기준 아키텍처

```text
관리 화면 (/)
  LocalStorage
  JSON 백업 내보내기/불러오기
  JSON 백업 파일 서버 DB import

API Routes
  GET  /api/health
  POST /api/import/json
  GET  /api/archive/months
  GET  /api/archive/months/[month]

SQLite DB
  .data/guild-archive.sqlite

조회 화면
  /archive
  /viewer
  /viewer?month=YYYY-MM
```

관련 주요 파일:

- `app/page.tsx`: 길마용 관리 화면
- `app/archive/page.tsx`: 월별 아카이브 홈
- `app/viewer/page.tsx`: 보기 전용 월간 리포트
- `app/api/health/route.ts`: DB 연결 확인
- `app/api/import/json/route.ts`: JSON 백업 서버 DB import
- `app/api/archive/months/route.ts`: 서버 DB 월 목록 조회
- `app/api/archive/months/[month]/route.ts`: 특정 월 리포트 조회
- `src/lib/serverDb.ts`: SQLite 연결, 스키마 생성, import, 서버 조회
- `src/lib/monthlyArchive.ts`: 월별 아카이브 요약 계산
- `src/lib/monthlyReport.ts`: 월간 리포트 계산
- `src/lib/backup.ts`: JSON 백업/복원 관련 유틸

## 관리 화면을 아직 서버 저장으로 전환하지 않은 이유

v1.8은 서버 아카이브 MVP입니다.

기존 관리 화면은 이미 LocalStorage 기반으로 입력/수정/삭제 흐름이 안정화되어 있습니다. 이를 한 번에 서버 저장으로 전환하면 데이터 수정, 삭제, 이미지 처리, 충돌 처리, 권한 관리까지 함께 설계해야 합니다.

따라서 v1.8에서는 다음처럼 범위를 나눴습니다.

- 입력/수정/삭제: 기존 LocalStorage 관리 화면 유지
- 공유/조회: JSON import 후 SQLite 서버 DB 기반 archive/viewer 제공

이 구조는 기존 사용 흐름을 깨지 않으면서 서버 기반 조회 화면을 먼저 검증하기 위한 단계입니다.

## JSON 백업/import 흐름

1. 관리 화면 `/`에서 기존 LocalStorage 데이터를 JSON으로 백업합니다.
2. JSON 백업 파일을 서버 DB import 기능으로 업로드합니다.
3. 서버는 기존 SQLite 데이터를 삭제합니다.
4. JSON의 `members`, `activityLogs`, `participantIds`, `conquestTypes`를 기준으로 테이블에 재삽입합니다.
5. `/archive`, `/viewer`는 새로 import된 서버 DB 데이터를 조회합니다.

import는 증분 병합이 아니라 **덮어쓰기 방식**입니다.

## imageDataUrl 처리 방침

LocalStorage 관리 화면에서는 활동 기록 이미지 첨부를 유지합니다.

다만 v1.8 서버 아카이브 MVP에서는 이미지 data URL을 서버 DB에 저장하지 않습니다.

- `activities.imageDataUrl` 컬럼은 존재합니다.
- JSON import 시 `imageDataUrl`은 `null`로 저장합니다.
- 서버 아카이브 `/archive`, `/viewer`에서는 이미지 data URL을 사용하지 않습니다.

이 결정은 DB 용량과 공유 화면 안정성을 우선한 v1.8 MVP 범위입니다.

## 향후 로드맵

### v1.9 후보

- 관리 화면 일부 서버 저장 전환 검토
- 서버 DB import 결과 UI 개선
- 서버 DB 기준 archive/viewer 운영 안정화
- LocalStorage와 서버 DB의 역할 정리

### v2.0 후보

- 서버 기반 정식 운영 검토
- 로그인/권한 관리 도입 여부 검토
- 관리 화면 서버 저장 전환
- 서버 DB 백업/복원 흐름 정리

### 이후 후보

- 길드원별 상세 조회
- 연도별 아카이브
- 이벤트 연혁
- 공유 이미지 생성
- 읽기 전용 공개 범위 설정

## 주의사항

- 코드 변경 시 `AGENTS.md` 지침을 우선 확인합니다.
- Next.js 관련 코드를 수정할 때는 `node_modules/next/dist/docs/`의 현재 버전 문서를 확인합니다.
- v1.8 기준 로그인/권한 관리는 없습니다.
- LocalStorage와 SQLite DB는 자동 동기화되지 않습니다.
- 서버 아카이브 갱신은 JSON import가 필요합니다.
- JSON import는 서버 DB 덮어쓰기 방식입니다.
- `.data/guild-archive.sqlite`는 로컬 DB 파일이며 git에 올리지 않습니다.
- `imageDataUrl`은 서버 DB import 시 저장하지 않습니다.
- 서버 아카이브에서 이미지 data URL은 사용하지 않습니다.
