import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { useSocket } from '../hooks/useSocket';
import { getAvatarSrc } from '../utils/characters';
import { playGameOver } from '../utils/sfx';
import confetti from 'canvas-confetti';
import './GameOverPage.css';

type Sock = ReturnType<typeof useSocket>;
interface Props {
  sock: Sock;
}

export default function GameOverPage({ sock }: Props) {
  const { t } = useTranslation();
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
        <h1 className="gameover-title">{t('result.gameOver')}</h1>

        <div className="winner-section">
          <img className="winner-chr" src={getAvatarSrc(winner?.avatarIndex || 0)} alt="" />
          <h2 className="winner-name">{winner?.botNameKey ? t(winner.botNameKey) : winner?.nickname}</h2>
          <p className="winner-score">{t('result.points', { score: winner?.totalScore })}</p>
          {isMe && <p className="winner-you">{t('result.congratulations')}</p>}
        </div>

        <div className="final-standings">
          <table className="standings-table">
            <thead>
              <tr>
                <th>{t('result.rank')}</th>
                <th>{t('result.player')}</th>
                <th>{t('result.totalScore')}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => (
                <tr key={p.id} className={p.id === gs.myId ? 'standings-me' : ''}>
                  <td className="rank-cell">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                  </td>
                  <td className="standings-player-cell">
                    <img className="chr-avatar-sm" src={getAvatarSrc(p.avatarIndex)} alt="" />
                    {p.botNameKey ? t(p.botNameKey) : p.nickname}
                    {p.isBot && <span className="bot-tag">BOT</span>}
                    {p.id === gs.myId && <span className="me-tag">{t('common.me')}</span>}
                  </td>
                  <td className="score-cell">{p.totalScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sorted[0]?.roundScores && sorted[0].roundScores.length > 0 && (
          <div className="round-breakdown">
            <h3>{t('result.roundBreakdown')}</h3>
            <div className="breakdown-scroll">
              <table className="breakdown-table">
                <thead>
                  <tr>
                    <th>{t('result.player')}</th>
                    {gs.roundSequence.map((cards, i) => (
                      <th key={i}>{t('result.roundHeader', { n: i + 1 })}<br /><span className="round-cards">{t('result.cardsCount', { n: cards })}</span></th>
                    ))}
                    <th>{t('result.sum')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p) => (
                    <tr key={p.id} className={p.id === gs.myId ? 'standings-me' : ''}>
                      <td>{p.botNameKey ? t(p.botNameKey) : p.nickname}</td>
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
              {t('result.playAgain')}
            </button>
          )}
          <button className="btn btn-outline" onClick={() => sock.leaveRoom()}>
            {t('result.backToLobby')}
          </button>
        </div>
      </div>
    </div>
  );
}
