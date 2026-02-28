import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { useSocket } from '../hooks/useSocket';
import type { ToastItem } from '../components/Toast';
import type { Card } from '../types';
import PlayingCard from '../components/PlayingCard';
import MusicToggle from '../components/MusicToggle';
import InfoModal from '../components/InfoModal';
import { getAvatarSrc } from '../utils/characters';
import { playCardPlay, playMyTurn, playDiceRoll, playDiceReveal, playDiceTie, playDiceWinner, playPredictionReveal, playTrickWon, playRoundEnd } from '../utils/sfx';
import './GamePage.css';

const SUIT_SYMBOLS: Record<string, string> = {
  spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣',
};

// Helper to get translated display name for bot players
function displayName(p: { nickname: string; botNameKey?: string }, t: (key: string) => string): string {
  return p.botNameKey ? t(p.botNameKey) : p.nickname;
}

type Sock = ReturnType<typeof useSocket>;
interface Props {
  sock: Sock;
  addToast: (msg: string, type?: ToastItem['type']) => void;
}

export default function GamePage({ sock, addToast }: Props) {
  const gs = sock.gameState;
  if (!gs) return null;

  const { phase } = gs;

  return (
    <div className="game-page">
      <GameHeader gs={gs} sock={sock} />

      {phase === 'dice_roll' && <DiceOverlay sock={sock} />}
      {phase === 'prediction' && <PredictionOverlay gs={gs} sock={sock} addToast={addToast} />}
      {(phase === 'trick_play' || phase === 'trick_result') && <TrickView gs={gs} sock={sock} addToast={addToast} />}
      {phase === 'round_scoring' && <RoundScoring gs={gs} sock={sock} />}
    </div>
  );
}

// ===================== HEADER =====================
function GameHeader({ gs, sock }: { gs: NonNullable<Sock['gameState']>; sock: Sock }) {
  const { t } = useTranslation();
  const [showLog, setShowLog] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="game-header">
      <div className="header-left">
        <button className="btn btn-ghost btn-sm" onClick={() => setShowLog(!showLog)}>
          {showLog ? `✕ ${t('common.close')}` : t('game.log')}
        </button>
        <span className="round-info">
          {t('game.roundInfo', { current: gs.currentRound, total: gs.totalRounds, cards: gs.cardsThisRound })}
        </span>
      </div>
      <div className="header-center">
        <span className="trump-badge">{t('game.trump')}</span>
      </div>
      <div className="header-right">
        <MusicToggle />
        <button className="btn btn-ghost btn-sm" onClick={() => setShowInfo(true)} title={t('common.gameRules')}>ℹ️</button>
        <button className="btn btn-ghost btn-sm" onClick={() => sock.leaveRoom()}>{t('common.leave')}</button>
      </div>

      {showLog && (
        <div className="log-panel glass">
          <div className="log-list">
            {gs.actionLog.slice().reverse().map((entry, i) => (
              <div key={i} className="log-entry">{entry.messageKey ? t(entry.messageKey, entry.params || {}) : entry.message}</div>
            ))}
          </div>
        </div>
      )}
      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
    </div>
  );
}

// ===================== DICE FACE (CSS dots) =====================
const DICE_DOTS: Record<number, number[]> = {
  1: [5],
  2: [3, 7],
  3: [3, 5, 7],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

function DiceFace({ value, rolling }: { value: number; rolling?: boolean }) {
  const dots = DICE_DOTS[value] || [];
  return (
    <div className={`dice-face ${rolling ? 'dice-face-rolling' : ''}`}>
      {[1,2,3,4,5,6,7,8,9].map(pos => (
        <div key={pos} className={`dice-dot-cell ${dots.includes(pos) ? 'dice-dot-active' : ''}`}>
          {dots.includes(pos) && <div className="dice-dot" />}
        </div>
      ))}
    </div>
  );
}

// ===================== DICE OVERLAY =====================
type DicePhase = 'waiting' | 'rolling' | 'reveal' | 'tie' | 'winner';

function DiceOverlay({ sock }: { sock: Sock }) {
  const { t } = useTranslation();
  const dr = sock.diceResult;
  const [roundIdx, setRoundIdx] = useState(0);
  const [phase, setPhase] = useState<DicePhase>('waiting');
  const [rollingFaces, setRollingFaces] = useState<Record<string, number>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Start animation sequence when dice_result arrives
  useEffect(() => {
    if (!dr || startedRef.current) return;
    startedRef.current = true;
    setRoundIdx(0);
    setPhase('rolling');
    playDiceRoll();
    startRollingAnimation(dr.rounds[0].rolls.map(r => r.playerId));
  }, [dr]);

  function startRollingAnimation(playerIds: string[]) {
    // Rapidly cycle random faces for rolling players
    if (intervalRef.current) clearInterval(intervalRef.current);
    const iv = setInterval(() => {
      const faces: Record<string, number> = {};
      for (const pid of playerIds) {
        faces[pid] = Math.floor(Math.random() * 6) + 1;
      }
      setRollingFaces(prev => ({ ...prev, ...faces }));
    }, 100);
    intervalRef.current = iv;

    // After 2 seconds, reveal results
    timerRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setPhase('reveal');
      playDiceReveal();

      // After 1.8 seconds, check for tie or winner
      timerRef.current = setTimeout(() => {
        advanceRound();
      }, 1800);
    }, 2000);
  }

  function advanceRound() {
    if (!dr) return;
    if (roundIdx + 1 < dr.rounds.length) {
      // There's a tie — show tie message, then start next round
      setPhase('tie');
      playDiceTie();
      timerRef.current = setTimeout(() => {
        const nextIdx = roundIdx + 1;
        setRoundIdx(nextIdx);
        setPhase('rolling');
        playDiceRoll();
        startRollingAnimation(dr.rounds[nextIdx].rolls.map(r => r.playerId));
      }, 1200);
    } else {
      // Final winner!
      setPhase('winner');
      playDiceWinner();
    }
  }

  // Get all players from round 0 (all players)
  const allPlayers = dr?.rounds[0]?.rolls || [];
  const currentRound = dr?.rounds[roundIdx];

  // Determine which players are still in the game at current round
  const activePlayerIds = currentRound?.rolls.map(r => r.playerId) || [];

  // For reveal phase, find the max roll to highlight
  const maxRollInRound = currentRound
    ? Math.max(...currentRound.rolls.map(r => r.roll))
    : 0;

  // Waiting for server
  if (!dr) return (
    <div className="overlay-panel">
      <div className="dice-container glass">
        <h2>{t('game.diceRolling')}</h2>
        <div className="dice-spinner">🎲</div>
      </div>
    </div>
  );

  return (
    <div className="overlay-panel">
      <div className="dice-container glass">
        {phase === 'rolling' && (
          <h2 className="dice-title">
            {roundIdx === 0 ? t('game.diceRolling') : t('game.diceReRolling')}
          </h2>
        )}
        {phase === 'reveal' && <h2 className="dice-title">{t('game.diceResult')}</h2>}
        {phase === 'tie' && <h2 className="dice-title dice-title-tie">{t('game.diceTie')}</h2>}
        {phase === 'winner' && (
          <h2 className="dice-title dice-title-winner">
            {t('game.diceWinner', { name: dr.winnerName })}
          </h2>
        )}

        <div className="dice-results">
          {allPlayers.map((player) => {
            const isActive = activePlayerIds.includes(player.playerId);
            const isWinner = phase === 'winner' && player.playerId === dr.winnerId;
            const roundRoll = currentRound?.rolls.find(r => r.playerId === player.playerId);
            const isMaxInRound = roundRoll && roundRoll.roll === maxRollInRound && (phase === 'reveal' || phase === 'tie');
            const isEliminated = !isActive && roundIdx > 0;

            // Determine dice value to display
            let displayValue = 1;
            if (phase === 'rolling' && isActive) {
              displayValue = rollingFaces[player.playerId] || 1;
            } else if ((phase === 'reveal' || phase === 'tie' || phase === 'winner') && roundRoll) {
              displayValue = roundRoll.roll;
            } else if (isEliminated) {
              // Show their last known roll from the round they were eliminated
              for (let i = Math.min(roundIdx - 1, dr.rounds.length - 1); i >= 0; i--) {
                const prevRoll = dr.rounds[i].rolls.find(r => r.playerId === player.playerId);
                if (prevRoll) { displayValue = prevRoll.roll; break; }
              }
            }

            return (
              <div
                key={player.playerId}
                className={[
                  'dice-player',
                  isWinner ? 'dice-winner' : '',
                  isMaxInRound && !isWinner ? 'dice-max' : '',
                  isEliminated ? 'dice-eliminated' : '',
                  phase === 'rolling' && isActive ? 'dice-active-rolling' : '',
                ].filter(Boolean).join(' ')}
              >
                <img
                  className="dice-player-avatar"
                  src={getAvatarSrc(player.avatarIndex)}
                  alt=""
                />
                <span className="dice-name">{player.playerName}</span>
                <DiceFace
                  value={displayValue}
                  rolling={phase === 'rolling' && isActive}
                />
                {(phase !== 'rolling' || !isActive) && (
                  <span className="dice-value-num">{displayValue}</span>
                )}
              </div>
            );
          })}
        </div>

        {phase === 'tie' && (
          <p className="dice-tie-msg">{t('game.diceTieMsg')}</p>
        )}
      </div>
    </div>
  );
}

// ===================== PREDICTION =====================
function PredictionOverlay({ gs, sock, addToast }: { gs: NonNullable<Sock['gameState']>; sock: Sock; addToast: Props['addToast'] }) {
  const { t } = useTranslation();
  const [pred, setPred] = useState(0);
  const me = gs.players.find((p) => p.id === gs.myId);
  const submitted = me?.predictionSubmitted ?? false;
  const revealed = gs.players.every((p) => p.predictionSubmitted && p.prediction !== null);
  const myHand = me?.hand || [];
  const playedRef = useRef(false);

  useEffect(() => {
    if (revealed && !playedRef.current) {
      playedRef.current = true;
      playPredictionReveal();
    }
  }, [revealed]);

  function handleSubmit() {
    if (submitted) return;
    sock.submitPrediction(pred);
    addToast(t('game.predSubmitToast', { count: pred }), 'info');
  }

  const timeLeft = gs.timerEnd ? Math.max(0, Math.ceil((gs.timerEnd - Date.now()) / 1000)) : null;

  // Leader & order info
  const roundLeaderId = gs.roundLeadPlayerId;
  const meIsLeader = roundLeaderId === gs.myId;
  const leaderIdx = gs.players.findIndex(p => p.id === roundLeaderId);
  const myIdx = gs.players.findIndex(p => p.id === gs.myId);
  const playerCount = gs.players.length;
  const myOrder = leaderIdx >= 0 && myIdx >= 0
    ? ((myIdx - leaderIdx + playerCount) % playerCount) + 1
    : null;
  const leaderPlayer = gs.players.find(p => p.id === roundLeaderId);
  const leaderName = leaderPlayer ? displayName(leaderPlayer, t) : '';

  return (
    <div className="prediction-panel">
      <div className="my-hand-display">
        <div className="hand-header">
          <label>{t('game.myHand')}</label>
          <span className="order-info">
            {meIsLeader
              ? t('game.iAmLeader')
              : t('game.leaderInfo', { leader: leaderName, order: myOrder })}
          </span>
        </div>
        <div className="hand-cards hand-cards-lg">
          {myHand.map((card) => (
            <PlayingCard key={card.id} card={card} size="lg" />
          ))}
        </div>
      </div>

      {!submitted ? (
        <div className="prediction-selector glass">
          <h3>{t('game.howManyWins')}</h3>
          <div className="pred-numbers">
            {Array.from({ length: gs.cardsThisRound + 1 }, (_, i) => (
              <button
                key={i}
                className={`pred-btn ${pred === i ? 'pred-selected' : ''}`}
                onClick={() => setPred(i)}
              >{i}</button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={handleSubmit}>
            {t('game.predictBtn', { count: pred })}
          </button>
          {timeLeft !== null && timeLeft > 0 && (
            <div className="timer-bar">
              <div className="timer-fill" style={{ width: `${(timeLeft / 20) * 100}%` }} />
              <span className="timer-text">{t('game.seconds', { n: timeLeft })}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="prediction-waiting glass">
          {revealed ? (
            <>
              <h3>{t('game.predRevealed')}</h3>
              <div className="pred-reveals">
                {gs.players.map((p) => (
                  <div key={p.id} className="pred-reveal-item">
                    <span>{displayName(p, t)}</span>
                    <span className="pred-reveal-num">{p.prediction}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <h3>{t('game.waitingPlayers')}</h3>
          )}
          <div className="submitted-badges">
            {gs.players.map((p) => (
              <span key={p.id} className={`sub-badge ${p.predictionSubmitted ? 'sub-done' : ''}`}>
                {displayName(p, t)} {p.predictionSubmitted ? '✓' : '...'}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== TRICK VIEW =====================
function TrickView({ gs, sock, addToast }: { gs: NonNullable<Sock['gameState']>; sock: Sock; addToast: Props['addToast'] }) {
  const { t } = useTranslation();
  const me = gs.players.find((p) => p.id === gs.myId);
  const myHand = me?.hand || [];
  const isMyTurn = gs.currentTurnPlayerId === gs.myId && gs.phase === 'trick_play';
  const prevTurnRef = useRef<string | null>(null);

  const validCardIds = new Set<string>();
  if (isMyTurn && myHand.length > 0) {
    const leadSuit = gs.trickLeadSuit;
    if (!leadSuit) {
      myHand.forEach((c) => validCardIds.add(c.id));
    } else {
      const suitCards = myHand.filter((c) => c.suit === leadSuit);
      if (suitCards.length > 0) {
        suitCards.forEach((c) => validCardIds.add(c.id));
      } else {
        myHand.forEach((c) => validCardIds.add(c.id));
      }
    }
  }

  useEffect(() => {
    if (isMyTurn && prevTurnRef.current !== gs.myId) {
      playMyTurn();
    }
    prevTurnRef.current = isMyTurn ? gs.myId : null;
  }, [isMyTurn, gs.myId]);

  function handlePlayCard(card: Card) {
    if (!isMyTurn) return;
    if (!validCardIds.has(card.id)) {
      addToast(t('game.invalidCard'), 'alert');
      return;
    }
    playCardPlay();
    sock.playCard(card.id);
  }

  const timeLeft = gs.timerEnd ? Math.max(0, Math.ceil((gs.timerEnd - Date.now()) / 1000)) : null;
  const isTrickResult = gs.phase === 'trick_result';
  const trickWinner = sock.trickResult;

  const trickSfxRef = useRef(0);
  useEffect(() => {
    if (isTrickResult && trickWinner && trickWinner.trickNumber !== trickSfxRef.current) {
      trickSfxRef.current = trickWinner.trickNumber;
      playTrickWon();
    }
  }, [isTrickResult, trickWinner]);

  return (
    <div className="trick-view">
      {/* Opponents */}
      <div className="opponents-row">
        {gs.players.filter((p) => p.id !== gs.myId).map((p) => {
          const isActive = gs.currentTurnPlayerId === p.id;
          const isLeader = gs.roundLeadPlayerId === p.id;
          return (
            <div key={p.id} className={`opponent-card ${isActive ? 'opponent-active' : ''} ${!p.connected ? 'opponent-dc' : ''}`}>
              {isLeader && <span className="leader-badge">{t('game.leader')}</span>}
              <img className="chr-avatar opp-chr" src={getAvatarSrc(p.avatarIndex)} alt="" />
              <span className="opp-name">{displayName(p, t)}</span>
              <div className="opp-stats">
                <span className="opp-pred">{p.prediction !== null && p.prediction !== undefined ? t('game.prediction', { value: p.prediction }) : t('game.predUnknown')}</span>
                <span className="opp-wins">{t('game.wins', { value: p.tricksWon })}</span>
              </div>
              {!p.connected && <span className="dc-badge">{t('game.disconnected')}</span>}
            </div>
          );
        })}
      </div>

      {/* Trick table — cards are md size now (bigger) */}
      <div className="trick-table glass">
        <div className="trick-info">
          <span>{t('game.trickInfo', { current: gs.currentTrickNumber, total: gs.totalTricksThisRound })}</span>
          {gs.trickLeadSuit && (
            <span className="lead-suit">
              {gs.trickLeadSuit === 'hearts'
                ? t('game.leadSuitTrump', { suit: SUIT_SYMBOLS[gs.trickLeadSuit] })
                : t('game.leadSuit', { suit: SUIT_SYMBOLS[gs.trickLeadSuit] })}
            </span>
          )}
        </div>
        <div className="trick-cards">
          {gs.trickCards.map((tc) => (
            <div key={tc.playerId} className="trick-card-slot">
              <PlayingCard
                card={tc.card}
                winner={isTrickResult && trickWinner?.winnerId === tc.playerId}
              />
              <span className="trick-card-name">{tc.playerName}</span>
            </div>
          ))}
          {Array.from({ length: Math.max(0, gs.players.length - gs.trickCards.length) }, (_, i) => (
            <div key={`empty-${i}`} className="trick-card-slot trick-card-empty">
              <div className="card-placeholder" />
            </div>
          ))}
        </div>
        {isTrickResult && trickWinner && (
          <div className="trick-winner-announce">
            {t('game.trickWinner', { name: trickWinner.winnerName })}
            {trickWinner.wonByTrump && <span className="trump-win"> {t('game.trumpWin')}</span>}
          </div>
        )}
      </div>

      {/* Status */}
      <div className="turn-status">
        {isMyTurn ? (
          <span className="my-turn-label">{t('game.myTurn')}</span>
        ) : gs.phase === 'trick_play' ? (
          <span className="waiting-label">
            {t('game.otherTurn', { name: (() => { const p = gs.players.find((p) => p.id === gs.currentTurnPlayerId); return p ? displayName(p, t) : ''; })() })}
          </span>
        ) : null}
        {gs.phase === 'trick_play' && (() => {
          const leadIdx = gs.players.findIndex(p => p.id === gs.roundLeadPlayerId);
          const meIdx = gs.players.findIndex(p => p.id === gs.myId);
          const cnt = gs.players.length;
          const ord = leadIdx >= 0 && meIdx >= 0 ? ((meIdx - leadIdx + cnt) % cnt) + 1 : null;
          const leadPlayer = gs.players.find(p => p.id === gs.roundLeadPlayerId);
          const leadName = leadPlayer ? displayName(leadPlayer, t) : '';
          return (
            <span className="order-info-small">
              {t('game.leaderInfo', { leader: leadName, order: ord })}
            </span>
          );
        })()}
        {isMyTurn && timeLeft !== null && timeLeft > 0 && (
          <div className="timer-bar">
            <div className="timer-fill" style={{ width: `${(timeLeft / 30) * 100}%` }} />
            <span className="timer-text">{t('game.seconds', { n: timeLeft })}</span>
          </div>
        )}
      </div>

      {/* My hand */}
      <div className="my-hand-section">
        <div className="my-player-info">
          {gs.roundLeadPlayerId === gs.myId && <span className="leader-badge">{t('game.leader')}</span>}
          <img className="chr-avatar my-chr" src={getAvatarSrc(me?.avatarIndex || 0)} alt="" />
          <span className="my-name">{me ? displayName(me, t) : ''}</span>
          <span className="my-stats">{t('game.myStats', { pred: me?.prediction ?? '?', wins: me?.tricksWon ?? 0 })}</span>
        </div>
        <div className="hand-cards hand-interactive">
          {myHand.map((card) => {
            const isValid = validCardIds.has(card.id);
            return (
              <PlayingCard
                key={card.id}
                card={card}
                size="lg"
                onClick={isMyTurn ? () => handlePlayCard(card) : undefined}
                highlight={isMyTurn && isValid}
                disabled={isMyTurn && !isValid}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===================== ROUND SCORING =====================
function RoundScoring({ gs, sock }: { gs: NonNullable<Sock['gameState']>; sock: Sock }) {
  const { t } = useTranslation();
  const rr = sock.roundResult;
  const playedRef = useRef(false);

  useEffect(() => {
    if (rr && !playedRef.current) {
      playedRef.current = true;
      playRoundEnd();
    }
  }, [rr]);

  if (!rr) return (
    <div className="overlay-panel">
      <div className="scoring-container glass">
        <h2>{t('game.scoringTitle')}</h2>
      </div>
    </div>
  );

  return (
    <div className="overlay-panel">
      <div className="scoring-container glass">
        <h2>{t('game.roundResult', { round: rr.round })}</h2>
        <table className="score-table">
          <thead>
            <tr>
              <th>{t('game.colPlayer')}</th>
              <th>{t('game.colPrediction')}</th>
              <th>{t('game.colActual')}</th>
              <th>{t('game.colResult')}</th>
              <th>{t('game.colScore')}</th>
              <th>{t('game.colTotal')}</th>
            </tr>
          </thead>
          <tbody>
            {rr.playerScores.map((ps) => (
              <tr key={ps.playerId} className={ps.correct ? 'score-correct' : 'score-wrong'}>
                <td>{ps.playerName}</td>
                <td>{ps.prediction}</td>
                <td>{ps.tricksWon}</td>
                <td>{ps.correct ? t('game.correct') : t('game.wrong')}</td>
                <td>+{ps.roundScore}</td>
                <td className="score-total">{ps.totalScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="btn btn-primary" onClick={() => { sock.nextRound(); playedRef.current = false; }}>
          {gs.currentRound >= gs.totalRounds ? t('game.viewFinalResults') : t('game.nextRound')}
        </button>
      </div>
    </div>
  );
}
