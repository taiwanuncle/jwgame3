import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { io, type Socket } from 'socket.io-client';
import type {
  GameStateFromServer,
  DiceResult,
  RoundResult,
  AvailableRoom,
  RoomOptions,
  ChatMessage,
  PredictionReveal,
  TrickResult,
} from '../types';

// In production, frontend is served by the same server — use current origin
// In dev, connect to localhost:3001
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.PROD
    ? window.location.origin
    : `${window.location.protocol}//${window.location.hostname}:3001`);

const SESSION_KEY = 'yeah_game_session';

interface SavedSession {
  roomCode: string;
  persistentId: string;
}

function saveSession(roomCode: string, persistentId: string) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode, persistentId }));
  } catch { /* ignore */ }
}

function loadSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

export function useSocket() {
  const { t } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const socketRef = useRef<Socket | null>(null);
  const leavingRef = useRef(false);
  const rejoinAttemptedRef = useRef(false);
  const sessionRef = useRef<SavedSession | null>(null);

  const [gameState, setGameState] = useState<GameStateFromServer | null>(null);
  const [diceResult, setDiceResult] = useState<DiceResult | null>(null);
  const [trickResult, setTrickResult] = useState<TrickResult | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const currentRoomRef = useRef<string | null>(null);

  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    // === Connection ===
    socket.on('connect', () => {
      if (!rejoinAttemptedRef.current) {
        rejoinAttemptedRef.current = true;
        const session = loadSession();
        if (session) {
          socket.emit('rejoin_room', {
            roomCode: session.roomCode,
            persistentId: session.persistentId,
          });
        }
      }
    });

    // === Game State ===
    socket.on('game_state', (state: GameStateFromServer) => {
      if (leavingRef.current) return;
      // Ignore stale game_state from a room we already left
      if (currentRoomRef.current && state.roomCode !== currentRoomRef.current) return;
      setGameState(state);

      if (state.phase === 'game_over') {
        clearSession();
      } else if (!loadSession() && sessionRef.current) {
        saveSession(sessionRef.current.roomCode, sessionRef.current.persistentId);
      }
    });

    // === Dice Result ===
    socket.on('dice_result', (result: DiceResult) => {
      if (leavingRef.current) return;
      setDiceResult(result);
    });

    // === Predictions Revealed ===
    socket.on('predictions_revealed', (_reveals: PredictionReveal[]) => {
      // Predictions are shown via gameState update; this event can trigger animations
      // The game state will already have the prediction data
    });

    // === Trick Won ===
    socket.on('trick_won', (result: TrickResult) => {
      if (leavingRef.current) return;
      setTrickResult(result);
    });

    // === Round Result ===
    socket.on('round_result', (result: RoundResult) => {
      if (leavingRef.current) return;
      setRoundResult(result);
    });

    // === Error Message ===
    socket.on('error_msg', ({ message, messageKey }: { message: string; messageKey?: string }) => {
      const msg = messageKey ? tRef.current(messageKey) : message;
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 3000);
    });

    // === Room Created ===
    socket.on('room_created', ({ persistentId, roomCode }: { persistentId: string; roomCode: string }) => {
      leavingRef.current = false;
      currentRoomRef.current = roomCode;
      sessionRef.current = { roomCode, persistentId };
      saveSession(roomCode, persistentId);
    });

    // === Room Joined ===
    socket.on('room_joined', ({ persistentId, roomCode }: { persistentId: string; roomCode: string }) => {
      leavingRef.current = false;
      currentRoomRef.current = roomCode;
      sessionRef.current = { roomCode, persistentId };
      saveSession(roomCode, persistentId);
    });

    // === Rejoin Success ===
    socket.on('rejoin_success', ({ persistentId, roomCode }: { persistentId: string; roomCode: string }) => {
      leavingRef.current = false;
      currentRoomRef.current = roomCode;
      sessionRef.current = { roomCode, persistentId };
      saveSession(roomCode, persistentId);
    });

    // === Rejoin Failed (stale session — room gone or game over) ===
    socket.on('rejoin_failed', () => {
      sessionRef.current = null;
      currentRoomRef.current = null;
      clearSession();
    });

    // === Room Closed (host left during active game) ===
    socket.on('room_closed', () => {
      currentRoomRef.current = null;
      sessionRef.current = null;
      clearSession();
      setGameState(null);
      setDiceResult(null);
      setTrickResult(null);
      setRoundResult(null);
      setChatMessages([]);
      const msg = tRef.current('server.roomClosedHostLeft');
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 4000);
    });

    // === Game Started ===
    socket.on('game_started', () => {
      setRoundResult(null);
      setDiceResult(null);
      setTrickResult(null);
    });

    // === Chat Message ===
    socket.on('chat_message', (msg: ChatMessage) => {
      if (leavingRef.current) return;
      setChatMessages((prev) => [...prev.slice(-49), msg]);
    });

    // === Rooms Updated ===
    socket.on('rooms_updated', (rooms: AvailableRoom[]) => {
      setAvailableRooms(rooms);
    });

    // Request initial room list
    socket.emit('get_rooms');

    return () => {
      socket.disconnect();
    };
  }, []);

  // === Room Management ===
  const createRoom = useCallback((nickname: string, avatarIndex: number, roomOptions: Partial<RoomOptions>) => {
    socketRef.current?.emit('create_room', { nickname, avatarIndex, roomOptions });
  }, []);

  const joinRoom = useCallback((roomCode: string, nickname: string, avatarIndex: number) => {
    socketRef.current?.emit('join_room', { roomCode, nickname, avatarIndex });
  }, []);

  const toggleReady = useCallback(() => {
    socketRef.current?.emit('toggle_ready');
  }, []);

  const setRoomOptions = useCallback((options: Partial<RoomOptions>) => {
    socketRef.current?.emit('set_room_options', options);
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.emit('start_game');
  }, []);

  const leaveRoom = useCallback(() => {
    leavingRef.current = true;
    currentRoomRef.current = null;
    socketRef.current?.emit('leave_room');
    setGameState(null);
    setDiceResult(null);
    setRoundResult(null);
    setChatMessages([]);
    sessionRef.current = null;
    clearSession();
  }, []);

  // === Game Actions ===
  const submitPrediction = useCallback((prediction: number) => {
    socketRef.current?.emit('submit_prediction', { prediction });
  }, []);

  const playCard = useCallback((cardId: string) => {
    socketRef.current?.emit('play_card', { cardId });
  }, []);

  const nextRound = useCallback(() => {
    socketRef.current?.emit('next_round');
    setRoundResult(null);
    setDiceResult(null);
  }, []);

  const playAgain = useCallback(() => {
    socketRef.current?.emit('play_again');
    setRoundResult(null);
    setDiceResult(null);
    setChatMessages([]);
  }, []);

  const sendChat = useCallback((message: string) => {
    socketRef.current?.emit('send_chat', { message });
  }, []);

  const refreshRooms = useCallback(() => {
    socketRef.current?.emit('get_rooms');
  }, []);

  return {
    gameState,
    diceResult,
    trickResult,
    roundResult,
    errorMsg,
    chatMessages,
    availableRooms,
    createRoom,
    joinRoom,
    toggleReady,
    setRoomOptions,
    startGame,
    leaveRoom,
    submitPrediction,
    playCard,
    nextRound,
    playAgain,
    sendChat,
    refreshRooms,
  };
}
