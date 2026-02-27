import type { useSocket } from '../hooks/useSocket';
import type { ToastItem } from '../components/Toast';
import { playClick } from '../utils/sfx';
import './WaitingRoom.css';

const AVATARS = ['🃏', '♠', '♥', '♦', '♣', '🎴', '👑', '🎯', '🌟', '🔥', '🎲', '🏆'];

type Sock = ReturnType<typeof useSocket>;
interface Props {
  sock: Sock;
  addToast: (msg: string, type?: ToastItem['type']) => void;
}

export default function WaitingRoom({ sock, addToast }: Props) {
  const gs = sock.gameState;
  if (!gs) return null;

  const me = gs.players.find((p) => p.id === gs.myId);
  const isHost = me?.isHost ?? false;
  const playerCount = gs.players.length;
  const humanCount = gs.players.filter((p) => !p.isBot).length;

  function handleStart() {
    playClick();
    if (playerCount < 3) {
      addToast('최소 3명(봇 포함)이 필요합니다.', 'alert');
      return;
    }
    sock.startGame();
  }

  return (
    <div className="waiting-page">
      <div className="waiting-header">
        <h2>대기실</h2>
        <div className="room-code-badge glass">
          방 코드: <strong>{gs.roomCode}</strong>
        </div>
      </div>

      <div className="players-list">
        {gs.players.map((p) => (
          <div key={p.id} className={`player-card glass ${p.id === gs.myId ? 'player-me' : ''}`}>
            <span className="player-avatar">{AVATARS[p.avatarIndex] || '🃏'}</span>
            <div className="player-info-text">
              <span className="player-name">
                {p.nickname}
                {p.isHost && <span className="host-badge">방장</span>}
                {p.isBot && <span className="bot-badge">BOT</span>}
              </span>
            </div>
            <span className={`ready-status ${p.ready || p.isHost ? 'ready' : ''}`}>
              {p.isBot ? '✓' : p.isHost ? '✓' : p.ready ? '준비완료' : '대기중'}
            </span>
          </div>
        ))}
      </div>

      <div className="waiting-info text-muted">
        {playerCount}/7명 ({humanCount}명 + 봇 {playerCount - humanCount}명)
      </div>

      <div className="waiting-actions">
        {isHost ? (
          <>
            <div className="host-options">
              <label>봇 추가</label>
              <div className="toggle-group bot-count-group">
                {[0, 1, 2, 3, 4, 5, 6].filter((n) => humanCount + n >= 3 && humanCount + n <= 7).map((n) => (
                  <button
                    key={n}
                    className={`toggle-btn ${(gs.roomOptions.botCount || 0) === n ? 'active' : ''}`}
                    onClick={() => { sock.setRoomOptions({ botCount: n }); playClick(); }}
                  >{n}</button>
                ))}
              </div>
            </div>
            <button className="btn btn-primary btn-large" onClick={handleStart}>
              게임 시작
            </button>
          </>
        ) : (
          <button
            className={`btn ${me?.ready ? 'btn-outline' : 'btn-primary'} btn-large`}
            onClick={() => { sock.toggleReady(); playClick(); }}
          >
            {me?.ready ? '준비 취소' : '준비 완료'}
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => { sock.leaveRoom(); playClick(); }}>
          나가기
        </button>
      </div>
    </div>
  );
}
