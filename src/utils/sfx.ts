/**
 * SFX — Sound effects using Web Audio API oscillator synthesis.
 * No external audio files needed. All sounds are generated procedurally.
 * Respects localStorage sfx_enabled setting.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  // Resume if suspended (autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function isSfxEnabled(): boolean {
  try {
    return localStorage.getItem('sfx_enabled') !== 'false';
  } catch {
    return true;
  }
}

export function setSfxEnabled(enabled: boolean) {
  try {
    localStorage.setItem('sfx_enabled', String(enabled));
  } catch { /* ignore */ }
}

export function getSfxEnabled(): boolean {
  return isSfxEnabled();
}

// Helper: play a tone
export function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.15,
  delay = 0,
) {
  if (!isSfxEnabled()) return;
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration);
}

// Helper: play noise burst
export function playNoise(duration: number, volume = 0.08, delay = 0) {
  if (!isSfxEnabled()) return;
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 2000;
  gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(ctx.currentTime + delay);
  source.stop(ctx.currentTime + delay + duration);
}

/** Card play sound — crisp snap with tap */
export function playCardPlay() {
  playNoise(0.1, 0.12);
  playTone(700, 0.08, 'square', 0.05);
  playTone(500, 0.06, 'sine', 0.04, 0.04);
}

/** Card deal sound — soft flip */
export function playCardDeal() {
  playNoise(0.06, 0.08);
  playTone(600, 0.05, 'sine', 0.03);
}

/** My turn notification — gentle ascending chime */
export function playMyTurn() {
  playTone(523, 0.15, 'sine', 0.12);        // C5
  playTone(659, 0.15, 'sine', 0.12, 0.12);  // E5
  playTone(784, 0.2, 'sine', 0.15, 0.24);   // G5
}

/** Dice roll — rapid clicking + rumble */
export function playDiceRoll() {
  for (let i = 0; i < 8; i++) {
    const freq = 300 + Math.random() * 400;
    playTone(freq, 0.04, 'square', 0.06, i * 0.05);
    playNoise(0.03, 0.04, i * 0.05);
  }
  // Final thud
  playTone(200, 0.15, 'sine', 0.1, 0.4);
  playNoise(0.08, 0.06, 0.4);
}

/** Dice reveal — dramatic unveil */
export function playDiceReveal() {
  playTone(600, 0.08, 'triangle', 0.1);
  playTone(800, 0.08, 'triangle', 0.1, 0.06);
  playTone(1100, 0.2, 'sine', 0.12, 0.12);
  playNoise(0.04, 0.06, 0.1);
}

/** Dice tie — suspenseful tension */
export function playDiceTie() {
  playTone(440, 0.15, 'sawtooth', 0.06);
  playTone(466, 0.15, 'sawtooth', 0.06, 0.12);
  playTone(440, 0.2, 'sawtooth', 0.04, 0.24);
  playNoise(0.06, 0.05, 0.3);
}

/** Dice winner — victory fanfare */
export function playDiceWinner() {
  playTone(784, 0.12, 'sine', 0.12);           // G5
  playTone(988, 0.12, 'sine', 0.12, 0.1);      // B5
  playTone(1175, 0.15, 'sine', 0.12, 0.2);     // D6
  playTone(1319, 0.35, 'sine', 0.1, 0.3);      // E6
  playTone(1047, 0.35, 'triangle', 0.06, 0.3); // C6 harmony
}

/** Prediction reveal — mysterious reveal */
export function playPredictionReveal() {
  playTone(440, 0.12, 'triangle', 0.1);         // A4
  playTone(554, 0.12, 'triangle', 0.1, 0.1);    // C#5
  playTone(659, 0.15, 'sine', 0.12, 0.2);       // E5
  playNoise(0.05, 0.04, 0.15);
}

/** Trick won — triumphant ping */
export function playTrickWon() {
  playTone(784, 0.1, 'sine', 0.12);             // G5
  playTone(988, 0.1, 'sine', 0.12, 0.08);       // B5
  playTone(1175, 0.2, 'sine', 0.1, 0.16);       // D6
  playTone(1319, 0.3, 'sine', 0.08, 0.24);      // E6
}

/** Round end — descending resolution */
export function playRoundEnd() {
  playTone(784, 0.2, 'sine', 0.12);             // G5
  playTone(659, 0.2, 'sine', 0.12, 0.15);       // E5
  playTone(523, 0.3, 'sine', 0.15, 0.3);        // C5
  playTone(523, 0.4, 'triangle', 0.06, 0.3);    // harmony
}

/** Game over — grand fanfare */
export function playGameOver() {
  playTone(523, 0.15, 'sine', 0.12);            // C5
  playTone(659, 0.15, 'sine', 0.12, 0.12);      // E5
  playTone(784, 0.15, 'sine', 0.12, 0.24);      // G5
  playTone(1047, 0.4, 'sine', 0.15, 0.36);      // C6
  playTone(784, 0.4, 'triangle', 0.06, 0.36);   // harmony
  playTone(1319, 0.5, 'sine', 0.08, 0.5);       // E6 final sparkle
}

/** Button click — subtle tick */
export function playClick() {
  playTone(1000, 0.04, 'square', 0.05);
}

/** Timer warning (<=5s) — urgent beep */
export function playTimerWarning() {
  playTone(880, 0.08, 'square', 0.1);
  playTone(880, 0.08, 'square', 0.1, 0.12);
}
