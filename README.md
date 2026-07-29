# 냥춘 길드 활동 아카이브

현재 버전: v2.0

테일즈런너 길드 `냥춘`의 활동 기록을 입력, 보관하고, 기록된 데이터를 길드원과 공유할 수 있는 공개 대시보드/월간 리포트 웹앱입니다.

v2.0은 길드 활동을 입력하고 보관하는 앱에서, 기록된 데이터를 길드원과 공유하는 공개 대시보드/월간 리포트 서비스로 발전한 버전입니다.

## 주요 기능

- 공개 홈 대시보드
  - 현재 활동중 길드원 수
  - 이번 달 활동 수
  - 이번 달 함께한 길드원 수
  - 최근 활동
  - 월별 활동량 그래프
  - 월별 참여 인원 그래프
- 월별 아카이브 홈
- 보기 전용 월간 활동 리포트
  - 해당 월 요약
  - 활동 종류별 통계
  - 가장 참여가 많았던 활동
  - 활동 카드 목록
  - 사진 없는 활동 카드 디자인 개선
- 관리자 화면 `/admin`
  - 길드원 등록, 수정, 탈퇴 처리
  - 활동 기록 추가, 수정, 삭제
  - 참여자 검색 및 초성 검색
  - 월별 활동 정산 및 개인별 활동 확인
  - JSON 백업 내보내기/불러오기
  - JSON 백업 데이터를 Cloudflare D1 서버 DB로 import (관리자 토큰 인증 필요)
- 활동 종류 기록
  - 점령전
  - 비공정
  - 이벤트
- 비공정 세부 기록
  - 오션헤븐
  - 아우로라
- 점령전 세부 카테고리 다중 선택
  - 용기, 신념, 평화, 신성, 지혜, 예언, 초심, 긍지, 역전
- Cloudflare D1 기반 공유 데이터 조회

## 라우트 구조

- `/`  
  공개 홈 대시보드입니다. D1에 반영된 서버 데이터를 기준으로 현재 길드 현황, 이번 달 활동, 월별 추이, 최근 활동을 보여줍니다.

- `/archive`  
  공개 월별 아카이브 홈입니다. Cloudflare D1 기반 API(`/api/archive/months`)로 월 목록과 월별 요약을 조회합니다.

- `/viewer`  
  공개 월간 활동 리포트/활동 뷰어입니다. 월 선택 후 D1에 저장된 리포트를 조회합니다.

- `/viewer?month=YYYY-MM`  
  특정 월 상세 리포트를 바로 엽니다.

- `/admin`
  관리자 입력/수정/삭제 화면입니다. 기존 LocalStorage 기반 관리 기능을 보존하며, 서버 반영(JSON import) 시 사용할 관리자 토큰 입력 기능을 포함합니다.

## 공개 화면과 관리자 화면의 역할

| | 공개 화면 `/`, `/archive`, `/viewer` | 관리자 화면 `/admin` |
|---|---|---|
| 주요 사용자 | 길드원, 공유 링크 방문자 | 길마/관리자 |
| 목적 | 현황과 월간 리포트 조회 | 기록 입력, 수정, 삭제, 서버 반영 |
| 저장소 | Cloudflare D1 조회 | 브라우저 LocalStorage 관리 |
| 제공 정보 | 전체 활동 흐름, 월별 추이, 최근 활동, 월간 리포트 | 길드원 관리, 활동 기록 관리, 개인별 활동 확인 |
| 개인별 랭킹성 정보 | 노출하지 않음 | 관리 목적 화면에서만 확인 |
| 인증 | 조회는 인증 없음 | 서버 import 시 관리자 토큰 필요 |

공개 화면은 길드원이 부담 없이 볼 수 있는 현황판/기록물에 가깝게 구성합니다. 개인별 참여 랭킹, 미참여자 목록, 운영 판단용 상세 데이터는 공개 화면에 노출하지 않습니다.

관리자 화면은 기존 입력/수정/삭제 UX를 유지합니다. 관리 화면에서 기록을 관리한 뒤 JSON 백업을 서버 DB로 import해야 공개 화면에 반영됩니다.

## 데이터 저장 구조

### LocalStorage 관리 화면

- 경로: `/admin`
- 브라우저 LocalStorage 기반입니다.
- 기존 입력/수정/삭제 UX를 유지합니다.
- JSON 백업 내보내기/불러오기를 지원합니다.
- "서버 반영 토큰" 입력칸에 입력한 토큰을 `Authorization: Bearer <token>` 헤더로 서버 import 요청에 실어 보냅니다.
- 토큰은 React state로만 보관되고 LocalStorage/sessionStorage에 저장되지 않습니다.

### Cloudflare D1 공개 조회 영역

- 경로: `/`, `/archive`, `/viewer`
- **Cloudflare D1** + Next.js API Route 기반으로 조회합니다.
- D1 바인딩 이름은 `DB`이며 `wrangler.jsonc`의 `d1_databases`에서 설정합니다.
- JSON 백업 데이터를 서버 DB로 import할 수 있습니다(관리자 토큰 필요).
- import는 서버 DB 기존 데이터를 삭제한 뒤 JSON 기준으로 재삽입하는 덮어쓰기 방식입니다.
- 관리 화면의 LocalStorage 데이터와 D1 서버 DB는 자동 동기화되지 않습니다.

## Cloudflare / D1을 사용하는 이유

v1.8까지는 Vercel + 파일 기반 SQLite(`better-sqlite3`, `.data/guild-archive.sqlite`)를 서버 DB로 사용했습니다. 이 구조는 다음과 같은 서버리스 환경의 근본적인 한계가 있었습니다.

- Vercel 같은 서버리스 런타임은 배포마다 새 실행 환경을 쓰고 파일시스템이 읽기 전용이거나 일시적이라, 파일 기반 SQLite에 쓴 데이터가 유지되지 않습니다.
- `better-sqlite3`는 네이티브(N-API) 애드온이라 서버리스/엣지 런타임에서 아예 로드되지 않는 경우가 많습니다.

v1.9에서는 배포 대상을 **Cloudflare Workers/Pages**로 옮기고, 서버 DB를 **Cloudflare D1**(SQLite 호환, Workers 바인딩으로 접근하는 영속 스토리지)로 교체했습니다. Next.js를 Cloudflare Workers용으로 빌드하기 위해 **OpenNext(`@opennextjs/cloudflare`)** 를 사용합니다.

v2.0에서는 이 D1 데이터를 기반으로 공개 홈 대시보드와 월간 리포트 통계를 확장했습니다.

## 서버 반영 토큰 사용 방식

`POST /api/import/json`은 `ADMIN_IMPORT_TOKEN` 환경변수 기반의 Bearer 토큰으로 보호됩니다.

- 관리 화면 `/admin` → "데이터 관리 도구" → "백업 / 복원" → JSON 백업 파일을 선택하면 나타나는 "서버 반영 토큰" 입력칸에 토큰을 입력합니다.
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

브라우저에서 `http://localhost:3000`을 열면 공개 홈 대시보드를 확인할 수 있습니다. 관리 화면은 `http://localhost:3000/admin`입니다.

`next.config.ts`의 `initOpenNextCloudflareForDev()` 설정으로, `npm run dev`(`next dev`)에서도 `wrangler.jsonc`에 정의된 D1 바인딩(`DB`)에 접근할 수 있습니다.

## Cloudflare 배포 체크리스트

배포 전:

- [ ] `npx wrangler login`으로 Cloudflare 계정 인증
- [ ] `npx wrangler d1 create guild-archive-db`로 실제 D1 데이터베이스 생성
- [ ] 생성된 `database_id`를 `wrangler.jsonc`의 `d1_databases[0].database_id`에 채우기 (현재는 `REPLACE_WITH_D1_DATABASE_ID` placeholder)
- [ ] `npm run db:migrate:remote`로 원격 D1에 `schema.sql` 적용
- [ ] `npx wrangler secret put ADMIN_IMPORT_TOKEN`으로 관리자 토큰 시크릿 등록
- [ ] `npm run cf:build`로 OpenNext 빌드 성공 확인

배포:

- [ ] `npm run cf:deploy`로 Cloudflare Workers에 배포

배포 후 확인:

- [ ] `curl https://<배포 도메인>/api/health` → `{"ok":true,"db":"connected"}` 확인
- [ ] `/`에서 공개 홈 대시보드가 정상 표시되는지 확인
- [ ] `/archive`에서 월별 아카이브 목록이 정상 표시되는지 확인
- [ ] `/viewer` 및 `/viewer?month=YYYY-MM`에서 월간 리포트가 정상 표시되는지 확인
- [ ] `/admin`에서 실제 백업 JSON을 선택하고, 서버 반영 토큰을 입력해 "서버 DB로 가져오기"를 실행 → 정상 토큰으로 성공, 잘못된 토큰/무토큰으로 거부되는지 확인
- [ ] import 후 `/`, `/archive`, `/viewer`에 반영된 데이터가 실제와 일치하는지 확인

## D1 스키마 적용 방법

스키마는 [schema.sql](schema.sql)에 정의되어 있으며, 기존 SQLite 테이블 구조(`members`, `activities`, `activity_participants`, `activity_conquest_types`, `import_logs`)를 그대로 이식했습니다.

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

## 활동 이미지 URL

Cloudflare R2 업로드를 도입하기 전 단계로, 관리 화면에서 외부 HTTPS 이미지 URL을
활동 기록에 저장할 수 있습니다.

- `imageUrl`이 있으면 기존 `imageDataUrl`보다 우선 표시합니다.
- URL은 `https://` 주소만 허용하며 공개 화면에는 주소 문자열을 출력하지 않습니다.
- 기존 파일 선택·붙여넣기 이미지는 `imageDataUrl`로 계속 호환됩니다.
- 이미지 로딩에 실패하면 공개 화면에서 깨진 이미지 영역을 숨깁니다.
- 기존 D1에는 배포 전에 `npm run db:image-url:remote`를 한 번 실행해야 합니다.
- 향후 R2 도입 시 업로드 결과의 공개 URL 또는 객체 키를 `imageUrl`에 연결할 예정입니다.

## 주의사항

- v2.0 기준 로그인, 세션/쿠키 인증, 권한 관리는 없습니다. `POST /api/import/json`만 단일 관리자 토큰으로 보호됩니다.
- 관리 화면의 LocalStorage 데이터와 D1 서버 DB는 자동 동기화되지 않습니다.
- 서버 DB로 반영하려면 `/admin`에서 JSON 백업 파일을 관리자 토큰과 함께 import해야 합니다.
- `imageUrl`은 D1에 저장하지만 `imageDataUrl`은 기존 정책대로 import 시 항상 `null`로 저장합니다. 이미지 직접 업로드와 R2 연동은 아직 구현되지 않았습니다.
- 공개 조회 화면(`/`, `/archive`, `/viewer`)은 D1 데이터를 기준으로 표시됩니다.
- 공개 화면에는 개인별 참여 랭킹이나 미참여자 목록을 노출하지 않습니다.
- Next.js 관련 코드를 수정할 때는 `node_modules/next/dist/docs/`의 현재 버전 문서를 먼저 확인합니다(`AGENTS.md` 참고).
