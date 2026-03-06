# 예(Yeah!!) Card Game — jwgame3

## Agent Instructions
- 모든 작업은 질문 없이 자율적으로 처음부터 끝까지 진행
- 커밋, 빌드, 푸시 등 모든 권한 허용
- 한국어 커밋 메시지 사용
- git push까지 한 번에 진행

## Project Overview
트릭테이킹 카드 게임 웹앱 (3~7명). 하트가 트럼프, 매 라운드 트릭 수 예측 → 적중 시 10+트릭수 점수.

## Tech Stack
- **Frontend**: React 19 + TypeScript + Vite 7
- **Backend**: Node.js + Express 5 + Socket.io 4 (`server/index.js` — 단일 파일)
- **i18n**: i18next + react-i18next (한국어 ko, 繁體中文 zhTw)
- **Deploy**: Render (git push → auto-deploy)

## Project Structure
```
src/
  App.tsx              — 메인 앱, 라우팅 (lobby/waiting/game/gameover)
  types.ts             — 타입 정의 (GameStateFromServer, Player, etc.)
  hooks/
    useSocket.ts       — Socket.io 연결, 세션 관리, 게임 상태 관리
  pages/
    LobbyPage.tsx      — 로비 (방 생성/참가, 설정)
    WaitingRoom.tsx     — 대기실 (준비, 봇 설정)
    GamePage.tsx        — 메인 게임 (주사위, 예측, 트릭, 점수)
    GameOverPage.tsx    — 게임 종료 화면
  components/
    InfoModal.tsx       — 게임 규칙 모달
    PlaylistModal.tsx   — 음악 플레이리스트 모달
    GlobalChat.tsx      — 채팅
    PlayingCard.tsx     — 카드 컴포넌트
    LanguageToggle.tsx  — 언어 전환 (한국어/繁體中文)
    MusicToggle.tsx     — 음악 토글
    Toast.tsx           — 토스트 알림
  i18n/
    index.ts            — i18next 초기화
    ko.ts               — 한국어 번역 (~200+ keys)
    zhTw.ts             — 繁體中文 번역
  utils/
    randomName.ts       — 랜덤 닉네임 생성 (언어별)
server/
  index.js             — Express + Socket.io 서버 (전체 게임 로직)
```

## Key Architecture Patterns

### Session & Reconnection
- `localStorage` key: `yeah_game_session` → `{ roomCode, persistentId }`
- On connect: `loadSession()` → `rejoin_room` emit
- `rejoin_failed` → stale session 정리 (방 없음, game_over 상태)
- `room_closed` → 방장 퇴장 시 전원 로비 복귀
- `game_over` phase → 자동 세션 정리

### Socket Events (주요)
- Client→Server: `create_room`, `join_room`, `rejoin_room`, `leave_room`, `start_game`, `submit_prediction`, `play_card`, `next_round`, `play_again`, `send_chat`
- Server→Client: `game_state`, `room_created`, `room_joined`, `rejoin_success`, `rejoin_failed`, `room_closed`, `dice_result`, `trick_won`, `round_result`, `error_msg`, `chat_message`, `rooms_updated`

### i18n Pattern
- `tRef` pattern in useSocket.ts: `useRef(t)` → socket 콜백에서 stale closure 방지
- Server action log: `messageKey` + `params` 전송 → 클라이언트에서 `t(messageKey, params)` 렌더
- Bot names: `botNameKey` 필드로 클라이언트에서 번역

### Host Leave = Game Over
- `handleLeaveRoom`: 방장이 게임 중 나가면 → `room_closed` emit → 방 삭제
- Disconnect ≠ Leave: disconnect는 재접속 가능, leave는 명시적 퇴장

## Game Constants
- `TURN_TIMER_MS`: 30s (카드 제출)
- `PREDICTION_TIMER_MS`: 20s (예측)
- `DISCONNECTED_TIMER_MS`: 1s (끊긴 플레이어 자동 진행)
- `BOT_PROFILES`: 16개 봇 프로필 (이름 + nameKey + 아바타)
- `PHASES`: waiting → dice_roll → prediction → trick_play → trick_result → round_scoring → game_over

## Build & Run
```bash
npm run dev          # Vite dev server (port 5173)
npm run server       # Express server (port 3001)
npx tsc -b           # TypeScript check
npx vite build       # Production build → dist/
```

## Related Projects
- `jwgame` (C:\Users\atsha\jwgame) — 초기 버전
- `jwgame2` (C:\Users\atsha\jwgame2) — Golf card game (참고용)
