# PROJECT_CONTEXT

## 현재 버전

v1.2

## 프로젝트 목적

이 프로젝트는 테일즈런너 길드 "냥춘"의 활동 기록을 보관하기 위한 개인용 웹앱입니다.

길드원 관리 시스템을 만드는 것이 아니라, 길드 활동 아카이브를 만드는 것이 핵심입니다. 누가 언제 어떤 활동에 참여했는지 남기고, 나중에 길드원별 활동 이력과 요약 통계를 확인할 수 있게 하는 데 집중합니다.

v1.2의 핵심은 활동 기록 시스템 개선과 기존 데이터 정리 안정화입니다.

## 중요한 개발 원칙

- 개인 실사용 흐름을 우선합니다.
- 서버 저장, 로그인, 권한 관리는 현재 구현되어 있지 않습니다.
- 데이터는 브라우저 LocalStorage에 저장합니다.
- 탈퇴 길드원은 삭제하지 않고 `left` 상태로 보존합니다.
- 과거 활동 기록의 참여자 이력이 깨지지 않도록 기존 `id`를 유지합니다.
- 구현되지 않은 기능을 문서나 UI에서 구현된 것처럼 표현하지 않습니다.
- 기능은 필요한 만큼만 작게 추가합니다.
- Next.js 관련 코드를 수정할 때는 `node_modules/next/dist/docs/`의 현재 버전 문서를 먼저 확인합니다.

## 현재 구현 상태

v1.2 기준 구현된 기능은 다음과 같습니다.

- 길드원 등록, 정보 수정, 탈퇴 처리
- 활동중/탈퇴 길드원 분리 보기
- 탈퇴 길드원 기록 보존
- 탈퇴 길드원 일괄 복구
- 스프레드시트 길드원 일괄 가져오기
- 가져오기 시 기존 닉네임 중복 업데이트
- 가져오기 시 탈퇴일 기반 탈퇴 상태 반영
- 가져오기 결과 요약과 실패 상세 표시
- 최근 일괄 가져오기 되돌리기
- 길드원 메모 일괄 삭제
- 활동 기록 추가, 수정, 삭제
- 활동 기록 스크린샷 첨부
- 디스코드 이미지 Ctrl+V 첨부
- 활동 종류 선택: 점령전, 비공정, 기타
- 비공정 세부 종류 선택: 오션헤븐, 아우로라
- 활동 제목 빠른 입력 버튼
- 활동 참여자 검색 및 체크
- 참여자 목록에서 선택한 활동 종류 기준 참여 횟수 표시
- 전체 활동 기록 목록 보기
- 활동 종류별 필터
- 길드원별 활동 이력 보기
- 길드원 카드 내부에서 활동 요약 통계와 최근 활동 5개 확인
- 데이터 관리 도구 영역 접기/펼치기
- LocalStorage 저장

현재 구현은 단일 화면 중심입니다. 주요 화면 로직은 `app/page.tsx`에 있고, 저장 및 계산 관련 함수는 `src/lib` 아래에 분리되어 있습니다.

## 핵심 데이터 구조

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
- 길드원 정보 수정이나 스프레드시트 가져오기 업데이트 시 기존 `id`를 유지해야 과거 활동 기록 연결이 유지됩니다.
- 메모 일괄 삭제는 `memo`만 비우고 `id`, `status`, `joinedAt`, `leftAt`은 보존해야 합니다.

### ActivityLog

위치: `src/types.ts`

```ts
export type ActivityType =
  | "airship"
  | "siege"
  | "guildQuest"
  | "event"
  | "other";

export type AirshipType = "ocean" | "aurora";

export interface ActivityLog {
  id: string;
  type: ActivityType;
  airshipType?: AirshipType;
  date: string;
  title?: string;
  participantIds: string[];
  memo?: string;
  imageDataUrl?: string;
}
```

- `participantIds`에 참여 길드원의 `id`를 저장합니다.
- 길드원 닉네임은 활동 기록에 복사 저장하지 않고, 길드원 목록에서 `id`로 찾아 표시합니다.
- `type`은 기존 데이터 호환 때문에 `guildQuest`, `event`를 유지합니다.
- 신규 입력과 주요 화면 표현은 `siege`, `airship`, `other` 중심입니다.
- `guildQuest`, `event`는 표시와 통계에서 `other`로 취급합니다.
- `airshipType`은 비공정 세부 종류입니다. `ocean`은 오션헤븐, `aurora`는 아우로라입니다.
- `imageDataUrl`은 활동 기록에 첨부된 이미지를 저장합니다.
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
  types.ts              # GuildMember, ActivityLog, ActivityType, AirshipType 타입
  types/member.ts       # Member 타입 re-export
  lib/
    storage.ts          # LocalStorage 읽기/쓰기 유틸
    members.ts          # 길드원 조회, 등록, 수정, 탈퇴 처리
    activities.ts       # 활동 기록 조회, 추가, 수정, 삭제
    activityStats.ts    # 길드원별 활동 요약 통계와 최근 활동 계산
```

## v1.2 작업 맥락

v1.2는 활동 기록 시스템 개선과 기존 데이터 정리 안정화에 초점을 둔 버전입니다.

스프레드시트 가져오기는 닉네임 중복 시 새 길드원을 만들지 않고 기존 길드원을 업데이트합니다. 탈퇴일이 있는 행은 탈퇴 상태로 처리하며, 결과 요약은 추가, 업데이트, 탈퇴 처리, 실패를 구분해서 보여줍니다.

길드원 메모 일괄 삭제는 데이터 정리 도구입니다. 활동중, 탈퇴, 전체 범위를 선택할 수 있고, 실행 전 확인을 거치며, 메모 외 데이터는 보존합니다.

활동 종류는 새 입력 기준으로 점령전, 비공정, 기타 중심입니다. 기존 길퀘와 이벤트 데이터는 삭제하지 않고 호환용 타입으로 유지하지만, 표시와 통계에서는 기타로 묶습니다.

`src/lib/activityStats.ts`는 길드원별 활동 요약 통계와 최근 활동 계산을 담당합니다. 총 참여, 점령전, 비공정, 기타, 오션헤븐, 아우로라 횟수를 계산하고, 최근 활동 목록을 날짜 기준으로 정렬해 제공합니다.

## 다음 구현 후보

아래 항목은 아직 구현 완료가 아니라 다음 버전에서 검토할 후보입니다.

- LocalStorage 데이터 백업/복원
- 첨부 이미지 용량 관리 방식 개선
- 활동 기록 검색
- 활동 기록 정렬 옵션
- 읽기 전용 조회 화면 검토

읽기 전용 조회 화면은 길드원이 일부 기록을 볼 수 있게 하는 방향으로 고려할 수 있지만, 서버 저장소, 공개 범위, 로그인, 권한 관리가 필요할 수 있으므로 현재 v1.2 범위에는 포함하지 않습니다.

## 주의할 점

- 현재 데이터는 브라우저 LocalStorage에만 있습니다.
- 서버 저장, 로그인, 권한 관리는 아직 없습니다.
- 브라우저 저장소 초기화, 다른 브라우저 사용, 시크릿 모드에서는 기록이 유지되지 않을 수 있습니다.
- 이미지도 LocalStorage에 저장되므로 많은 스크린샷을 첨부하면 저장 용량 제한에 걸릴 수 있습니다.
- 탈퇴 길드원을 삭제하면 과거 활동 이력이 깨질 수 있습니다.
- 스프레드시트 가져오기에서 닉네임이 중복되면 새로 만들지 말고 기존 길드원을 업데이트하는 흐름을 유지해야 합니다.
- 길드원 메모 일괄 삭제는 메모만 삭제하고 활동 이력, 상태, 가입일, 탈퇴일은 보존해야 합니다.
- 탈퇴 길드원이 포함된 기존 활동 수정 시 선택 상태가 유지되어야 합니다.
- `guildQuest`, `event`는 기존 데이터 호환을 위해 타입에 남아 있으며 표시와 통계에서는 기타로 취급합니다.
- `src/lib/activities.ts`는 과거 필드명 `participantMemberIds`를 `participantIds`로 읽어오는 호환 처리를 포함합니다.
