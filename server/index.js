// ============================================================================
// 예(Yeah!!) Card Game Server
// Express 5 + Socket.io 4 — Single-file game server
// ============================================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// ============================================================================
// SERVER SETUP
// ============================================================================

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Serve static files in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// ============================================================================
// CONSTANTS
// ============================================================================

const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUES = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};
const TRUMP_SUIT = 'hearts';

const BOT_PROFILES = [
  { name: '신중한 곰', nameKey: 'bot.cautiousBear', avatarIndex: 0 },
  { name: '도도한 고양이', nameKey: 'bot.proudCat', avatarIndex: 1 },
  { name: '순진한 병아리', nameKey: 'bot.naiveChick', avatarIndex: 2 },
  { name: '충직한 강아지', nameKey: 'bot.loyalDog', avatarIndex: 3 },
  { name: '교활한 여우', nameKey: 'bot.slyFox', avatarIndex: 4 },
  { name: '여유로운 개구리', nameKey: 'bot.relaxedFrog', avatarIndex: 5 },
  { name: '욕심쟁이 햄스터', nameKey: 'bot.greedyHamster', avatarIndex: 6 },
  { name: '졸린 코알라', nameKey: 'bot.sleepyKoala', avatarIndex: 7 },
  { name: '용맹한 사자', nameKey: 'bot.braveLion', avatarIndex: 8 },
  { name: '장난꾸러기 수달', nameKey: 'bot.playfulOtter', avatarIndex: 9 },
  { name: '느긋한 판다', nameKey: 'bot.lazyPanda', avatarIndex: 10 },
  { name: '꼼꼼한 펭귄', nameKey: 'bot.carefulPenguin', avatarIndex: 11 },
  { name: '낙천적인 돼지', nameKey: 'bot.optimisticPig', avatarIndex: 12 },
  { name: '재빠른 토끼', nameKey: 'bot.quickRabbit', avatarIndex: 13 },
  { name: '부지런한 다람쥐', nameKey: 'bot.diligentSquirrel', avatarIndex: 14 },
  { name: '대담한 호랑이', nameKey: 'bot.boldTiger', avatarIndex: 15 },
];
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TURN_TIMER_MS = 30000;
const PREDICTION_TIMER_MS = 20000;
const BOT_DELAY_MIN = 1000;
const BOT_DELAY_RANGE = 1000;
const DISCONNECTED_TIMER_MS = 1000;

const PHASES = {
  WAITING: 'waiting',
  DICE_ROLL: 'dice_roll',
  PREDICTION: 'prediction',
  TRICK_PLAY: 'trick_play',
  TRICK_RESULT: 'trick_result',
  ROUND_SCORING: 'round_scoring',
  GAME_OVER: 'game_over',
};

// ============================================================================
// IN-MEMORY STORAGE
// ============================================================================

const rooms = new Map();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateRoomCode() {
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  if (rooms.has(code)) return generateRoomCode();
  return code;
}

function generateDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: rank + '_' + suit, suit, rank, value: RANK_VALUES[rank] });
    }
  }
  return deck;
}

function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function sortHand(hand) {
  const suitOrder = { spades: 0, hearts: 1, diamonds: 2, clubs: 3 };
  return [...hand].sort((a, b) => {
    if (suitOrder[a.suit] !== suitOrder[b.suit]) return suitOrder[a.suit] - suitOrder[b.suit];
    return b.value - a.value;
  });
}

function buildRoundSequence(numPlayers) {
  const seq = [];
  for (let i = 1; i <= numPlayers; i++) seq.push(i);
  for (let i = numPlayers - 1; i >= 1; i--) seq.push(i);
  return seq;
}

function getPlayerById(room, playerId) {
  return room.players.find(p => p.id === playerId);
}

function getNextPlayerIndex(room, currentPlayerId) {
  const idx = room.players.findIndex(p => p.id === currentPlayerId);
  return (idx + 1) % room.players.length;
}

function getSocketForPlayer(room, playerId) {
  const socketId = room.socketMap[playerId];
  if (!socketId) return null;
  return io.sockets.sockets.get(socketId) || null;
}

function isPlayerConnected(room, playerId) {
  const player = getPlayerById(room, playerId);
  if (!player) return false;
  if (player.isBot) return true;
  return player.connected && !!room.socketMap[playerId];
}

function clearRoomTimer(room) {
  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = null;
  }
  room.timerEnd = null;
}

function addActionLog(room, message, messageKey, params) {
  const entry = { message, timestamp: Date.now() };
  if (messageKey) {
    entry.messageKey = messageKey;
    if (params) entry.params = params;
  }
  room.actionLog.push(entry);
  if (room.actionLog.length > 50) {
    room.actionLog = room.actionLog.slice(-50);
  }
}

function cardToString(card) {
  const suitSymbols = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
  return (suitSymbols[card.suit] || card.suit) + card.rank;
}

// ============================================================================
// CARD LOGIC
// ============================================================================

function getValidCards(hand, leadSuit) {
  if (!leadSuit) return hand;
  const followCards = hand.filter(c => c.suit === leadSuit);
  if (followCards.length > 0) return followCards;
  return hand;
}

function determineTrickWinner(trickCards, leadSuit) {
  const trumpCards = trickCards.filter(tc => tc.card.suit === TRUMP_SUIT);
  const leadSuitCards = trickCards.filter(tc => tc.card.suit === leadSuit);

  let winner;
  let wonByTrump = false;

  if (trumpCards.length > 0) {
    winner = trumpCards.reduce((best, tc) => tc.card.value > best.card.value ? tc : best);
    wonByTrump = leadSuit !== TRUMP_SUIT;
  } else {
    winner = leadSuitCards.reduce((best, tc) => tc.card.value > best.card.value ? tc : best);
    wonByTrump = false;
  }

  return { winnerId: winner.playerId, winnerName: winner.playerName, wonByTrump };
}

// ============================================================================
// ROOM CREATION & MANAGEMENT
// ============================================================================

function createRoom(hostId, hostNickname, hostAvatarIndex, roomOptions) {
  const roomCode = generateRoomCode();
  const room = {
    roomCode,
    roomOptions: {
      singlePlayerMode: (roomOptions && roomOptions.singlePlayerMode) || false,
      botCount: (roomOptions && roomOptions.botCount) || 0,
      botDifficulty: (roomOptions && roomOptions.botDifficulty) || 'medium',
    },
    players: [{
      id: hostId,
      nickname: hostNickname,
      avatarIndex: hostAvatarIndex || 0,
      ready: false,
      isHost: true,
      isBot: false,
      connected: true,
      hand: [],
      prediction: null,
      predictionSubmitted: false,
      tricksWon: 0,
      roundScores: [],
      totalScore: 0,
    }],
    socketMap: {},
    phase: PHASES.WAITING,
    currentRound: 0,
    totalRounds: 0,
    roundSequence: [],
    cardsThisRound: 0,
    firstRoundLeadIndex: null,
    currentRoundLeadIndex: null,
    currentTurnPlayerId: null,
    currentTrickNumber: 0,
    totalTricksThisRound: 0,
    trickCards: [],
    trickLeadSuit: null,
    trickLeadPlayerId: null,
    diceResults: [],
    timerEnd: null,
    turnTimer: null,
    actionLog: [],
  };
  rooms.set(roomCode, room);
  return room;
}

function addBots(room) {
  const botCount = room.roomOptions.botCount || 0;
  const usedAvatars = new Set(room.players.map(p => p.avatarIndex));
  const available = BOT_PROFILES.filter(b => !usedAvatars.has(b.avatarIndex));
  // Fisher-Yates shuffle
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  for (let i = 0; i < botCount && i < available.length; i++) {
    const profile = available[i];
    room.players.push({
      id: 'bot_' + uuidv4(),
      nickname: profile.name,
      botNameKey: profile.nameKey,
      avatarIndex: profile.avatarIndex,
      ready: true,
      isHost: false,
      isBot: true,
      connected: true,
      hand: [],
      prediction: null,
      predictionSubmitted: false,
      tricksWon: 0,
      roundScores: [],
      totalScore: 0,
    });
  }
}

function removeBotsFromRoom(room) {
  room.players = room.players.filter(p => !p.isBot);
}

// ============================================================================
// EMIT FUNCTIONS
// ============================================================================

function emitPersonalStates(room) {
  for (const player of room.players) {
    if (player.isBot) continue;
    const sock = getSocketForPlayer(room, player.id);
    if (!sock) continue;
    const state = buildPersonalState(room, player.id);
    sock.emit('game_state', state);
  }
}

function buildPersonalState(room, playerId) {
  const players = room.players.map(p => {
    const pData = {
      id: p.id,
      nickname: p.nickname,
      avatarIndex: p.avatarIndex,
      ready: p.ready,
      isHost: p.isHost,
      isBot: p.isBot,
      botNameKey: p.botNameKey || undefined,
      connected: p.connected,
      prediction: p.predictionSubmitted ? p.prediction : null,
      predictionSubmitted: p.predictionSubmitted,
      tricksWon: p.tricksWon,
      roundScores: p.roundScores,
      totalScore: p.totalScore,
      cardCount: p.hand.length,
    };
    if (p.id === playerId) {
      pData.hand = sortHand(p.hand);
    }
    return pData;
  });

  return {
    roomCode: room.roomCode,
    roomOptions: room.roomOptions,
    phase: room.phase,
    players,
    myId: playerId,
    currentRound: room.currentRound,
    totalRounds: room.totalRounds,
    roundSequence: room.roundSequence,
    cardsThisRound: room.cardsThisRound,
    currentTurnPlayerId: room.currentTurnPlayerId,
    currentTrickNumber: room.currentTrickNumber,
    totalTricksThisRound: room.totalTricksThisRound,
    trickCards: room.trickCards,
    trickLeadSuit: room.trickLeadSuit,
    trickLeadPlayerId: room.trickLeadPlayerId,
    roundLeadPlayerId: room.currentRoundLeadIndex != null
      ? room.players[room.currentRoundLeadIndex]?.id || null
      : null,
    diceResults: room.diceResults,
    timerEnd: room.timerEnd,
    actionLog: room.actionLog.slice(-20),
  };
}

function emitToRoom(room, event, data) {
  for (const player of room.players) {
    if (player.isBot) continue;
    const sock = getSocketForPlayer(room, player.id);
    if (sock) sock.emit(event, data);
  }
}

function emitRoomsUpdate() {
  const roomList = [];
  for (const [code, room] of rooms) {
    roomList.push({
      roomCode: code,
      playerCount: room.players.filter(p => !p.isBot).length,
      maxPlayers: 7,
      phase: room.phase,
      hostName: (room.players.find(p => p.isHost) || {}).nickname || '???',
      botCount: room.players.filter(p => p.isBot).length,
    });
  }
  io.emit('rooms_updated', roomList);
}

// ============================================================================
// GAME FLOW
// ============================================================================

function startGame(room) {
  const numPlayers = room.players.length;
  if (numPlayers < 3 || numPlayers > 7) return;

  room.roundSequence = buildRoundSequence(numPlayers);
  room.totalRounds = room.roundSequence.length;
  room.currentRound = 0;
  room.diceResults = [];
  room.actionLog = [];

  for (const p of room.players) {
    p.roundScores = [];
    p.totalScore = 0;
  }

  addActionLog(room, '게임이 시작되었습니다!', 'server.gameStarted');
  startDiceRoll(room);
}

// ----- DICE ROLL PHASE -----

function startDiceRoll(room) {
  room.phase = PHASES.DICE_ROLL;
  room.diceResults = [];

  // Round 1: all players roll
  let candidates = room.players.map(p => ({
    playerId: p.id,
    playerName: p.nickname,
    avatarIndex: p.avatarIndex ?? 0,
    roll: Math.floor(Math.random() * 6) + 1,
  }));

  const rounds = [{ rolls: candidates.map(c => ({ ...c })) }];

  while (true) {
    const maxRoll = Math.max(...candidates.map(c => c.roll));
    const winners = candidates.filter(c => c.roll === maxRoll);

    if (winners.length === 1) {
      // Single winner found
      const winnerId = winners[0].playerId;
      room.firstRoundLeadIndex = room.players.findIndex(p => p.id === winnerId);
      room.diceResults = rounds[0].rolls;

      addActionLog(room, '주사위 결과: ' + winners[0].playerName + '님이 선 플레이어!', 'server.diceResult', { name: winners[0].playerName });

      emitToRoom(room, 'dice_result', {
        rounds,
        winnerId,
        winnerName: winners[0].playerName,
      });
      emitPersonalStates(room);

      // Wait for client animations: ~4s per round + 2s for winner announce
      const waitMs = rounds.length * 4000 + 2000;
      setTimeout(() => {
        if (room.phase === PHASES.DICE_ROLL) {
          startNextRound(room);
        }
      }, waitMs);
      return;
    }

    // Tie — re-roll only tied players
    for (const w of winners) {
      w.roll = Math.floor(Math.random() * 6) + 1;
    }
    candidates = winners;
    rounds.push({ rolls: candidates.map(c => ({ ...c })) });
  }
}

// ----- ROUND MANAGEMENT -----

function startNextRound(room) {
  room.currentRound++;
  if (room.currentRound > room.totalRounds) {
    endGame(room);
    return;
  }

  room.cardsThisRound = room.roundSequence[room.currentRound - 1];
  room.currentTrickNumber = 0;
  room.totalTricksThisRound = room.cardsThisRound;
  room.trickCards = [];
  room.trickLeadSuit = null;
  room.trickLeadPlayerId = null;

  if (room.currentRound === 1) {
    room.currentRoundLeadIndex = room.firstRoundLeadIndex;
  } else {
    room.currentRoundLeadIndex =
      (room.firstRoundLeadIndex + (room.currentRound - 1)) % room.players.length;
  }

  for (const p of room.players) {
    p.prediction = null;
    p.predictionSubmitted = false;
    p.tricksWon = 0;
    p.hand = [];
  }

  const deck = shuffleDeck(generateDeck());
  const numPlayers = room.players.length;
  for (let c = 0; c < room.cardsThisRound; c++) {
    for (let p = 0; p < numPlayers; p++) {
      room.players[p].hand.push(deck[c * numPlayers + p]);
    }
  }

  addActionLog(room,
    '라운드 ' + room.currentRound + '/' + room.totalRounds +
    ' 시작! (' + room.cardsThisRound + '장씩 배분)',
    'server.roundStart', { current: room.currentRound, total: room.totalRounds, cards: room.cardsThisRound }
  );

  startPredictionPhase(room);
}

// ----- PREDICTION PHASE -----

function startPredictionPhase(room) {
  room.phase = PHASES.PREDICTION;
  room.timerEnd = Date.now() + PREDICTION_TIMER_MS;

  emitPersonalStates(room);

  // Schedule bot predictions
  for (const p of room.players) {
    if (p.isBot) {
      const botRef = p;
      const delay = BOT_DELAY_MIN + Math.random() * BOT_DELAY_RANGE;
      setTimeout(() => {
        if (room.phase === PHASES.PREDICTION && !botRef.predictionSubmitted) {
          const pred = botPrediction(room, botRef);
          submitPlayerPrediction(room, botRef.id, pred);
        }
      }, delay);
    }
  }

  clearRoomTimer(room);
  room.turnTimer = setTimeout(() => {
    if (room.phase !== PHASES.PREDICTION) return;
    for (const p of room.players) {
      if (!p.predictionSubmitted) {
        p.prediction = 0;
        p.predictionSubmitted = true;
        addActionLog(room, p.nickname + '님의 예측: 시간 초과 (0으로 자동 제출)', 'server.predTimeout', { name: p.nickname });
      }
    }
    revealPredictions(room);
  }, PREDICTION_TIMER_MS);
}

function submitPlayerPrediction(room, playerId, prediction) {
  if (room.phase !== PHASES.PREDICTION) return;

  const player = getPlayerById(room, playerId);
  if (!player) return;
  if (player.predictionSubmitted) return;

  const pred = Math.max(0, Math.min(room.cardsThisRound, Math.floor(prediction)));
  player.prediction = pred;
  player.predictionSubmitted = true;

  addActionLog(room, player.nickname + '님이 예측을 제출했습니다.', 'server.predSubmitted', { name: player.nickname });
  emitPersonalStates(room);

  const allSubmitted = room.players.every(p => p.predictionSubmitted);
  if (allSubmitted) {
    clearRoomTimer(room);
    revealPredictions(room);
  }
}

function revealPredictions(room) {
  const predictions = room.players.map(p => ({
    playerId: p.id,
    playerName: p.nickname,
    prediction: p.prediction,
  }));

  emitToRoom(room, 'predictions_revealed', { predictions });
  addActionLog(room,
    '예측 공개: ' +
    predictions.map(p => p.playerName + '(' + p.prediction + ')').join(', '),
    'server.predsRevealed', { details: predictions.map(p => p.playerName + '(' + p.prediction + ')').join(', ') }
  );

  setTimeout(() => {
    if (room.phase === PHASES.PREDICTION) {
      startNextTrick(room);
    }
  }, 2500);
}

// ----- TRICK PLAY PHASE -----

function startNextTrick(room) {
  room.currentTrickNumber++;
  room.trickCards = [];
  room.trickLeadSuit = null;
  room.phase = PHASES.TRICK_PLAY;

  if (room.currentTrickNumber === 1) {
    room.trickLeadPlayerId = room.players[room.currentRoundLeadIndex].id;
  }

  room.currentTurnPlayerId = room.trickLeadPlayerId;

  addActionLog(room,
    '트릭 ' + room.currentTrickNumber + '/' + room.totalTricksThisRound + ' 시작',
    'server.trickStart', { current: room.currentTrickNumber, total: room.totalTricksThisRound }
  );

  emitPersonalStates(room);
  startTurnTimer(room);
}

function startTurnTimer(room) {
  clearRoomTimer(room);

  const currentPlayer = getPlayerById(room, room.currentTurnPlayerId);
  if (!currentPlayer) return;

  if (currentPlayer.isBot) {
    const botRef = currentPlayer;
    const delay = BOT_DELAY_MIN + Math.random() * BOT_DELAY_RANGE;
    room.turnTimer = setTimeout(() => {
      if (room.phase === PHASES.TRICK_PLAY && room.currentTurnPlayerId === botRef.id) {
        const card = botPlayCard(room, botRef);
        playCard(room, botRef.id, card.id);
      }
    }, delay);
    return;
  }

  const connected = isPlayerConnected(room, currentPlayer.id);
  const timerMs = connected ? TURN_TIMER_MS : DISCONNECTED_TIMER_MS;
  room.timerEnd = Date.now() + timerMs;
  emitPersonalStates(room);

  const playerRef = currentPlayer;
  room.turnTimer = setTimeout(() => {
    if (room.phase === PHASES.TRICK_PLAY && room.currentTurnPlayerId === playerRef.id) {
      const validCards = getValidCards(playerRef.hand, room.trickLeadSuit);
      if (validCards.length > 0) {
        addActionLog(room, playerRef.nickname + '님 시간 초과! 자동 카드 제출.', 'server.turnTimeout', { name: playerRef.nickname });
        playCard(room, playerRef.id, validCards[0].id);
      }
    }
  }, timerMs);
}

function playCard(room, playerId, cardId) {
  if (room.phase !== PHASES.TRICK_PLAY) return;
  if (room.currentTurnPlayerId !== playerId) return;

  const player = getPlayerById(room, playerId);
  if (!player) return;

  const cardIndex = player.hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) return;

  const card = player.hand[cardIndex];

  // Validate: must follow lead suit if possible
  if (room.trickLeadSuit) {
    const hasLeadSuit = player.hand.some(c => c.suit === room.trickLeadSuit);
    if (hasLeadSuit && card.suit !== room.trickLeadSuit) {
      const sock = getSocketForPlayer(room, playerId);
      if (sock) sock.emit('error_msg', { message: '리드 수트를 따라야 합니다!', messageKey: 'server.mustFollowLead' });
      return;
    }
  }

  player.hand.splice(cardIndex, 1);

  if (room.trickCards.length === 0) {
    room.trickLeadSuit = card.suit;
  }

  room.trickCards.push({
    playerId: player.id,
    playerName: player.nickname,
    card,
  });

  addActionLog(room, player.nickname + '님이 ' + cardToString(card) + '를 냈습니다.', 'server.cardPlayed', { name: player.nickname, card: cardToString(card) });
  clearRoomTimer(room);

  if (room.trickCards.length === room.players.length) {
    resolveTrick(room);
    return;
  }

  const nextIdx = getNextPlayerIndex(room, playerId);
  room.currentTurnPlayerId = room.players[nextIdx].id;

  emitPersonalStates(room);
  startTurnTimer(room);
}

// ----- TRICK RESOLUTION -----

function resolveTrick(room) {
  room.phase = PHASES.TRICK_RESULT;
  clearRoomTimer(room);

  const { winnerId, winnerName, wonByTrump } = determineTrickWinner(room.trickCards, room.trickLeadSuit);

  const winner = getPlayerById(room, winnerId);
  if (winner) winner.tricksWon++;

  addActionLog(room,
    winnerName + '님이 트릭 ' + room.currentTrickNumber +
    '을 이겼습니다!' + (wonByTrump ? ' (트럼프!)' : ''),
    'server.trickWon', { name: winnerName, trick: room.currentTrickNumber, trump: wonByTrump ? ' (트럼프!)' : '' }
  );

  const trickResult = {
    trickNumber: room.currentTrickNumber,
    cards: room.trickCards,
    winnerId,
    winnerName,
    wonByTrump,
  };

  emitToRoom(room, 'trick_won', trickResult);
  emitPersonalStates(room);

  setTimeout(() => {
    if (room.phase !== PHASES.TRICK_RESULT) return;
    if (room.currentTrickNumber >= room.totalTricksThisRound) {
      scoreRound(room);
    } else {
      // 선 플레이어가 라운드 끝까지 계속 리드
      room.trickLeadPlayerId = room.players[room.currentRoundLeadIndex].id;
      startNextTrick(room);
    }
  }, 2000);
}

// ----- ROUND SCORING -----

function scoreRound(room) {
  room.phase = PHASES.ROUND_SCORING;
  clearRoomTimer(room);

  const playerScores = room.players.map(p => {
    let roundScore = 0;
    if (p.prediction === p.tricksWon) {
      roundScore = 10 + p.tricksWon;
    }
    p.roundScores.push(roundScore);
    p.totalScore += roundScore;

    return {
      playerId: p.id,
      playerName: p.nickname,
      prediction: p.prediction,
      tricksWon: p.tricksWon,
      roundScore,
      totalScore: p.totalScore,
      correct: p.prediction === p.tricksWon,
    };
  });

  addActionLog(room,
    '라운드 ' + room.currentRound + ' 결과: ' +
    playerScores.map(ps =>
      ps.playerName + '(' + (ps.correct ? '성공' : '실패') + ': +' + ps.roundScore + ')'
    ).join(', '),
    'server.roundResult', { round: room.currentRound, details: playerScores.map(ps => ps.playerName + '(' + (ps.correct ? '✓' : '✗') + ': +' + ps.roundScore + ')').join(', ') }
  );

  const roundResult = {
    round: room.currentRound,
    cardsDealt: room.cardsThisRound,
    playerScores,
  };

  emitToRoom(room, 'round_result', roundResult);
  emitPersonalStates(room);

  // Auto-advance if only bots remain connected
  const connectedHumans = room.players.filter(p => !p.isBot && p.connected);
  if (connectedHumans.length === 0) {
    setTimeout(() => advanceAfterScoring(room), 2000);
  }
}

function advanceAfterScoring(room) {
  if (room.phase !== PHASES.ROUND_SCORING) return;
  if (room.currentRound >= room.totalRounds) {
    endGame(room);
  } else {
    startNextRound(room);
  }
}

// ----- GAME OVER -----

function endGame(room) {
  room.phase = PHASES.GAME_OVER;
  clearRoomTimer(room);

  const maxScore = Math.max(...room.players.map(p => p.totalScore));
  const winners = room.players.filter(p => p.totalScore === maxScore).map(p => p.nickname);

  addActionLog(room,
    '게임 종료! 우승: ' + winners.join(', ') + ' (' + maxScore + '점)',
    'server.gameOver', { winners: winners.join(', '), score: maxScore }
  );

  emitPersonalStates(room);
}

// ============================================================================
// BOT AI
// ============================================================================

function botPrediction(room, bot) {
  const difficulty = room.roomOptions.botDifficulty || 'medium';
  const hand = bot.hand;
  const cardsThisRound = room.cardsThisRound;
  const numPlayers = room.players.length;

  if (difficulty === 'easy') {
    const avg = cardsThisRound / numPlayers;
    const pred = Math.round(avg + (Math.random() * 2 - 1));
    return Math.max(0, Math.min(cardsThisRound, pred));
  }

  // Medium: count high cards
  let estimate = 0;
  for (const card of hand) {
    if (card.suit === TRUMP_SUIT) {
      estimate += 0.5;
      if (card.value >= 12) estimate += 0.3;
    } else if (card.value === 14) {
      estimate += 0.7;
    } else if (card.value === 13) {
      estimate += 0.6;
    } else if (card.value === 12) {
      estimate += 0.4;
    }
  }

  if (difficulty === 'hard') {
    // Long suit bonus
    const suitCounts = {};
    for (const card of hand) {
      suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
    }
    for (const suit of Object.keys(suitCounts)) {
      if (suitCounts[suit] >= 3 && suit !== TRUMP_SUIT) {
        estimate += 0.3;
      }
    }
    // Void bonus
    const heartsCount = suitCounts[TRUMP_SUIT] || 0;
    const nonTrumpSuits = SUITS.filter(s => s !== TRUMP_SUIT);
    for (const suit of nonTrumpSuits) {
      if (!suitCounts[suit] && heartsCount > 0) {
        estimate += 0.4;
      }
    }
  }

  const pred = Math.round(estimate);
  return Math.max(0, Math.min(cardsThisRound, pred));
}

function botPlayCard(room, bot) {
  const difficulty = room.roomOptions.botDifficulty || 'medium';
  const hand = bot.hand;
  const validCards = getValidCards(hand, room.trickLeadSuit);

  if (validCards.length === 1) return validCards[0];

  if (difficulty === 'easy') {
    return validCards[Math.floor(Math.random() * validCards.length)];
  }

  const needMoreTricks = bot.tricksWon < bot.prediction;
  const sorted = [...validCards].sort((a, b) => a.value - b.value);
  const sortedDesc = [...validCards].sort((a, b) => b.value - a.value);

  if (difficulty === 'medium') {
    if (room.trickCards.length === 0) {
      return needMoreTricks ? sortedDesc[0] : sorted[0];
    }
    return needMoreTricks ? sortedDesc[0] : sorted[0];
  }

  // Hard difficulty
  if (room.trickCards.length === 0) {
    if (needMoreTricks) {
      const nonTrumpHigh = sortedDesc.find(c => c.suit !== TRUMP_SUIT && c.value >= 12);
      return nonTrumpHigh || sortedDesc[0];
    } else {
      const suitCounts = {};
      for (const c of hand) {
        suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
      }
      const shortSuitCards = sorted.filter(c => c.suit !== TRUMP_SUIT && (suitCounts[c.suit] || 0) <= 2);
      return shortSuitCards[0] || sorted[0];
    }
  }

  // Following in hard mode
  const currentWinning = getCurrentWinningCard(room.trickCards, room.trickLeadSuit);

  if (needMoreTricks) {
    const winningCards = validCards.filter(c => canBeatCard(c, currentWinning, room.trickLeadSuit));
    if (winningCards.length > 0) {
      winningCards.sort((a, b) => a.value - b.value);
      return winningCards[0];
    }
    return sorted[0];
  } else {
    const losingCards = validCards.filter(c => !canBeatCard(c, currentWinning, room.trickLeadSuit));
    if (losingCards.length > 0) {
      losingCards.sort((a, b) => b.value - a.value);
      return losingCards[0];
    }
    return sorted[0];
  }
}

function getCurrentWinningCard(trickCards, leadSuit) {
  if (trickCards.length === 0) return null;

  const trumpCards = trickCards.filter(tc => tc.card.suit === TRUMP_SUIT);
  if (trumpCards.length > 0) {
    return trumpCards.reduce((best, tc) => tc.card.value > best.card.value ? tc : best).card;
  }

  const leadCards = trickCards.filter(tc => tc.card.suit === leadSuit);
  if (leadCards.length > 0) {
    return leadCards.reduce((best, tc) => tc.card.value > best.card.value ? tc : best).card;
  }

  return trickCards[0].card;
}

function canBeatCard(myCard, currentWinning, leadSuit) {
  if (!currentWinning) return true;

  if (currentWinning.suit === TRUMP_SUIT) {
    return myCard.suit === TRUMP_SUIT && myCard.value > currentWinning.value;
  }

  if (myCard.suit === TRUMP_SUIT) return true;
  if (myCard.suit === leadSuit) return myCard.value > currentWinning.value;
  return false;
}

// ============================================================================
// SOCKET.IO CONNECTION HANDLING
// ============================================================================

io.on('connection', (socket) => {
  let currentPlayerId = null;
  let currentRoomCode = null;

  // ----- ROOM MANAGEMENT -----

  socket.on('get_rooms', () => {
    const roomList = [];
    for (const [code, room] of rooms) {
      if (room.phase === PHASES.WAITING) {
        roomList.push({
          roomCode: code,
          playerCount: room.players.filter(p => !p.isBot).length,
          maxPlayers: 7,
          phase: room.phase,
          hostName: (room.players.find(p => p.isHost) || {}).nickname || '???',
          botCount: room.players.filter(p => p.isBot).length,
        });
      }
    }
    socket.emit('rooms_updated', roomList);
  });

  socket.on('create_room', (data) => {
    const { persistentId, nickname, avatarIndex, roomOptions } = data;
    const playerId = persistentId || uuidv4();
    const room = createRoom(playerId, nickname, avatarIndex || 0, roomOptions);

    room.socketMap[playerId] = socket.id;
    currentPlayerId = playerId;
    currentRoomCode = room.roomCode;
    socket.join(room.roomCode);

    socket.emit('room_created', { roomCode: room.roomCode, persistentId: playerId });
    emitPersonalStates(room);
    emitRoomsUpdate();

    // Single player mode: add bots and auto-start
    if (room.roomOptions.singlePlayerMode) {
      addBots(room);
      emitPersonalStates(room);
      if (room.players.length >= 3) {
        setTimeout(() => {
          if (room.phase === PHASES.WAITING) {
            emitToRoom(room, 'game_started', { roomCode: room.roomCode });
            startGame(room);
          }
        }, 1000);
      }
    }
  });

  socket.on('join_room', (data) => {
    const { roomCode, persistentId, nickname, avatarIndex } = data;
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('error_msg', { message: '방을 찾을 수 없습니다.', messageKey: 'server.roomNotFound' });
      return;
    }
    if (room.phase !== PHASES.WAITING) {
      socket.emit('error_msg', { message: '이미 게임이 진행 중입니다.', messageKey: 'server.gameInProgress' });
      return;
    }
    if (room.players.length >= 7) {
      socket.emit('error_msg', { message: '방이 가득 찼습니다.', messageKey: 'server.roomFull' });
      return;
    }

    // Reconnect check
    const existing = room.players.find(p => p.id === persistentId);
    if (existing) {
      existing.connected = true;
      existing.nickname = nickname || existing.nickname;
      if (avatarIndex !== undefined) existing.avatarIndex = avatarIndex;
      room.socketMap[persistentId] = socket.id;
      currentPlayerId = persistentId;
      currentRoomCode = roomCode;
      socket.join(roomCode);
      socket.emit('room_joined', { roomCode, persistentId });
      emitPersonalStates(room);
      emitRoomsUpdate();
      return;
    }

    const playerId = persistentId || uuidv4();
    room.players.push({
      id: playerId,
      nickname: nickname || ('Player' + (room.players.length + 1)),
      avatarIndex: avatarIndex || 0,
      ready: false, isHost: false, isBot: false, connected: true,
      hand: [], prediction: null, predictionSubmitted: false,
      tricksWon: 0, roundScores: [], totalScore: 0,
    });

    room.socketMap[playerId] = socket.id;
    currentPlayerId = playerId;
    currentRoomCode = roomCode;
    socket.join(roomCode);

    addActionLog(room, nickname + '님이 방에 참가했습니다.', 'server.playerJoined', { name: nickname });
    socket.emit('room_joined', { roomCode, persistentId: playerId });
    emitPersonalStates(room);
    emitRoomsUpdate();
  });

  socket.on('rejoin_room', (data) => {
    const { roomCode, persistentId } = data;
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('rejoin_failed');
      return;
    }

    // Don't rejoin a game that's already over
    if (room.phase === PHASES.GAME_OVER) {
      socket.emit('rejoin_failed');
      return;
    }

    const player = room.players.find(p => p.id === persistentId);
    if (!player) {
      socket.emit('rejoin_failed');
      return;
    }

    player.connected = true;
    room.socketMap[persistentId] = socket.id;
    currentPlayerId = persistentId;
    currentRoomCode = roomCode;
    socket.join(roomCode);

    addActionLog(room, player.nickname + '님이 재접속했습니다.', 'server.playerReconnected', { name: player.nickname });
    socket.emit('rejoin_success', { roomCode, persistentId });
    emitPersonalStates(room);

    if (room.phase === PHASES.TRICK_PLAY && room.currentTurnPlayerId === persistentId) {
      startTurnTimer(room);
    }
  });

  socket.on('toggle_ready', () => {
    if (!currentRoomCode || !currentPlayerId) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    const player = getPlayerById(room, currentPlayerId);
    if (!player || player.isHost) return;
    player.ready = !player.ready;
    emitPersonalStates(room);
  });

  socket.on('set_room_options', (data) => {
    if (!currentRoomCode || !currentPlayerId) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    const player = getPlayerById(room, currentPlayerId);
    if (!player || !player.isHost) return;
    if (room.phase !== PHASES.WAITING) return;

    if (data.botCount !== undefined) {
      room.roomOptions.botCount = Math.max(0, Math.min(6, data.botCount));
    }
    if (data.botDifficulty !== undefined) {
      room.roomOptions.botDifficulty = data.botDifficulty;
    }
    if (data.singlePlayerMode !== undefined) {
      room.roomOptions.singlePlayerMode = data.singlePlayerMode;
    }

    removeBotsFromRoom(room);
    addBots(room);
    emitPersonalStates(room);
    emitRoomsUpdate();
  });

  socket.on('start_game', () => {
    if (!currentRoomCode || !currentPlayerId) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    const player = getPlayerById(room, currentPlayerId);
    if (!player || !player.isHost) return;
    if (room.phase !== PHASES.WAITING) return;

    removeBotsFromRoom(room);
    addBots(room);

    const totalPlayers = room.players.length;
    if (totalPlayers < 3 || totalPlayers > 7) {
      socket.emit('error_msg', { message: '3~7명의 플레이어가 필요합니다.', messageKey: 'server.needPlayers' });
      return;
    }

    const humanNonHost = room.players.filter(p => !p.isBot && !p.isHost);
    const allReady = humanNonHost.every(p => p.ready);
    if (!allReady && humanNonHost.length > 0) {
      socket.emit('error_msg', { message: '모든 플레이어가 준비되지 않았습니다.', messageKey: 'server.notAllReady' });
      return;
    }

    emitToRoom(room, 'game_started', { roomCode: room.roomCode });
    startGame(room);
  });

  socket.on('leave_room', () => {
    handleLeaveRoom(socket, currentPlayerId, currentRoomCode);
    currentPlayerId = null;
    currentRoomCode = null;
  });

  // ----- GAME EVENTS -----

  socket.on("submit_prediction", (data) => {
    if (!currentRoomCode || !currentPlayerId) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    submitPlayerPrediction(room, currentPlayerId, data.prediction);
  });

  socket.on("play_card", (data) => {
    if (!currentRoomCode || !currentPlayerId) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    playCard(room, currentPlayerId, data.cardId);
  });

  socket.on("next_round", () => {
    if (!currentRoomCode || !currentPlayerId) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    if (room.phase !== PHASES.ROUND_SCORING) return;
    advanceAfterScoring(room);
  });

  socket.on("play_again", () => {
    if (!currentRoomCode || !currentPlayerId) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    if (room.phase !== PHASES.GAME_OVER) return;

    const player = getPlayerById(room, currentPlayerId);
    if (!player || !player.isHost) return;

    room.phase = PHASES.WAITING;
    room.currentRound = 0;
    room.totalRounds = 0;
    room.roundSequence = [];
    room.cardsThisRound = 0;
    room.currentTrickNumber = 0;
    room.totalTricksThisRound = 0;
    room.trickCards = [];
    room.trickLeadSuit = null;
    room.trickLeadPlayerId = null;
    room.currentTurnPlayerId = null;
    room.firstRoundLeadIndex = null;
    room.currentRoundLeadIndex = null;
    room.diceResults = [];
    room.timerEnd = null;
    room.actionLog = [];
    clearRoomTimer(room);

    for (const p of room.players) {
      p.hand = [];
      p.prediction = null;
      p.predictionSubmitted = false;
      p.tricksWon = 0;
      p.roundScores = [];
      p.totalScore = 0;
      p.ready = p.isHost || p.isBot;
    }

    addActionLog(room, "게임이 초기화되었습니다. 다시 시작할 수 있습니다.", 'server.gameReset');
    emitPersonalStates(room);
    emitRoomsUpdate();
  });
  // ----- CHAT -----

  socket.on("send_chat", (data) => {
    if (!currentRoomCode || !currentPlayerId) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    const player = getPlayerById(room, currentPlayerId);
    if (!player) return;

    emitToRoom(room, "chat_message", {
      playerId: currentPlayerId,
      playerName: player.nickname,
      message: data.message,
      timestamp: Date.now(),
    });
  });

  // ----- DISCONNECT -----

  socket.on("disconnect", () => {
    if (!currentRoomCode || !currentPlayerId) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const player = getPlayerById(room, currentPlayerId);
    if (!player) return;

    player.connected = false;
    delete room.socketMap[currentPlayerId];

    addActionLog(room, player.nickname + "님의 연결이 끊겼습니다.", 'server.playerDisconnected', { name: player.nickname });
    emitPersonalStates(room);

    if (room.phase === PHASES.TRICK_PLAY && room.currentTurnPlayerId === currentPlayerId) {
      startTurnTimer(room);
    }

    if (room.phase === PHASES.WAITING) {
      handleLeaveRoom(socket, currentPlayerId, currentRoomCode);
    }

    // Clean up room if all humans disconnected
    const roomCodeCopy = currentRoomCode;
    const allDisconnected = room.players
      .filter(p => !p.isBot)
      .every(p => !p.connected);

    if (allDisconnected) {
      setTimeout(() => {
        const r = rooms.get(roomCodeCopy);
        if (!r) return;
        const stillAllDisconnected = r.players
          .filter(p => !p.isBot)
          .every(p => !p.connected);
        if (stillAllDisconnected) {
          clearRoomTimer(r);
          rooms.delete(roomCodeCopy);
          emitRoomsUpdate();
        }
      }, 60000);
    }
  });
});
// ============================================================================
// LEAVE ROOM HANDLER
// ============================================================================

function handleLeaveRoom(socket, playerId, roomCode) {
  if (!roomCode || !playerId) return;
  const room = rooms.get(roomCode);
  if (!room) return;

  const playerIdx = room.players.findIndex(p => p.id === playerId);
  if (playerIdx === -1) return;

  const player = room.players[playerIdx];
  const wasHost = player.isHost;
  const isActiveGame = room.phase !== PHASES.WAITING && room.phase !== PHASES.GAME_OVER;

  // If host leaves during an active game, end the game for everyone
  if (wasHost && isActiveGame) {
    clearRoomTimer(room);
    // Notify all remaining players that the room is closed
    emitToRoom(room, 'room_closed', { reason: 'host_left' });
    // Remove all players from socket room
    for (const p of room.players) {
      if (p.isBot) continue;
      const sock = getSocketForPlayer(room, p.id);
      if (sock) sock.leave(roomCode);
    }
    socket.leave(roomCode);
    rooms.delete(roomCode);
    emitRoomsUpdate();
    return;
  }

  room.players.splice(playerIdx, 1);
  delete room.socketMap[playerId];
  socket.leave(roomCode);

  addActionLog(room, player.nickname + "님이 방을 나갔습니다.", 'server.playerLeft', { name: player.nickname });

  const humanPlayers = room.players.filter(p => !p.isBot);
  if (humanPlayers.length === 0) {
    clearRoomTimer(room);
    rooms.delete(roomCode);
    emitRoomsUpdate();
    return;
  }

  if (wasHost && humanPlayers.length > 0) {
    humanPlayers[0].isHost = true;
    addActionLog(room, humanPlayers[0].nickname + "님이 새로운 방장이 되었습니다.", 'server.newHost', { name: humanPlayers[0].nickname });
  }

  emitPersonalStates(room);
  emitRoomsUpdate();
}

// ============================================================================
// SPA FALLBACK ROUTE (Express 5)
// ============================================================================

app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log("[Yeah!!] Server running on port " + PORT);
});
