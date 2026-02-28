import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { audioManager } from '../utils/audioManager';
import './MusicToggle.css';

export default function MusicToggle() {
  const { t } = useTranslation();
  const [, setTick] = useState(0);

  useEffect(() => {
    return audioManager.subscribe(() => setTick((t) => t + 1));
  }, []);

  const isPlaying = audioManager.playing && !audioManager.muted;

  return (
    <button
      className={`btn btn-ghost music-toggle-btn ${isPlaying ? 'playing' : ''}`}
      onClick={() => audioManager.toggleMute()}
      title={isPlaying ? t('music.musicOn') : t('music.musicOff')}
    >
      {isPlaying ? '🎵' : '🔇'}
    </button>
  );
}
