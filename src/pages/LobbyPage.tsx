import { useState, useEffect } from 'react';
import type { useSocket } from '../hooks/useSocket';
import type { ToastItem } from '../components/Toast';
import type { BotDifficulty } from '../types';
import { CHARACTERS } from '../utils/characters';
import { generateRandomName } from '../utils/randomName';
import { audioManager } from '../utils/audioManager';
import { playClick } from '../utils/sfx';
import InfoModal from '../components/InfoModal';
import './LobbyPage.css';

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
  const [showInfo, setShowInfo] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [, setMusicTick] = useState(0);

  useEffect(() => {
    return audioManager.subscribe(() => setMusicTick((t) => t + 1));
  }, []);

  const isMusicOn = audioManager.playing && !audioManager.muted;

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
          <img className="lobby-logo" src="/logo/opening.png" alt="예(Yeah!!)" draggable={false} />
          <h1>예는 Yeah!!로</h1>
          <p className="lobby-subtitle">트릭테이킹 카드 게임 (说到做到)</p>
        </div>
        <div className="lobby-buttons">
          <button className="btn btn-primary btn-large" onClick={() => { playClick(); setView('create'); }}>
            방 만들기
          </button>
          <button className="btn btn-outline btn-large" onClick={() => { playClick(); setView('join'); sock.refreshRooms?.(); }}>
            방 참가하기
          </button>
          <button className="btn btn-outline btn-large" onClick={() => { playClick(); setView('single'); }}>
            1인 플레이 (AI 상대)
          </button>
        </div>
        <div className="lobby-footer">
          <button className="lobby-footer-btn" onClick={() => { playClick(); setShowInfo(true); }}>
            📖 게임 방법
          </button>
          <button className="lobby-footer-btn" onClick={() => { playClick(); audioManager.toggleMute(); }}>
            {isMusicOn ? '🎵' : '🔇'} 음악
          </button>
          <button className="lobby-footer-btn" onClick={() => { playClick(); setShowAbout(true); }}>
            💝 제작계기 & 후원
          </button>
        </div>

        {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
        {showAbout && (
          <div className="overlay" onClick={() => setShowAbout(false)}>
            <div className="modal about-modal" onClick={(e) => e.stopPropagation()}>
              <div className="about-header">
                <h2>제작계기 & 후원</h2>
                <button className="btn btn-ghost info-close" onClick={() => setShowAbout(false)}>✕</button>
              </div>
              <div className="about-body">
                <section>
                  <h3>🎮 제작 계기</h3>
                  <p>이 게임은 가족과 친구들이 함께 즐길 수 있는 온라인 카드게임을 만들고자 제작되었습니다.</p>
                  <p>클래식 트릭테이킹 카드게임 "예(Yeah!!)"를 어디서든 함께 할 수 있도록 만들었습니다.</p>
                </section>

                <h3>📬 개발자에게 연락하기</h3>
                <div className="contact-card">
                  <div className="contact-row">
                    <span className="contact-label">📧 이메일</span>
                    <a href="mailto:atshane81@gmail.com" className="contact-value">atshane81@gmail.com</a>
                  </div>
                  <a
                    href="https://pf.kakao.com/_exghAX"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="kakao-channel-btn"
                  >
                    💬 카카오톡 채널
                  </a>
                </div>

                <h3>💛 후원</h3>
                <div className="donate-card">
                  <p>이 게임이 도움이 되셨다면 후원으로 응원해 주세요!</p>
                  <a
                    href="https://qr.kakaopay.com/FN0023EGr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="kakao-pay-btn donate-mobile-link"
                  >
                    💛 카카오페이로 후원하기
                  </a>
                  <div className="donate-qr-desktop">
                    <p className="donate-qr-label">PC에서는 QR코드를 스캔해 주세요</p>
                    <img
                      className="donate-qr-img"
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent('https://qr.kakaopay.com/FN0023EGr')}`}
                      alt="카카오페이 후원 QR코드"
                      width={180}
                      height={180}
                    />
                  </div>
                </div>

                <section className="about-copyright">
                  <h3>저작권 안내</h3>
                  <p>
                    사용되는 모든 그림과 음악은 AI로 제작되었습니다.<br />
                    본 게임은 비영리 목적으로 제작되었습니다.
                  </p>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function handleRandom() {
    playClick();
    const { avatarIndex, nickname: rndName } = generateRandomName();
    saveNickname(rndName);
    setAvatarIdx(avatarIndex);
  }

  // --- Shared: Nickname + Avatar ---
  const nicknameAvatar = (
    <>
      <div className="form-field">
        <label>닉네임</label>
        <div className="nickname-row">
          <input
            className="input"
            value={nickname}
            onChange={(e) => saveNickname(e.target.value)}
            placeholder="닉네임 입력"
            maxLength={12}
          />
          <button className="btn btn-outline random-btn" onClick={handleRandom} title="랜덤 생성">
            🎲
          </button>
        </div>
      </div>
      <div className="avatar-picker">
        <label>캐릭터</label>
        <div className="avatar-grid">
          {CHARACTERS.map((ch) => (
            <button
              key={ch.id}
              className={`avatar-btn ${avatarIdx === ch.id ? 'selected' : ''}`}
              onClick={() => { setAvatarIdx(ch.id); playClick(); }}
              title={ch.name}
            >
              <img className="avatar-img" src={ch.src} alt={ch.name} draggable={false} />
            </button>
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
