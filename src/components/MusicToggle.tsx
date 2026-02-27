import { useState, useEffect } from 'react';
import { audioManager } from '../utils/audioManager';
import './MusicToggle.css';

export default function MusicToggle() {
  const [, setTick] = useState(0);

  useEffect(() => {
    return audioManager.subscribe(() => setTick((t) => t + 1));
  }, []);

  const isPlaying = audioManager.playing && !audioManager.muted;

  return (
    <button
      className={`btn btn-ghost music-toggle-btn ${isPlaying ? 'playing' : ''}`}
      onClick={() => audioManager.toggleMute()}
      title={isPlaying ? '음악 끄기' : '음악 켜기'}
    >
      {isPlaying ? '🎵' : '🔇'}
    </button>
  );
}
