import { useState, useEffect, useRef } from 'react';
import type { useSocket } from '../hooks/useSocket';
import type { ToastItem } from '../components/Toast';
import type { Card } from '../types';
import PlayingCard from '../components/PlayingCard';
import MusicToggle from '../components/MusicToggle';
import InfoModal from '../components/InfoModal';
import { getAvatarSrc } from '../utils/characters';
import { playCardPlay, playMyTurn, playDiceRoll, playPredictionReveal, playTrickWon, playRoundEnd } from '../utils/sfx';
import './GamePage.css';

const SUIT_SYMBOLS: Record<string, string> = {
  spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣',
};

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
  const [showLog, setShowLog] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="game-header">
      <div className="header-left">
        <button className="btn btn-ghost btn-sm" onClick={() => setShowLog(!showLog)}>
          {showLog ? '✕ 닫기' : '📋 로그'}
        </button>
        <span className="round-info">
          R{gs.currentRound}/{gs.totalRounds} ({gs.cardsThisRound}장)
        </span>
      </div>
      <div className="header-center">
        <span className="trump-badge">♥ 트럼프</span>
      </div>
      <div className="header-right">
        <MusicToggle />
        <button className="btn btn-ghost btn-sm" onClick={() => setShowInfo(true)} title="게임 규칙">ℹ️</button>
        <button className="btn btn-ghost btn-sm" onClick={() => sock.leaveRoom()}>나가기</button>
      </div>

      {showLog && (
        <div className="log-panel glass">
          <div className="log-list">
            {gs.actionLog.slice().reverse().map((entry, i) => (
              <div key={i} className="log-entry">{entry.message}</div>
            ))}
          </div>
        </div>
      )}
      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
    </div>
  );
}

// ===================== DICE =====================
function DiceOverlay({ sock }: { sock: Sock }) {
  const dr = sock.diceResult;
  const playedRef = useRef(false);

  useEffect(() => {
    if (!playedRef.current) {
      playedRef.current = true;
      playDiceRoll();
    }
  }, []);

  if (!dr) return (
    <div className="overlay-panel">
      <div className="dice-container glass">
        <h2>주사위 굴리는 중...</h2>
        <div className="dice-spinner">🎲</div>
      </div>
    </div>
  );

  return (
    <div className="overlay-panel">
      <div className="dice-container glass">
        <h2>주사위 결과</h2>
        <div className="dice-results">
          {dr.rolls.map((r) => (
            <div key={r.playerId} className={`dice-player ${r.playerId === dr.winnerId ? 'dice-winner' : ''}`}>
              <span className="dice-name">{r.playerName}</span>
              <span className="dice-value">{r.roll}</span>
            </div>
          ))}
        </div>
        <p className="dice-announce">{dr.winnerName}님이 선 플레이어!</p>
      </div>
    </div>
  );
}

// ===================== PREDICTION =====================
function PredictionOverlay({ gs, sock, addToast }: { gs: NonNullable<Sock['gameState']>; sock: Sock; addToast: Props['addToast'] }) {
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
    addToast(`예측 제출: ${pred}번 승리`, 'info');
  }

  const timeLeft = gs.timerEnd ? Math.max(0, Math.ceil((gs.timerEnd - Date.now()) / 1000)) : null;

  return (
    <div className="prediction-panel">
      <div className="my-hand-display">
        <label>내 손패</label>
        <div className="hand-cards">
          {myHand.map((card) => (
            <PlayingCard key={card.id} card={card} small />
          ))}
        </div>
      </div>

      {!submitted ? (
        <div className="prediction-selector glass">
          <h3>몇 번 이길 수 있을까요?</h3>
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
            {pred}번 승리 예측!
          </button>
          {timeLeft !== null && timeLeft > 0 && (
            <div className="timer-bar">
              <div className="timer-fill" style={{ width: `${(timeLeft / 20) * 100}%` }} />
              <span className="timer-text">{timeLeft}초</span>
            </div>
          )}
        </div>
      ) : (
        <div className="prediction-waiting glass">
          {revealed ? (
            <>
              <h3>예측 공개!</h3>
              <div className="pred-reveals">
                {gs.players.map((p) => (
                  <div key={p.id} className="pred-reveal-item">
                    <span>{p.nickname}</span>
                    <span className="pred-reveal-num">{p.prediction}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <h3>다른 플레이어를 기다리는 중...</h3>
          )}
          <div className="submitted-badges">
            {gs.players.map((p) => (
              <span key={p.id} className={`sub-badge ${p.predictionSubmitted ? 'sub-done' : ''}`}>
                {p.nickname} {p.predictionSubmitted ? '✓' : '...'}
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
      addToast('이 카드는 낼 수 없습니다!', 'alert');
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
          return (
            <div key={p.id} className={`opponent-card ${isActive ? 'opponent-active' : ''} ${!p.connected ? 'opponent-dc' : ''}`}>
              <img className="chr-avatar opp-chr" src={getAvatarSrc(p.avatarIndex)} alt="" />
              <span className="opp-name">{p.nickname}</span>
              <div className="opp-stats">
                <span className="opp-pred">예측: {p.prediction ?? '?'}</span>
                <span className="opp-wins">승리: {p.tricksWon}</span>
              </div>
              {!p.connected && <span className="dc-badge">연결끊김</span>}
            </div>
          );
        })}
      </div>

      {/* Trick table — cards are md size now (bigger) */}
      <div className="trick-table glass">
        <div className="trick-info">
          <span>트릭 {gs.currentTrickNumber}/{gs.totalTricksThisRound}</span>
          {gs.trickLeadSuit && (
            <span className="lead-suit">
              리드: {SUIT_SYMBOLS[gs.trickLeadSuit]} {gs.trickLeadSuit === 'hearts' ? '(트럼프!)' : ''}
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
            {trickWinner.winnerName}님 승리!
            {trickWinner.wonByTrump && <span className="trump-win"> ♥ 트럼프!</span>}
          </div>
        )}
      </div>

      {/* Status */}
      <div className="turn-status">
        {isMyTurn ? (
          <span className="my-turn-label">당신의 차례! 카드를 선택하세요</span>
        ) : gs.phase === 'trick_play' ? (
          <span className="waiting-label">
            {gs.players.find((p) => p.id === gs.currentTurnPlayerId)?.nickname || ''}님의 차례...
          </span>
        ) : null}
        {isMyTurn && timeLeft !== null && timeLeft > 0 && (
          <div className="timer-bar">
            <div className="timer-fill" style={{ width: `${(timeLeft / 30) * 100}%` }} />
            <span className="timer-text">{timeLeft}초</span>
          </div>
        )}
      </div>

      {/* My hand */}
      <div className="my-hand-section">
        <div className="my-player-info">
          <img className="chr-avatar my-chr" src={getAvatarSrc(me?.avatarIndex || 0)} alt="" />
          <span className="my-name">{me?.nickname}</span>
          <span className="my-stats">예측: {me?.prediction ?? '?'} | 승리: {me?.tricksWon ?? 0}</span>
        </div>
        <div className="hand-cards hand-interactive">
          {myHand.map((card) => {
            const isValid = validCardIds.has(card.id);
            return (
              <PlayingCard
                key={card.id}
                card={card}
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
        <h2>점수 계산 중...</h2>
      </div>
    </div>
  );

  return (
    <div className="overlay-panel">
      <div className="scoring-container glass">
        <h2>라운드 {rr.round} 결과</h2>
        <table className="score-table">
          <thead>
            <tr>
              <th>플레이어</th>
              <th>예측</th>
              <th>실제</th>
              <th>결과</th>
              <th>점수</th>
              <th>총점</th>
            </tr>
          </thead>
          <tbody>
            {rr.playerScores.map((ps) => (
              <tr key={ps.playerId} className={ps.correct ? 'score-correct' : 'score-wrong'}>
                <td>{ps.playerName}</td>
                <td>{ps.prediction}</td>
                <td>{ps.tricksWon}</td>
                <td>{ps.correct ? '성공!' : '실패'}</td>
                <td>+{ps.roundScore}</td>
                <td className="score-total">{ps.totalScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="btn btn-primary" onClick={() => { sock.nextRound(); playedRef.current = false; }}>
          {gs.currentRound >= gs.totalRounds ? '최종 결과 보기' : '다음 라운드'}
        </button>
      </div>
    </div>
  );
}
