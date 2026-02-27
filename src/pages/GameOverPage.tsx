import { useEffect, useRef } from 'react';
import type { useSocket } from '../hooks/useSocket';
import { playGameOver } from '../utils/sfx';
import confetti from 'canvas-confetti';
import './GameOverPage.css';

type Sock = ReturnType<typeof useSocket>;
interface Props {
  sock: Sock;
}

export default function GameOverPage({ sock }: Props) {
  const gs = sock.gameState;
  const effectRef = useRef(false);

  useEffect(() => {
    if (!effectRef.current) {
      effectRef.current = true;
      playGameOver();
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    }
  }, []);

  if (!gs) return null;

  const sorted = [...gs.players].sort((a, b) => b.totalScore - a.totalScore);
  const winner = sorted[0];
  const isMe = winner?.id === gs.myId;
  const me = gs.players.find((p) => p.id === gs.myId);

  return (
    <div className="gameover-page">
      <div className="gameover-content glass">
        <h1 className="gameover-title">게임 종료!</h1>

        <div className="winner-section">
          <span className="winner-icon">🏆</span>
          <h2 className="winner-name">{winner?.nickname}</h2>
          <p className="winner-score">{winner?.totalScore}점</p>
          {isMe && <p className="winner-you">축하합니다!</p>}
        </div>

        <div className="final-standings">
          <table className="standings-table">
            <thead>
              <tr>
                <th>순위</th>
                <th>플레이어</th>
                <th>총점</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => (
                <tr key={p.id} className={p.id === gs.myId ? 'standings-me' : ''}>
                  <td className="rank-cell">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                  </td>
                  <td>
                    {p.nickname}
                    {p.isBot && <span className="bot-tag">BOT</span>}
                    {p.id === gs.myId && <span className="me-tag">나</span>}
                  </td>
                  <td className="score-cell">{p.totalScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Round-by-round breakdown */}
        {sorted[0]?.roundScores && sorted[0].roundScores.length > 0 && (
          <div className="round-breakdown">
            <h3>라운드별 점수</h3>
            <div className="breakdown-scroll">
              <table className="breakdown-table">
                <thead>
                  <tr>
                    <th>플레이어</th>
                    {gs.roundSequence.map((cards, i) => (
                      <th key={i}>R{i + 1}<br /><span className="round-cards">{cards}장</span></th>
                    ))}
                    <th>합계</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p) => (
                    <tr key={p.id} className={p.id === gs.myId ? 'standings-me' : ''}>
                      <td>{p.nickname}</td>
                      {p.roundScores.map((s, i) => (
                        <td key={i} className={s > 0 ? 'round-success' : 'round-fail'}>
                          {s}
                        </td>
                      ))}
                      <td className="score-cell">{p.totalScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="gameover-actions">
          {me?.isHost && (
            <button className="btn btn-primary btn-large" onClick={() => sock.playAgain()}>
              다시 하기
            </button>
          )}
          <button className="btn btn-outline" onClick={() => sock.leaveRoom()}>
            로비로 나가기
          </button>
        </div>
      </div>
    </div>
  );
}
