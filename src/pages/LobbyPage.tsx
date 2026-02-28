import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { useSocket } from '../hooks/useSocket';
import type { ToastItem } from '../components/Toast';
import type { BotDifficulty } from '../types';
import { CHARACTERS } from '../utils/characters';
import { generateRandomName } from '../utils/randomName';
import { playClick } from '../utils/sfx';
import InfoModal from '../components/InfoModal';
import PlaylistModal from '../components/PlaylistModal';
import LanguageToggle from '../components/LanguageToggle';
import './LobbyPage.css';

type Sock = ReturnType<typeof useSocket>;
type View = 'menu' | 'single' | 'create' | 'join';

interface Props {
  sock: Sock;
  addToast: (msg: string, type?: ToastItem['type']) => void;
}

export default function LobbyPage({ sock, addToast }: Props) {
  const { t } = useTranslation();
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
  const [showPlaylist, setShowPlaylist] = useState(false);

  function saveNickname(name: string) {
    setNickname(name);
    try { localStorage.setItem('yeah_nickname', name); } catch { /* */ }
  }

  function handleSinglePlay() {
    playClick();
    if (!nickname.trim()) return addToast(t('lobby.enterNickname'), 'alert');
    if (botCount < 2) return addToast(t('lobby.minBots'), 'alert');
    sock.createRoom(nickname.trim(), avatarIdx, {
      singlePlayerMode: true,
      botCount,
      botDifficulty: botDiff,
    });
  }

  function handleCreate() {
    playClick();
    if (!nickname.trim()) return addToast(t('lobby.enterNickname'), 'alert');
    sock.createRoom(nickname.trim(), avatarIdx, {});
  }

  function handleJoin() {
    playClick();
    if (!nickname.trim()) return addToast(t('lobby.enterNickname'), 'alert');
    if (!roomCode.trim()) return addToast(t('lobby.enterRoomCode'), 'alert');
    sock.joinRoom(roomCode.trim().toUpperCase(), nickname.trim(), avatarIdx);
  }

  function handleJoinFromList(code: string) {
    playClick();
    if (!nickname.trim()) return addToast(t('lobby.enterNicknameFirst'), 'alert');
    sock.joinRoom(code, nickname.trim(), avatarIdx);
  }

  // --- Menu ---
  if (view === 'menu') {
    return (
      <div className="lobby-page" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="lobby-title">
          <img className="lobby-logo" src="/logo/opening.png" alt="예(Yeah!!)" draggable={false} />
          <h1>{t('lobby.title')}</h1>
          <p className="lobby-subtitle">{t('lobby.subtitle')}</p>
        </div>
        <div className="lobby-buttons">
          <button className="btn btn-primary btn-large" onClick={() => { playClick(); setView('create'); }}>
            {t('lobby.createRoom')}
          </button>
          <button className="btn btn-outline btn-large" onClick={() => { playClick(); setView('join'); sock.refreshRooms?.(); }}>
            {t('lobby.joinRoom')}
          </button>
          <button className="btn btn-outline btn-large" onClick={() => { playClick(); setView('single'); }}>
            {t('lobby.singlePlay')}
          </button>
        </div>
        <div className="lobby-footer">
          <button className="lobby-footer-btn" onClick={() => { playClick(); setShowInfo(true); }}>
            {t('lobby.howToPlay')}
          </button>
          <button className="lobby-footer-btn" onClick={() => { playClick(); setShowPlaylist(true); }}>
            {t('lobby.music')}
          </button>
          <button className="lobby-footer-btn" onClick={() => { playClick(); setShowAbout(true); }}>
            {t('lobby.aboutAndDonate')}
          </button>
          <LanguageToggle />
        </div>

        {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
        {showPlaylist && <PlaylistModal onClose={() => setShowPlaylist(false)} />}
        {showAbout && (
          <div className="overlay" onClick={() => setShowAbout(false)}>
            <div className="modal about-modal" onClick={(e) => e.stopPropagation()}>
              <div className="about-header">
                <h2>{t('about.title')}</h2>
                <button className="btn btn-ghost info-close" onClick={() => setShowAbout(false)}>✕</button>
              </div>
              <div className="about-body">
                <section>
                  <h3>{t('about.motiveTitle')}</h3>
                  <p>{t('about.motiveText1')}</p>
                  <p>{t('about.motiveText2')}</p>
                </section>

                <h3>{t('about.contactTitle')}</h3>
                <div className="contact-card">
                  <div className="contact-row">
                    <span className="contact-label">{t('about.email')}</span>
                    <a href="mailto:atshane81@gmail.com" className="contact-value">atshane81@gmail.com</a>
                  </div>
                  <a
                    href="https://pf.kakao.com/_exghAX"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="kakao-channel-btn"
                  >
                    {t('about.kakaoChannel')}
                  </a>
                </div>

                <h3>{t('about.donateTitle')}</h3>
                <div className="donate-card">
                  <p>{t('about.donateText')}</p>
                  <a
                    href="https://qr.kakaopay.com/FN0023EGr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="kakao-pay-btn donate-mobile-link"
                  >
                    {t('about.donateBtnKakao')}
                  </a>
                  <div className="donate-qr-desktop">
                    <p className="donate-qr-label">{t('about.donateQrLabel')}</p>
                    <img
                      className="donate-qr-img"
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent('https://qr.kakaopay.com/FN0023EGr')}`}
                      alt={t('about.donateQrAlt')}
                      width={180}
                      height={180}
                    />
                  </div>
                </div>

                <section className="about-copyright">
                  <h3>{t('about.copyrightTitle')}</h3>
                  <p>
                    {t('about.copyrightText1')}<br />
                    {t('about.copyrightText2')}
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
        <label>{t('lobby.nickname')}</label>
        <div className="nickname-row">
          <input
            className="input"
            value={nickname}
            onChange={(e) => saveNickname(e.target.value)}
            placeholder={t('lobby.nicknamePlaceholder')}
            maxLength={12}
          />
          <button className="btn btn-outline random-btn" onClick={handleRandom} title={t('lobby.randomGenerate')}>
            🎲
          </button>
        </div>
      </div>
      <div className="avatar-picker">
        <label>{t('lobby.character')}</label>
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
        <button className="btn btn-ghost back-btn" onClick={() => setView('menu')}>{t('common.back')}</button>
        <div className="lobby-form glass">
          <h2>{t('lobby.singlePlayTitle')}</h2>
          {nicknameAvatar}
          <div className="create-options">
            <div className="option-group">
              <label>{t('lobby.botCount')}</label>
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
              <label>{t('lobby.botDifficulty')}</label>
              <div className="toggle-group">
                {(['easy', 'medium', 'hard'] as const).map((d) => (
                  <button
                    key={d}
                    className={`toggle-btn ${botDiff === d ? 'active' : ''}`}
                    onClick={() => { setBotDiff(d); playClick(); }}
                  >{d === 'easy' ? t('lobby.diffEasy') : d === 'medium' ? t('lobby.diffMedium') : t('lobby.diffHard')}</button>
                ))}
              </div>
            </div>
          </div>
          <button className="btn btn-primary btn-large" onClick={handleSinglePlay}>
            {t('lobby.startGame')}
          </button>
        </div>
      </div>
    );
  }

  // --- Create Room ---
  if (view === 'create') {
    return (
      <div className="lobby-page" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <button className="btn btn-ghost back-btn" onClick={() => setView('menu')}>{t('common.back')}</button>
        <div className="lobby-form glass">
          <h2>{t('lobby.createRoomTitle')}</h2>
          {nicknameAvatar}
          <button className="btn btn-primary btn-large" onClick={handleCreate}>
            {t('lobby.createRoomBtn')}
          </button>
        </div>
      </div>
    );
  }

  // --- Join Room ---
  return (
    <div className="lobby-page" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <button className="btn btn-ghost back-btn" onClick={() => setView('menu')}>{t('common.back')}</button>
      <div className="lobby-form glass">
        <h2>{t('lobby.joinRoomTitle')}</h2>
        {nicknameAvatar}
        <div className="join-options">
          <div className="form-field">
            <label>{t('lobby.roomCodeInput')}</label>
            <div className="code-input-row">
              <input
                className="input"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder={t('lobby.roomCodePlaceholder')}
                maxLength={5}
              />
              <button className="btn btn-primary" onClick={handleJoin}>{t('lobby.join')}</button>
            </div>
          </div>
          {sock.availableRooms.length > 0 && (
            <div className="room-list">
              <label>{t('lobby.openRoomList')}</label>
              {sock.availableRooms.map((r) => (
                <div key={r.roomCode} className="room-item glass">
                  <div className="room-info">
                    <span className="room-host">{r.hostName}</span>
                    <span className="room-players text-muted">{t('lobby.playersCount', { count: r.playerCount })}</span>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => handleJoinFromList(r.roomCode)}>
                    {t('lobby.join')}
                  </button>
                </div>
              ))}
            </div>
          )}
          {sock.availableRooms.length === 0 && (
            <p className="text-muted" style={{ textAlign: 'center', fontSize: '0.85rem' }}>
              {t('lobby.noOpenRooms')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
