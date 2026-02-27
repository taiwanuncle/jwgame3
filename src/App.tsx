import { useEffect, useState, useCallback, useRef } from 'react';
import { useSocket } from './hooks/useSocket';
import { audioManager } from './utils/audioManager';
import LobbyPage from './pages/LobbyPage';
import WaitingRoom from './pages/WaitingRoom';
import GamePage from './pages/GamePage';
import GameOverPage from './pages/GameOverPage';
import ToastContainer, { type ToastItem } from './components/Toast';
import MusicToggle from './components/MusicToggle';
import InfoModal from './components/InfoModal';
import GlobalChat from './components/GlobalChat';
import './App.css';

let toastId = 0;

export default function App() {
  const sock = useSocket();
  const { gameState, errorMsg } = sock;
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const prevPhaseRef = useRef<string | null>(null);

  const addToast = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    setToasts((prev) => [...prev.slice(-4), { id: ++toastId, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Error toasts
  useEffect(() => {
    if (errorMsg) addToast(errorMsg, 'alert');
  }, [errorMsg, addToast]);

  // BGM category switching
  useEffect(() => {
    const phase = gameState?.phase;
    if (!phase || phase === 'waiting') {
      audioManager.playCategory('opening');
    } else if (phase === 'game_over' || phase === 'round_scoring') {
      audioManager.playCategory('celebration');
    } else {
      audioManager.playCategory('playing');
    }
  }, [gameState?.phase]);

  // Phase transition toasts
  useEffect(() => {
    const phase = gameState?.phase;
    if (!phase) return;
    if (phase === prevPhaseRef.current) return;
    prevPhaseRef.current = phase;

    switch (phase) {
      case 'dice_roll':
        addToast('주사위를 굴려 선 플레이어를 정합니다!');
        break;
      case 'prediction':
        addToast(`라운드 ${gameState.currentRound} — 트릭 승리 횟수를 예측하세요!`);
        break;
      case 'trick_play':
        if (gameState.currentTrickNumber === 1) {
          addToast(`트릭 플레이 시작!`);
        }
        break;
      case 'round_scoring':
        addToast(`라운드 ${gameState.currentRound} 결과 발표!`, 'success');
        break;
      case 'game_over':
        addToast('게임 종료!', 'success');
        break;
    }
  }, [gameState?.phase, gameState?.currentRound, gameState?.currentTrickNumber, addToast]);

  // Show chat only when in a room
  const inRoom = !!gameState?.roomCode;

  // Render based on phase
  let page;
  if (!gameState || !gameState.roomCode) {
    page = <LobbyPage sock={sock} addToast={addToast} />;
  } else if (gameState.phase === 'waiting') {
    page = <WaitingRoom sock={sock} addToast={addToast} />;
  } else if (gameState.phase === 'game_over') {
    page = <GameOverPage sock={sock} />;
  } else {
    page = <GamePage sock={sock} addToast={addToast} />;
  }

  return (
    <>
      {page}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Global controls */}
      <div className="global-controls">
        <MusicToggle />
        <button
          className="btn btn-ghost info-toggle-btn"
          onClick={() => setShowInfo(true)}
          title="게임 규칙"
        >
          ℹ️
        </button>
      </div>

      {inRoom && <GlobalChat sock={sock} />}
      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
    </>
  );
}
