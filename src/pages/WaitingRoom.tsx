import { useTranslation } from 'react-i18next';
import type { useSocket } from '../hooks/useSocket';
import type { ToastItem } from '../components/Toast';
import { getAvatarSrc } from '../utils/characters';
import { playClick } from '../utils/sfx';
import './WaitingRoom.css';

type Sock = ReturnType<typeof useSocket>;
interface Props {
  sock: Sock;
  addToast: (msg: string, type?: ToastItem['type']) => void;
}

export default function WaitingRoom({ sock, addToast }: Props) {
  const { t } = useTranslation();
  const gs = sock.gameState;
  if (!gs) return null;

  const me = gs.players.find((p) => p.id === gs.myId);
  const isHost = me?.isHost ?? false;
  const playerCount = gs.players.length;
  const humanCount = gs.players.filter((p) => !p.isBot).length;

  function handleStart() {
    playClick();
    if (playerCount < 3) {
      addToast(t('waiting.minPlayers'), 'alert');
      return;
    }
    sock.startGame();
  }

  return (
    <div className="waiting-page">
      <div className="waiting-header">
        <h2>{t('waiting.title')}</h2>
        <div className="room-code-badge glass">
          {t('waiting.roomCode')} <strong>{gs.roomCode}</strong>
        </div>
      </div>

      <div className="players-list">
        {gs.players.map((p) => (
          <div key={p.id} className={`player-card glass ${p.id === gs.myId ? 'player-me' : ''}`}>
            <img className="chr-avatar player-chr" src={getAvatarSrc(p.avatarIndex)} alt="" />
            <div className="player-info-text">
              <span className="player-name">
                <span className="player-nick">{p.botNameKey ? t(p.botNameKey) : p.nickname}</span>
                {p.isHost && <span className="host-badge">{t('waiting.host')}</span>}
                {p.isBot && <span className="bot-badge">{t('waiting.botBadge')}</span>}
                {p.id === gs.myId && <span className="me-badge">{t('common.me')}</span>}
              </span>
            </div>
            <span className={`ready-status ${p.ready || p.isHost ? 'ready' : ''}`}>
              {p.isBot ? '✓' : p.isHost ? '✓' : p.ready ? t('waiting.readyDone') : t('waiting.readyWaiting')}
            </span>
          </div>
        ))}
      </div>

      <div className="waiting-info text-muted">
        {t('waiting.playerInfo', { count: playerCount, humans: humanCount, bots: playerCount - humanCount })}
      </div>

      <div className="waiting-actions">
        {isHost ? (
          <>
            <div className="host-options">
              <label>{t('waiting.addBots')}</label>
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
              {t('waiting.startGame')}
            </button>
          </>
        ) : (
          <button
            className={`btn ${me?.ready ? 'btn-outline' : 'btn-primary'} btn-large`}
            onClick={() => { sock.toggleReady(); playClick(); }}
          >
            {me?.ready ? t('waiting.cancelReady') : t('waiting.ready')}
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => { sock.leaveRoom(); playClick(); }}>
          {t('common.leave')}
        </button>
      </div>
    </div>
  );
}
