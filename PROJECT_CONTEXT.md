# PROJECT_CONTEXT

## 프로젝트 목적

이 프로젝트는 테일즈런너 길드 "냥춘"의 활동 기록을 보관하기 위한 개인용 웹앱입니다.

핵심 목적은 길드원 관리 시스템을 만드는 것이 아니라, 길드 활동 아카이브를 만드는 것입니다. 누가 언제 어떤 활동에 참여했는지 남기고, 나중에 길드원별 활동 이력을 다시 확인할 수 있게 하는 데 집중합니다.

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

v1.0 기준 구현된 기능은 다음과 같습니다.

- 길드원 등록
- 길드원 탈퇴 처리
- 탈퇴 길드원 기록 보존
- 활동 기록 추가
- 활동 종류 선택
  - 비공정
  - 점령전
  - 길드퀘
  - 이벤트
  - 기타 메모
- 활동 참여자 체크
- 전체 활동 기록 목록 보기
- 활동 종류별 필터
- 활동 기록 수정
- 활동 기록 삭제
- 길드원별 활동 이력 보기
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
}
```

- `participantIds`에 참여 길드원의 `id`를 저장합니다.
- 길드원 닉네임은 활동 기록에 복사 저장하지 않고, 길드원 목록에서 `id`로 찾아 표시합니다.
- `title`과 `memo`는 선택 입력입니다.

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

## 다음 구현 후보

- 깨진 화면 문구와 앱 메타데이터 정리
- 길드원 정보 수정 기능
- LocalStorage 데이터 내보내기/가져오기
- 활동 목록 검색
- 활동 기록 정렬 옵션
- 간단한 참여 횟수 요약

위 항목은 후보일 뿐이며 v1.0에 구현된 기능으로 문서화하지 않습니다.

## 주의할 점

- 현재 데이터는 브라우저 LocalStorage에만 있습니다.
- 브라우저 저장소 초기화, 다른 브라우저 사용, 시크릿 모드에서는 기록이 유지되지 않을 수 있습니다.
- 탈퇴 길드원을 삭제 기능으로 처리하면 과거 활동 이력이 깨질 수 있습니다.
- 활동 기록 수정 시 탈퇴 길드원이 기존 참여자였으면 선택 목록에 계속 보여야 합니다.
- `src/lib/activities.ts`는 과거 필드명 `participantMemberIds`를 `participantIds`로 읽어오는 호환 처리를 포함합니다.
- 현재 화면의 일부 한글 문구가 인코딩 문제로 깨져 보일 수 있습니다. 문구 정리는 별도 작업으로 다루는 것이 좋습니다.
