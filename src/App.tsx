import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
import './i18n';
import './App.css';

let toastId = 0;

export default function App() {
  const { t } = useTranslation();
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
        addToast(t('toast.diceRoll'));
        break;
      case 'prediction':
        addToast(t('toast.roundStart', { round: gameState.currentRound }));
        break;
      case 'trick_play':
        if (gameState.currentTrickNumber === 1) {
          addToast(t('toast.trickStart'));
        }
        break;
      case 'round_scoring':
        addToast(t('toast.roundResult', { round: gameState.currentRound }), 'success');
        break;
      case 'game_over':
        addToast(t('toast.gameOver'), 'success');
        break;
    }
  }, [gameState?.phase, gameState?.currentRound, gameState?.currentTrickNumber, addToast]);

  // Show chat only when in a room
  const inRoom = !!gameState?.roomCode;

  // Hide floating controls during active game (GamePage has its own header controls)
  const activeGame = gameState?.phase && !['waiting', 'game_over'].includes(gameState.phase);

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

      {/* Floating global controls — hidden during active game (GamePage has own header buttons) */}
      {!activeGame && (
        <div className="global-controls">
          <MusicToggle />
          <button
            className="btn btn-ghost info-toggle-btn"
            onClick={() => setShowInfo(true)}
            title={t('common.gameRules')}
          >
            ℹ️
          </button>
        </div>
      )}

      {inRoom && <GlobalChat sock={sock} />}
      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
    </>
  );
}
