import { useState } from 'react';
import type { useSocket } from '../hooks/useSocket';
import type { ToastItem } from '../components/Toast';
import type { BotDifficulty } from '../types';
import { playClick } from '../utils/sfx';
import './LobbyPage.css';

const AVATARS = ['🃏', '♠', '♥', '♦', '♣', '🎴', '👑', '🎯', '🌟', '🔥', '🎲', '🏆'];

type Sock = ReturnType<typeof useSocket>;
type View = 'menu' | 'single' | 'create' | 'join';

interface Props {
  sock: Sock;
  addToast: (msg: string, type?: ToastItem['type']) => void;
}

export default function LobbyPage({ sock, addToast }: Props) {
  const [view, setView] = useState<View>('menu');
  const [nickname, setNickname] = useState(() => {
    try { return localStorage.getItem('yeah_nickname') || ''; } catch { return ''; }
  });
  const [avatarIdx, setAvatarIdx] = useState(0);
  const [botCount, setBotCount] = useState(3);
  const [botDiff, setBotDiff] = useState<BotDifficulty>('medium');
  const [roomCode, setRoomCode] = useState('');

  function saveNickname(name: string) {
    setNickname(name);
    try { localStorage.setItem('yeah_nickname', name); } catch { /* */ }
  }

  function handleSinglePlay() {
    playClick();
    if (!nickname.trim()) return addToast('닉네임을 입력해주세요.', 'alert');
    if (botCount < 2) return addToast('봇은 최소 2명 필요합니다.', 'alert');
    sock.createRoom(nickname.trim(), avatarIdx, {
      singlePlayerMode: true,
      botCount,
      botDifficulty: botDiff,
    });
  }

  function handleCreate() {
    playClick();
    if (!nickname.trim()) return addToast('닉네임을 입력해주세요.', 'alert');
    sock.createRoom(nickname.trim(), avatarIdx, {});
  }

  function handleJoin() {
    playClick();
    if (!nickname.trim()) return addToast('닉네임을 입력해주세요.', 'alert');
    if (!roomCode.trim()) return addToast('방 코드를 입력해주세요.', 'alert');
    sock.joinRoom(roomCode.trim().toUpperCase(), nickname.trim(), avatarIdx);
  }

  function handleJoinFromList(code: string) {
    playClick();
    if (!nickname.trim()) return addToast('닉네임을 먼저 입력해주세요.', 'alert');
    sock.joinRoom(code, nickname.trim(), avatarIdx);
  }

  // --- Menu ---
  if (view === 'menu') {
    return (
      <div className="lobby-page" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="lobby-title">
          <span className="lobby-icon">🃏</span>
          <h1>예(Yeah!!)</h1>
          <p className="lobby-subtitle">트릭테이킹 카드 게임</p>
        </div>
        <div className="lobby-buttons">
          <button className="btn btn-primary btn-large" onClick={() => { playClick(); setView('single'); }}>
            1인 플레이 (AI 상대)
          </button>
          <button className="btn btn-outline btn-large" onClick={() => { playClick(); setView('create'); }}>
            방 만들기
          </button>
          <button className="btn btn-outline btn-large" onClick={() => { playClick(); setView('join'); sock.refreshRooms?.(); }}>
            방 참가하기
          </button>
        </div>
      </div>
    );
  }

  // --- Shared: Nickname + Avatar ---
  const nicknameAvatar = (
    <>
      <div className="form-field">
        <label>닉네임</label>
        <input
          className="input"
          value={nickname}
          onChange={(e) => saveNickname(e.target.value)}
          placeholder="닉네임 입력"
          maxLength={12}
        />
      </div>
      <div className="avatar-picker">
        <label>아바타</label>
        <div className="avatar-grid">
          {AVATARS.map((a, i) => (
            <button
              key={i}
              className={`avatar-btn ${avatarIdx === i ? 'selected' : ''}`}
              onClick={() => { setAvatarIdx(i); playClick(); }}
            >{a}</button>
          ))}
        </div>
      </div>
    </>
  );

  // --- Single Player ---
  if (view === 'single') {
    return (
      <div className="lobby-page" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <button className="btn btn-ghost back-btn" onClick={() => setView('menu')}>← 뒤로</button>
        <div className="lobby-form glass">
          <h2>1인 플레이</h2>
          {nicknameAvatar}
          <div className="create-options">
            <div className="option-group">
              <label>봇 수 (총 플레이어 = 1 + 봇)</label>
              <div className="toggle-group bot-count-group">
                {[2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    className={`toggle-btn ${botCount === n ? 'active' : ''}`}
                    onClick={() => { setBotCount(n); playClick(); }}
                  >{n}</button>
                ))}
              </div>
            </div>
            <div className="option-group">
              <label>봇 난이도</label>
              <div className="toggle-group">
                {(['easy', 'medium', 'hard'] as const).map((d) => (
                  <button
                    key={d}
                    className={`toggle-btn ${botDiff === d ? 'active' : ''}`}
                    onClick={() => { setBotDiff(d); playClick(); }}
                  >{d === 'easy' ? '쉬움' : d === 'medium' ? '보통' : '어려움'}</button>
                ))}
              </div>
            </div>
          </div>
          <button className="btn btn-primary btn-large" onClick={handleSinglePlay}>
            게임 시작
          </button>
        </div>
      </div>
    );
  }

  // --- Create Room ---
  if (view === 'create') {
    return (
      <div className="lobby-page" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <button className="btn btn-ghost back-btn" onClick={() => setView('menu')}>← 뒤로</button>
        <div className="lobby-form glass">
          <h2>방 만들기</h2>
          {nicknameAvatar}
          <button className="btn btn-primary btn-large" onClick={handleCreate}>
            방 생성
          </button>
        </div>
      </div>
    );
  }

  // --- Join Room ---
  return (
    <div className="lobby-page" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <button className="btn btn-ghost back-btn" onClick={() => setView('menu')}>← 뒤로</button>
      <div className="lobby-form glass">
        <h2>방 참가하기</h2>
        {nicknameAvatar}
        <div className="join-options">
          <div className="form-field">
            <label>방 코드 입력</label>
            <div className="code-input-row">
              <input
                className="input"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="ABCDE"
                maxLength={5}
              />
              <button className="btn btn-primary" onClick={handleJoin}>참가</button>
            </div>
          </div>
          {sock.availableRooms.length > 0 && (
            <div className="room-list">
              <label>열린 방 목록</label>
              {sock.availableRooms.map((r) => (
                <div key={r.roomCode} className="room-item glass">
                  <div className="room-info">
                    <span className="room-host">{r.hostName}</span>
                    <span className="room-players text-muted">{r.playerCount}/7명</span>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => handleJoinFromList(r.roomCode)}>
                    참가
                  </button>
                </div>
              ))}
            </div>
          )}
          {sock.availableRooms.length === 0 && (
            <p className="text-muted" style={{ textAlign: 'center', fontSize: '0.85rem' }}>
              열린 방이 없습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
