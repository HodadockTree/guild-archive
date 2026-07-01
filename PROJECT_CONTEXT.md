# PROJECT_CONTEXT

## 프로젝트 목적

이 프로젝트는 테일즈런너 길드 "냥춘"의 활동 기록을 보관하기 위한 개인용 웹앱입니다.

핵심 목적은 길드원 관리 시스템을 만드는 것이 아니라, 길드 활동 아카이브를 만드는 것입니다. 누가 언제 어떤 활동에 참여했는지 남기고, 나중에 길드원별 활동 이력을 다시 확인할 수 있게 하는 데 집중합니다.

v1.1의 성격은 과거 기록 복원과 실사용 입력 편의성 개선입니다.

## 중요한 개발 원칙

- 개인 실사용 흐름을 우선합니다.
- 서버, 로그인, 권한, 외부 연동은 현재 범위가 아닙니다.
- 데이터는 브라우저 LocalStorage에 저장합니다.
- 탈퇴 길드원은 삭제하지 않고 `left` 상태로 보존합니다.
- 과거 활동 기록의 참여자 이력이 깨지지 않도록 기존 `id`를 유지합니다.
- 구현되지 않은 기능을 문서나 UI에서 구현된 것처럼 표현하지 않습니다.
- 기능은 필요한 만큼만 작게 추가합니다.
- Next.js 관련 코드를 수정할 때는 `node_modules/next/dist/docs/`의 현재 버전 문서를 먼저 확인합니다.

## 현재 구현 상태

v1.1 기준 구현된 기능은 다음과 같습니다.

- 길드원 등록
- 길드원 정보 수정
- 길드원 탈퇴 처리
- 탈퇴 길드원 기록 보존
- 탈퇴 길드원 일괄 복구
- 스프레드시트 길드원 일괄 가져오기
- 일괄 가져오기 되돌리기
- 활동 기록 추가
- 활동 기록 수정
- 활동 기록 삭제
- 활동 기록 스크린샷 첨부
- 디스코드 이미지 Ctrl+V 첨부
- 활동 종류 선택
  - 비공정
  - 점령전
  - 길드퀘
  - 이벤트
  - 기타 메모
- 활동 제목 빠른 입력 버튼
- 활동 참여자 체크
- 참여자 목록 빈도순 정렬
- 전체 활동 기록 목록 보기
- 활동 종류별 필터
- 길드원별 활동 이력 보기
- 활동중/탈퇴 길드원 분리
- 길드원 관리 영역 접기/펼치기
- LocalStorage 저장

현재 구현은 단일 화면 중심입니다. 주요 화면 로직은 `app/page.tsx`에 있고, 저장 관련 함수는 `src/lib` 아래에 분리되어 있습니다.

## 데이터 구조 요약

### GuildMember

위치: `src/types.ts`

```ts
export type GuildMemberStatus = "active" | "left";

export interface GuildMember {
  id: string;
  nickname: string;
  status: GuildMemberStatus;
  joinedAt: string;
  leftAt: string | null;
  memo?: string;
}
```

- `status: "active"`는 현재 활동 중인 길드원입니다.
- `status: "left"`는 탈퇴 처리된 길드원입니다.
- 탈퇴 처리 시 `leftAt`에 날짜가 저장됩니다.
- 탈퇴 길드원도 LocalStorage에서 삭제하지 않습니다.
- 길드원 정보 수정 시 기존 `id`를 유지해야 과거 활동 기록 연결이 유지됩니다.

### ActivityLog

위치: `src/types.ts`

```ts
export type ActivityType =
  | "airship"
  | "siege"
  | "guildQuest"
  | "event"
  | "other";

export interface ActivityLog {
  id: string;
  type: ActivityType;
  date: string;
  title?: string;
  participantIds: string[];
  memo?: string;
  imageDataUrl?: string;
}
```

- `participantIds`에 참여 길드원의 `id`를 저장합니다.
- 길드원 닉네임은 활동 기록에 복사 저장하지 않고, 길드원 목록에서 `id`로 찾아 표시합니다.
- `title`과 `memo`는 선택 입력입니다.
- `imageDataUrl`은 활동 기록에 첨부된 스크린샷 이미지를 저장합니다.
- 이미지는 LocalStorage에 함께 저장되므로 용량이 커질 수 있습니다.

### LocalStorage 키

- `guild-archive:members`
- `guild-archive:activities`

참여 기록은 별도 테이블로 저장하지 않고, 각 `ActivityLog`의 `participantIds` 배열에 포함됩니다.

## 주요 파일 구조

```text
app/
  layout.tsx       # Next.js 루트 레이아웃
  page.tsx         # 메인 화면과 사용자 흐름
  globals.css      # 전역 스타일

src/
  types.ts         # GuildMember, ActivityLog 타입
  types/member.ts  # Member 타입 re-export
  lib/
    storage.ts     # LocalStorage 읽기/쓰기 유틸
    members.ts     # 길드원 조회, 등록, 수정, 탈퇴 처리
    activities.ts  # 활동 기록 조회, 추가, 수정, 삭제
```

## v1.1 작업 맥락

v1.1은 새 운영 구조를 크게 만드는 작업이 아니라, 이미 있는 과거 기록을 복원하고 실제 입력 속도를 높이는 데 초점을 둔 버전입니다.

스프레드시트 길드원 일괄 가져오기는 과거 명단을 빠르게 옮기기 위한 기능입니다. 최근 가져오기 되돌리기는 가져온 길드원이 아직 활동 기록에서 쓰이지 않은 경우를 중심으로 되돌릴 수 있게 합니다.

탈퇴 길드원 일괄 복구는 기존 길드원 `id`를 유지한 채 상태를 `active`로 되돌리는 기능입니다. 과거 활동 기록과의 연결을 보존하는 것이 중요합니다.

스크린샷 첨부와 디스코드 이미지 Ctrl+V 첨부는 활동 기록의 근거 이미지를 함께 남기기 위한 기능입니다. 이미지는 외부 서버에 업로드하지 않고 LocalStorage에 저장됩니다.

## 다음 구현 후보

- LocalStorage 데이터 내보내기/가져오기
- 활동 목록 검색
- 활동 기록 정렬 옵션
- 간단한 참여 횟수 요약
- 첨부 이미지 용량 관리 방식 개선

위 항목은 후보일 뿐이며 v1.1에 구현된 기능으로 문서화하지 않습니다.

## 장기 고려 사항

길드원이 일부 기록을 조회할 수 있는 읽기 전용 화면을 장기적으로 고려할 수 있습니다.

다만 이 기능은 서버 저장소, 공개 범위, 로그인, 권한 관리가 필요할 수 있으므로 v1.1 범위에는 포함하지 않습니다. 현재 프로젝트는 개인용 LocalStorage 기반 길드 활동 아카이브입니다.

## 주의할 점

- 현재 데이터는 브라우저 LocalStorage에만 있습니다.
- 브라우저 저장소 초기화, 다른 브라우저 사용, 시크릿 모드에서는 기록이 유지되지 않을 수 있습니다.
- 이미지도 LocalStorage에 저장되므로 많은 스크린샷을 첨부하면 저장 용량 제한에 걸릴 수 있습니다.
- 탈퇴 길드원을 삭제 기능으로 처리하면 과거 활동 이력이 깨질 수 있습니다.
- 길드원 일괄 복구는 새 길드원을 만드는 것이 아니라 기존 길드원의 상태를 되돌리는 흐름이어야 합니다.
- 활동 기록 수정 시 탈퇴 길드원이 기존 참여자였으면 선택 목록에 계속 보여야 합니다.
- `src/lib/activities.ts`는 과거 필드명 `participantMemberIds`를 `participantIds`로 읽어오는 호환 처리를 포함합니다.
