/**
 * AudioManager — Background music player with categories, shuffle, auto-next.
 * Categories: "opening" (lobby/waiting), "playing" (in-game), "celebration" (game over)
 *
 * Two modes:
 * 1. Auto mode (default): App.tsx switches category based on game phase.
 * 2. Playlist mode: User manually picks a track from playlist modal.
 *    In playlist mode, auto category switching is ignored.
 *    When playlist mode ends, auto mode resumes with the pending category.
 */

export type MusicCategory = "opening" | "playing" | "celebration";

export interface Track {
  id: string;
  name: string;
  category: MusicCategory;
  src: string;
}

// All tracks available
export const ALL_TRACKS: Track[] = [
  // Opening / lobby
  { id: "opening1", name: "Opening 1", category: "opening", src: "/audio/opening1.mp3" },
  { id: "opening2", name: "Opening 2", category: "opening", src: "/audio/opening2.mp3" },
  // In-game / playing
  { id: "playing1", name: "Playing 1", category: "playing", src: "/audio/playing1.mp3" },
  { id: "playing2", name: "Playing 2", category: "playing", src: "/audio/playing2.mp3" },
  { id: "playing3", name: "Playing 3", category: "playing", src: "/audio/playing3.mp3" },
  { id: "playing4", name: "Playing 4", category: "playing", src: "/audio/playing4.mp3" },
  { id: "playing5", name: "Playing 5", category: "playing", src: "/audio/playing5.mp3" },
  { id: "playing6", name: "Playing 6", category: "playing", src: "/audio/playing6.mp3" },
  // Celebration / game over
  { id: "celebration1", name: "Celebration 1", category: "celebration", src: "/audio/celebration1.mp3" },
  { id: "celebration2", name: "Celebration 2", category: "celebration", src: "/audio/celebration2.mp3" },
];

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Listener = () => void;

class AudioManager {
  private audio: HTMLAudioElement | null = null;
  private queue: Track[] = [];
  private queueIndex = 0;
  private _currentTrack: Track | null = null;
  private _volume = 0.5;
  private _muted = false;
  private _playing = false;
  private _currentCategory: MusicCategory | null = null;
  private _playlistMode = false;
  private _pendingCategory: MusicCategory | null = null;
  private listeners = new Set<Listener>();
  private _userInteracted = false;
  private _userPaused = false;

  constructor() {
    // Restore volume & muted from localStorage
    try {
      const savedVol = localStorage.getItem("bgm_volume");
      const savedMuted = localStorage.getItem("bgm_muted");
      if (savedVol !== null) this._volume = Number(savedVol);
      if (savedMuted !== null) this._muted = savedMuted === "true";
    } catch { /* ignore */ }

    // Listen for first user interaction to unlock audio playback
    const onInteract = () => {
      this._userInteracted = true;
      window.removeEventListener("click", onInteract);
      window.removeEventListener("touchstart", onInteract);
      window.removeEventListener("keydown", onInteract);
      // If a category was queued before interaction, play it now
      if (this._pendingCategory && !this._playing && !this._playlistMode) {
        this._currentCategory = null;
        this.playCategory(this._pendingCategory);
      }
    };
    window.addEventListener("click", onInteract);
    window.addEventListener("touchstart", onInteract);
    window.addEventListener("keydown", onInteract);
  }

  /** Subscribe to state changes */
  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  get currentTrack() { return this._currentTrack; }
  get volume() { return this._volume; }
  get muted() { return this._muted; }
  get playing() { return this._playing; }
  get currentCategory() { return this._currentCategory; }
  get playlistMode() { return this._playlistMode; }

  /**
   * Auto mode: play a category (shuffled).
   * If same category already playing, do nothing.
   * If in playlist mode, just remember the pending category.
   */
  playCategory(category: MusicCategory) {
    this._pendingCategory = category;

    if (this._playlistMode) return;
    if (!this._userInteracted) return;
    if (this._userPaused || this._muted) return;
    if (this._currentCategory === category && this._playing) return;

    const tracks = ALL_TRACKS.filter((t) => t.category === category);
    if (tracks.length === 0) return;
    this._currentCategory = category;
    this.queue = shuffle(tracks);
    this.queueIndex = 0;
    this.playTrack(this.queue[0]);
  }

  /**
   * Playlist mode: user picks a track manually.
   */
  playFromPlaylist(track: Track) {
    this._playlistMode = true;
    this._currentCategory = track.category;
    const rest = ALL_TRACKS.filter((t) => t.id !== track.id);
    this.queue = [track, ...shuffle(rest)];
    this.queueIndex = 0;
    this.playTrack(track);
  }

  /**
   * Exit playlist mode: stop playlist music, resume auto category.
   */
  exitPlaylistMode() {
    if (!this._playlistMode) return;
    this._playlistMode = false;
    this.stop();
    this.notify();
    if (this._pendingCategory) {
      const cat = this._pendingCategory;
      this._currentCategory = null;
      this.playCategory(cat);
    }
  }

  private playTrack(track: Track) {
    this.stop();
    this._currentTrack = track;
    this.audio = new Audio(track.src);
    this.audio.volume = this._muted ? 0 : this._volume;
    this.audio.addEventListener("ended", this.handleEnded);
    this.audio.addEventListener("error", this.handleEnded);
    this.audio.play().then(() => {
      this._playing = true;
      this.notify();
    }).catch(() => {
      this._playing = false;
      this.notify();
    });
    this.notify();
  }

  private handleEnded = () => {
    this.queueIndex = (this.queueIndex + 1) % this.queue.length;
    if (this.queueIndex === 0) {
      this.queue = shuffle(this.queue);
    }
    this.playTrack(this.queue[this.queueIndex]);
  };

  stop() {
    if (this.audio) {
      this.audio.removeEventListener("ended", this.handleEnded);
      this.audio.removeEventListener("error", this.handleEnded);
      this.audio.pause();
      this.audio.src = "";
      this.audio = null;
    }
    this._playing = false;
  }

  pause() {
    if (this.audio && this._playing) {
      this.audio.pause();
      this._playing = false;
      this._userPaused = true;
      this.notify();
    }
  }

  resume() {
    if (this.audio && !this._playing) {
      this._userPaused = false;
      this.audio.play().then(() => {
        this._playing = true;
        this.notify();
      }).catch(() => { /* blocked */ });
    }
  }

  togglePlay() {
    if (this._playing) {
      this.pause();
    } else {
      this._userPaused = false;
      if (this._pendingCategory && this._pendingCategory !== this._currentCategory) {
        this._currentCategory = null;
        this.playCategory(this._pendingCategory);
      } else if (this.audio) {
        this.resume();
      } else if (this._pendingCategory) {
        this._currentCategory = null;
        this.playCategory(this._pendingCategory);
      }
    }
  }

  next() {
    if (this.queue.length === 0) return;
    this.queueIndex = (this.queueIndex + 1) % this.queue.length;
    if (this.queueIndex === 0) this.queue = shuffle(this.queue);
    this.playTrack(this.queue[this.queueIndex]);
  }

  setVolume(vol: number) {
    this._volume = Math.max(0, Math.min(1, vol));
    if (this.audio && !this._muted) {
      this.audio.volume = this._volume;
    }
    try { localStorage.setItem("bgm_volume", String(this._volume)); } catch { /* */ }
    this.notify();
  }

  toggleMute() {
    this._muted = !this._muted;
    if (this.audio) {
      this.audio.volume = this._muted ? 0 : this._volume;
    }
    // If unmuting, try to resume or start playback
    if (!this._muted && this._pendingCategory && !this._playing) {
      this._currentCategory = null;
      this.playCategory(this._pendingCategory);
    }
    try { localStorage.setItem("bgm_muted", String(this._muted)); } catch { /* */ }
    this.notify();
  }
}

/** Singleton instance */
export const audioManager = new AudioManager();
