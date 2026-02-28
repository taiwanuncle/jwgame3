import { useState, useEffect, useCallback } from 'react';
import { audioManager, ALL_TRACKS, type Track, type MusicCategory } from '../utils/audioManager';
import './PlaylistModal.css';

interface Props {
  onClose: () => void;
}

const CATEGORY_LABELS: Record<MusicCategory, string> = {
  opening: '오프닝',
  playing: '플레이',
  celebration: '축하',
};

const CATEGORY_ICONS: Record<MusicCategory, string> = {
  opening: '🎬',
  playing: '🎮',
  celebration: '🎉',
};

export default function PlaylistModal({ onClose }: Props) {
  const [, setTick] = useState(0);

  useEffect(() => {
    return audioManager.subscribe(() => setTick((t) => t + 1));
  }, []);

  const currentTrack = audioManager.currentTrack;
  const isPlaying = audioManager.playing;
  const volume = audioManager.volume;
  const isMuted = audioManager.muted;

  const handleTrackClick = useCallback((track: Track) => {
    if (currentTrack?.id === track.id && isPlaying) {
      audioManager.pause();
    } else if (currentTrack?.id === track.id && !isPlaying) {
      audioManager.resume();
    } else {
      audioManager.playFromPlaylist(track);
    }
  }, [currentTrack, isPlaying]);

  const handleNext = useCallback(() => { audioManager.next(); }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    audioManager.setVolume(Number(e.target.value));
  }, []);

  const handleToggleMute = useCallback(() => { audioManager.toggleMute(); }, []);
  const handleTogglePlay = useCallback(() => { audioManager.togglePlay(); }, []);

  const handleShuffle = useCallback(() => {
    const randomTrack = ALL_TRACKS[Math.floor(Math.random() * ALL_TRACKS.length)];
    audioManager.playFromPlaylist(randomTrack);
  }, []);

  const categories: MusicCategory[] = ['opening', 'playing', 'celebration'];

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal playlist-modal" onClick={(e) => e.stopPropagation()}>
        <div className="playlist-header">
          <h2>🎵 플레이리스트</h2>
          <button className="btn btn-ghost info-close" onClick={onClose}>✕</button>
        </div>

        {/* Player Controls */}
        <div className="playlist-player">
          <div className="player-now-playing">
            {currentTrack ? (
              <span className="now-playing-text">
                {CATEGORY_ICONS[currentTrack.category]} {currentTrack.name}
              </span>
            ) : (
              <span className="now-playing-text now-playing-empty">선택된 곡 없음</span>
            )}
          </div>
          <div className="player-controls">
            <button className="player-btn" onClick={handleTogglePlay} title={isPlaying ? '일시정지' : '재생'}>
              {isPlaying ? '⏸' : '▶️'}
            </button>
            <button className="player-btn" onClick={handleNext} title="다음곡">⏭</button>
            <button className="player-btn" onClick={handleShuffle} title="랜덤">🔀</button>
            <button className={`player-btn ${isMuted ? 'muted' : ''}`} onClick={handleToggleMute} title={isMuted ? '음소거 해제' : '음소거'}>
              {isMuted ? '🔇' : '🔊'}
            </button>
          </div>
          <div className="player-volume">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="volume-slider"
            />
          </div>
        </div>

        {/* Track List */}
        <div className="playlist-tracks">
          {categories.map((cat) => {
            const tracks = ALL_TRACKS.filter((t) => t.category === cat);
            return (
              <div key={cat} className="playlist-category">
                <div className="category-header">
                  <span className="category-icon">{CATEGORY_ICONS[cat]}</span>
                  <span className="category-label">{CATEGORY_LABELS[cat]}</span>
                </div>
                {tracks.map((track) => {
                  const isCurrent = currentTrack?.id === track.id;
                  const isTrackPlaying = isCurrent && isPlaying;
                  return (
                    <button
                      key={track.id}
                      className={`track-item ${isCurrent ? 'current' : ''} ${isTrackPlaying ? 'playing' : ''}`}
                      onClick={() => handleTrackClick(track)}
                    >
                      <span className="track-indicator">
                        {isTrackPlaying ? '🔊' : isCurrent ? '⏸' : '♪'}
                      </span>
                      <span className="track-name">{track.name}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
