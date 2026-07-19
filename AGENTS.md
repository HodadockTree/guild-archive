<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 냥춘 길드 활동 아카이브 작업 지침

이 문서는 이후 Work/Codex 채팅에서 이 저장소를 일관되고 안전하게 개발하기 위한 기본 지침이다.

## 프로젝트 기본 정보

- Next.js 16, React 19, TypeScript 기반 프로젝트다.
- Cloudflare Workers와 D1을 사용한다.
- OpenNext 빌드는 webpack 기반으로 유지한다. 기본 빌드 명령은 `next build --webpack`을 실행하는 `npm run build`다.
- 주요 공개 및 관리 경로는 다음과 같다.
  - 공개 홈: `/`
  - 관리자 화면: `/admin`
  - 월별 아카이브: `/archive`
  - 월간 리포트: `/viewer?month=YYYY-MM`
- 기존 공개 URL과 D1 데이터 호환성을 중요한 요구사항으로 취급한다.

## 작업 원칙

- 작업을 시작하기 전에 `git status`와 요청에 관련된 파일을 확인한다.
- Next.js 관련 코드를 작성하거나 변경하기 전에 `node_modules/next/dist/docs/`의 관련 가이드를 확인하고, 현재 버전의 API와 규칙을 따른다.
- 사용자가 만든 기존 변경 사항을 임의로 되돌리거나 덮어쓰지 않는다.
- 요청 범위를 벗어난 리팩터링을 하지 않는다.
- 데이터 구조나 D1 스키마를 변경해야 한다면 구현 전에 영향 범위와 호환성 위험을 먼저 설명한다.
- 관리자 기능과 공개 열람 기능의 역할 및 접근 경계를 유지한다.
- UI 변경은 모바일 환경을 우선 확인한다.
- 기존 기능과 이미 공유된 공개 링크가 깨지지 않도록 주의한다.
- 사용자가 명시적으로 요청하지 않은 커밋, push, 배포를 하지 않는다.
- 사용자가 요청하지 않은 `README.md`와 `CHANGELOG.md`를 수정하지 않는다.
- 비밀 토큰이나 환경변수 값을 출력하거나 커밋하지 않는다.

## 검증 기준

변경 범위에 맞게 다음 검증을 수행한다.

1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm run build`
4. Cloudflare 관련 변경이면 `npm run cf:build`

실제 배포는 사용자가 명시적으로 요청한 경우에만 진행한다.

## 작업 완료 보고 형식

작업 완료 시 다음 순서로 보고한다.

1. 수정한 파일
2. 구현한 내용
3. 제외하거나 보류한 내용
4. 테스트 결과
5. 주의 사항
6. 추천 커밋 메시지
