// === Card Types ===
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // e.g. "A_spades"
  value: number;
}

export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export const SUIT_NAMES_KO: Record<Suit, string> = {
  spades: '스페이드',
  hearts: '하트',
  diamonds: '다이아몬드',
  clubs: '클로버',
};

export const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

export const TRUMP_SUIT: Suit = 'hearts';

// === Player ===
export interface Player {
  id: string;
  nickname: string;
  avatarIndex: number;
  ready: boolean;
  isHost: boolean;
  isBot: boolean;
  connected: boolean;
  cardCount: number;
  prediction: number | null;
  predictionSubmitted: boolean;
  tricksWon: number;
  roundScores: number[];
  totalScore: number;
  hand?: Card[]; // Only present for the current player (myId)
}

// === Room Options ===
export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface RoomOptions {
  singlePlayerMode?: boolean;
  botCount?: number;
  botDifficulty?: BotDifficulty;
}

// === Game Phase ===
export type GamePhase =
  | 'waiting'
  | 'dice_roll'
  | 'prediction'
  | 'trick_play'
  | 'trick_result'
  | 'round_scoring'
  | 'game_over';

// === Played Card in Trick ===
export interface PlayedCard {
  playerId: string;
  playerName: string;
  card: Card;
}

// === Dice Roll ===
export interface DiceRollEntry {
  playerId: string;
  playerName: string;
  roll: number;
}

export interface DiceResult {
  rolls: DiceRollEntry[];
  winnerId: string;
  winnerName: string;
}

// === Prediction Reveal ===
export interface PredictionReveal {
  playerId: string;
  playerName: string;
  prediction: number;
}

// === Trick Result ===
export interface TrickResult {
  trickNumber: number;
  cards: PlayedCard[];
  winnerId: string;
  winnerName: string;
  wonByTrump: boolean;
}

// === Round Scoring ===
export interface PlayerRoundScore {
  playerId: string;
  playerName: string;
  prediction: number;
  tricksWon: number;
  roundScore: number;
  totalScore: number;
  correct: boolean;
}

export interface RoundResult {
  round: number;
  cardsDealt: number;
  playerScores: PlayerRoundScore[];
}

// === Action Log ===
export interface ActionLogEntry {
  message: string;
  timestamp: number;
}

// === Game State from Server (personalized) ===
export interface GameState {
  roomCode: string;
  roomOptions: RoomOptions;
  phase: GamePhase;
  players: Player[];
  myId: string;

  // Round info
  currentRound: number;
  totalRounds: number;
  roundSequence: number[];
  cardsThisRound: number;

  // Turn info
  currentTurnPlayerId: string | null;

  // Trick info
  currentTrickNumber: number;
  totalTricksThisRound: number;
  trickCards: PlayedCard[];
  trickLeadSuit: Suit | null;
  trickLeadPlayerId: string | null;

  // Dice
  diceResults: DiceRollEntry[];

  // Timer
  timerEnd: number | null;

  // Action log
  actionLog: ActionLogEntry[];
}

// Legacy alias
export type GameStateFromServer = GameState;

// === Chat ===
export interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

// === Available Room for Lobby ===
export interface AvailableRoom {
  roomCode: string;
  playerCount: number;
  maxPlayers: number;
  phase: string;
  hostName: string;
  botCount: number;
}
