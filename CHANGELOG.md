# CHANGELOG

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
- 참여 TOP 5 표시
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
