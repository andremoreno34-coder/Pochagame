import { createContext, useContext, useState, ReactNode } from 'react';
import { Game, RoundMode, PlayerRoundScore, RoundScoreEntry, PlaceBidResult, PlayedCard, WonTrick } from '../types/game';
import { Suit, Card, dealRoundForTest, getCardRankValue } from '../utils/cards';
import { isCardLegalToPlay, getPlayableCardsForPlayer } from '../utils/gameRules';
import type { Room, RoomPlayer } from '../types/rooms';

function computeRoundPoints(bid: number, tricks: number): number {
  if (bid === tricks) return 10 + (tricks * 5);
  return -(5 * Math.abs(bid - tricks));
}

function getNextDealerName(game: Game): string {
  const numPlayers = game.players.length;
  if (numPlayers === 0) return "";
  const currentName = game.currentDealer ?? game.players[0];
  const idxRaw = game.players.indexOf(currentName);
  const idx = idxRaw === -1 ? 0 : idxRaw;
  return game.players[(idx + 1) % numPlayers];
}

export function getBidOrder(game: Game): string[] {
  const order: string[] = [];
  const n = game.players.length;
  if (n === 0) return order;
  const dealer = game.currentDealer ?? game.players[0];
  const dealerIndex = game.players.indexOf(dealer) >= 0 ? game.players.indexOf(dealer) : 0;
  for (let i = 1; i <= n; i++) {
    order.push(game.players[(dealerIndex + i) % n]);
  }
  return order;
}

interface AddGamePayload {
  name: string;
  maxPlayers: number;
  maxCardsPerPlayer: number;
  roundMode: RoundMode;
  createdBy: string;
  renuncioModeEnabled: boolean;
}

interface GameContextType {
  games: Game[];
  addGame: (payload: AddGamePayload) => Game;
  joinGame: (gameId: string, username: string) => void;
  getGameById: (gameId: string) => Game | undefined;
  startGame: (gameId: string) => void;
  nextRound: (gameId: string) => void;
  finishRound: (gameId: string) => void;
  addTestPlayer: (gameId: string, username: string) => void;
  dealCurrentRound: (gameId: string) => void;
  updateRounds: (gameId: string, newRounds: number[]) => void;
  startBidding: (gameId: string) => void;
  placeBid: (gameId: string, username: string, bid: number) => PlaceBidResult;
  setBidTest: (gameId: string, username: string, bid: number) => void;
  setTrumpSuit: (gameId: string, suit: Suit) => void;
  playCard: (gameId: string, username: string, card: Card) => void;
  createGameFromRoom: (room: Room, players: RoomPlayer[]) => Game;
  replaceGame: (gameId: string, newState: Game) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function generateRounds(numPlayers: number, maxCardsPerPlayer: number, roundMode: RoundMode): number[] {
  const minCards = 1;
  const maxTheoretical = Math.floor(40 / numPlayers);
  const effectiveMax = Math.max(minCards, Math.min(maxCardsPerPlayer, maxTheoretical));

  const asc = Array.from({ length: effectiveMax }, (_, i) => i + 1);
  const desc = Array.from({ length: effectiveMax }, (_, i) => effectiveMax - i);

  if (roundMode === 'ascending') return asc;
  if (roundMode === 'descending') return desc;

  const ones = Array(numPlayers).fill(1);
  const ascFrom2 = asc.filter((c) => c > 1);
  return [...desc, ...ones, ...ascFrom2];
}

const EMPTY_DEAL_STATE = {
  currentDealer: null,
  currentStartingPlayer: null,
  currentNextDealer: null,
  currentTrumpSuit: null,
  currentTrumpCard: null,
  currentHandsByPlayer: null,
} as const;

const EMPTY_ROUND_STATE = {
  currentRoundPhase: 'idle' as const,
  currentBidderIndex: null as number | null,
  currentBids: {} as Record<string, number>,
  currentTricks: {} as Record<string, number>,
  currentTrick: [] as PlayedCard[],
  currentTrickLeader: null as string | null,
  currentTurnPlayer: null as string | null,
  currentPlayerIndex: null as number | null,
  currentTrickIndex: 0,
};

export function GameProvider({ children }: { children: ReactNode }) {
  const [games, setGames] = useState<Game[]>([]);

  const addGame = (payload: AddGamePayload): Game => {
    const newGame: Game = {
      id: Date.now().toString(),
      name: payload.name,
      mode: 'local',
      status: 'waiting',
      maxPlayers: payload.maxPlayers,
      maxCardsPerPlayer: payload.maxCardsPerPlayer,
      roundMode: payload.roundMode,
      renuncioModeEnabled: payload.renuncioModeEnabled,
      players: [payload.createdBy],
      playerJoinedAt: { [payload.createdBy]: new Date().toISOString() },
      createdBy: payload.createdBy,
      started: false,
      rounds: [],
      currentRoundIndex: 0,
      roundScores: [],
      wonTricksByPlayer: [[]] as WonTrick[][],
      ...EMPTY_DEAL_STATE,
      ...EMPTY_ROUND_STATE,
    };

    setGames((prev) => [...prev, newGame]);
    return newGame;
  };

  const joinGame = (gameId: string, username: string) => {
    setGames((prev) =>
      prev.map((game) => {
        if (
          game.id === gameId &&
          game.status === 'waiting' &&
          game.players.length < game.maxPlayers &&
          !game.players.includes(username)
        ) {
          return {
            ...game,
            players: [...game.players, username],
            playerJoinedAt: { ...game.playerJoinedAt, [username]: new Date().toISOString() },
          };
        }
        return game;
      })
    );
  };

  const getGameById = (gameId: string): Game | undefined => {
    return games.find((game) => game.id === gameId);
  };

  const startGame = (gameId: string) => {
    setGames((prev) =>
      prev.map((game) => {
        if (game.id !== gameId) return game;
        const numPlayers = game.players.length;
        if (numPlayers < 1) return game;

        let rounds = game.rounds;
        if (rounds.length === 0) {
          rounds = generateRounds(numPlayers, game.maxCardsPerPlayer, game.roundMode);
        }
        if (rounds.length === 0) return game;

        return {
          ...game,
          started: true,
          status: 'playing',
          rounds,
          currentRoundIndex: 0,
          roundScores: [],
          wonTricksByPlayer: game.players.map(() => []) as WonTrick[][],
          ...EMPTY_DEAL_STATE,
          ...EMPTY_ROUND_STATE,
          currentDealer: game.players[0],
        };
      })
    );
  };

  const updateRounds = (gameId: string, newRounds: number[]) => {
    setGames((prev) =>
      prev.map((game) => {
        if (game.id !== gameId) return game;
        if (game.started) return game;
        const numPlayersForLimit = game.maxPlayers;
        if (numPlayersForLimit <= 0) return game;
        const maxAllowed = Math.floor(40 / numPlayersForLimit);
        const sanitized = newRounds
          .map((v) => Math.trunc(v))
          .map((v) => Math.max(1, Math.min(v, maxAllowed)));
        return { ...game, rounds: sanitized };
      })
    );
  };

  const addTestPlayer = (gameId: string, username: string) => {
    if (!username.trim()) return;
    setGames((prev) =>
      prev.map((game) => {
        if (game.id !== gameId) return game;
        if (game.players.includes(username)) return game;
        if (game.players.length >= game.maxPlayers) return game;
        return {
          ...game,
          players: [...game.players, username],
          playerJoinedAt: { ...game.playerJoinedAt, [username]: new Date().toISOString() },
        };
      })
    );
  };

  const finishRound = (gameId: string) => {
    setGames((prev) =>
      prev.map((game) => {
        if (game.id !== gameId) return game;
        if (game.currentRoundPhase !== 'playing') return game;

        const scores: Record<string, PlayerRoundScore> = {};
        for (const player of game.players) {
          const bid = game.currentBids[player] ?? 0;
          const tricks = game.currentTricks[player] ?? 0;
          scores[player] = { bid, tricks, points: computeRoundPoints(bid, tricks) };
        }

        const entry: RoundScoreEntry = { roundIndex: game.currentRoundIndex, scores };

        return {
          ...game,
          currentRoundPhase: 'scoring',
          roundScores: [...game.roundScores, entry],
        };
      })
    );
  };

  const nextRound = (gameId: string) => {
    setGames((prev) =>
      prev.map((game) => {
        if (game.id !== gameId) return game;
        if (!game.started) return game;
        if (!game.rounds || game.rounds.length === 0) return game;
        if (game.status === 'finished') return game;

        if (game.currentRoundIndex < game.rounds.length - 1) {
          const nextDealer = getNextDealerName(game);
          return {
            ...game,
            currentRoundIndex: game.currentRoundIndex + 1,
            ...EMPTY_DEAL_STATE,
            ...EMPTY_ROUND_STATE,
            currentDealer: nextDealer,
          };
        } else {
          return { ...game, status: 'finished', ...EMPTY_DEAL_STATE };
        }
      })
    );
  };

  const dealCurrentRound = (gameId: string) => {
    setGames((prev) =>
      prev.map((game) => {
        if (game.id !== gameId) return game;
        if (!game.started || game.status !== 'playing') return game;
        if (!game.rounds || game.rounds.length === 0) return game;
        if (game.currentRoundIndex < 0 || game.currentRoundIndex >= game.rounds.length) return game;

        const cardsPerPlayer = game.rounds[game.currentRoundIndex];
        if (game.players.length * cardsPerPlayer > 40) return game;
        const dealerForRound = game.currentDealer ?? game.players[0];
        const result = dealRoundForTest(game.players, cardsPerPlayer, dealerForRound);
        if (!result) return game;

        return {
          ...game,
          currentDealer: result.dealer,
          currentStartingPlayer: result.startingPlayer,
          currentNextDealer: result.nextDealer,
          currentTrumpSuit: result.trumpSuit,
          currentTrumpCard: result.leftoverTopCard ?? null,
          currentHandsByPlayer: result.handsByPlayer,
        };
      })
    );
  };

  const startBidding = (gameId: string) => {
    setGames((prev) =>
      prev.map((game) => {
        if (game.id !== gameId) return game;
        if (!game.started || game.status !== 'playing') return game;
        if (game.currentHandsByPlayer === null) return game;

        const numPlayers = game.players.length;
        const dealerName = game.currentDealer;
        const dealerIndexRaw = dealerName ? game.players.indexOf(dealerName) : 0;
        const dealerIndex = dealerIndexRaw === -1 ? 0 : dealerIndexRaw;
        const startingBidderIndex = (dealerIndex + 1) % numPlayers;

        return {
          ...game,
          currentRoundPhase: 'bidding',
          currentBidderIndex: startingBidderIndex,
          currentBids: {},
        };
      })
    );
  };

  const placeBid = (gameId: string, username: string, bid: number): PlaceBidResult => {
    const game = games.find((g) => g.id === gameId);
    if (!game) return { ok: false, reason: 'not_turn' };
    if (!game.started || game.status !== 'playing') return { ok: false, reason: 'not_turn' };
    if (game.currentRoundPhase !== 'bidding') return { ok: false, reason: 'not_turn' };
    if (game.currentHandsByPlayer === null) return { ok: false, reason: 'not_turn' };
    if (game.currentBidderIndex === null) return { ok: false, reason: 'not_turn' };

    const cardsPerPlayer = game.rounds[game.currentRoundIndex];
    const currentBidderName = game.players[game.currentBidderIndex];

    if (username !== currentBidderName) return { ok: false, reason: 'not_turn' };

    let clampedBid = Math.trunc(bid);
    if (clampedBid < 0) clampedBid = 0;
    if (clampedBid > cardsPerPlayer) clampedBid = cardsPerPlayer;

    const currentBids = game.currentBids ?? {};
    const partialSum = Object.entries(currentBids)
      .filter(([name]) => name !== currentBidderName)
      .reduce((sum, [, v]) => sum + v, 0);

    const dealer = game.currentDealer;
    const dealerIndex =
      dealer && game.players.indexOf(dealer) >= 0 ? game.players.indexOf(dealer) : 0;
    const isPostre = game.currentBidderIndex === dealerIndex;

    const forbiddenBid = cardsPerPlayer - partialSum;
    if (isPostre && forbiddenBid >= 0 && forbiddenBid <= cardsPerPlayer && clampedBid === forbiddenBid) {
      return { ok: false, reason: 'forbidden_sum' };
    }

    const updatedBids = { ...currentBids, [currentBidderName]: clampedBid };
    const finalSum = Object.values(updatedBids).reduce((s, v) => s + v, 0);
    if (isPostre && finalSum === cardsPerPlayer) {
      return { ok: false, reason: 'forbidden_sum' };
    }

    setGames((prev) =>
      prev.map((g) => {
        if (g.id !== gameId) return g;
        if (g.currentBidderIndex === null) return g;

        const n = g.players.length;
        const cards = g.rounds[g.currentRoundIndex];
        const bidderName = g.players[g.currentBidderIndex];
        const bids = { ...g.currentBids, [bidderName]: Math.max(0, Math.min(Math.trunc(bid), cards)) };

        const dl = g.currentDealer;
        const dlIdx = dl && g.players.indexOf(dl) >= 0 ? g.players.indexOf(dl) : 0;
        const isLastBidder = g.currentBidderIndex === dlIdx;

        if (isLastBidder) {
          const tricks: Record<string, number> = {};
          for (const p of g.players) tricks[p] = 0;
          const numPlayers = g.players.length;
          let startIndex = 0;
          if (g.currentStartingPlayer) {
            const idx = g.players.indexOf(g.currentStartingPlayer);
            startIndex = idx === -1 ? 0 : idx;
          } else if (g.currentDealer) {
            const dealerIndexRaw = g.players.indexOf(g.currentDealer);
            const di = dealerIndexRaw === -1 ? 0 : dealerIndexRaw;
            startIndex = (di - 1 + numPlayers) % numPlayers;
          }
          const leader = g.players[startIndex];
          return {
            ...g,
            currentBids: bids,
            currentRoundPhase: 'playing',
            currentBidderIndex: null,
            currentTricks: tricks,
            currentTrick: [],
            currentTrickIndex: 0,
            currentTrickLeader: leader,
            currentTurnPlayer: leader,
            currentPlayerIndex: startIndex,
          };
        }

        const nextIdx = (g.currentBidderIndex + 1) % n;
        return {
          ...g,
          currentBids: bids,
          currentBidderIndex: nextIdx,
        };
      })
    );

    return { ok: true };
  };

  const setTrumpSuit = (gameId: string, suit: Suit) => {
    setGames((prev) =>
      prev.map((game) => {
        if (game.id !== gameId) return game;
        if (game.currentTrumpSuit !== null) return game;
        return { ...game, currentTrumpSuit: suit };
      })
    );
  };

  const setBidTest = (gameId: string, username: string, bid: number) => {
    setGames((prev) =>
      prev.map((game) => {
        if (game.id !== gameId) return game;
        if (game.currentRoundPhase !== 'bidding' && game.currentRoundPhase !== 'playing') return game;
        if (!game.players.includes(username)) return game;

        const cardsPerPlayer = game.rounds[game.currentRoundIndex];
        let value = Math.floor(bid);
        if (value < 0) value = 0;
        if (value > cardsPerPlayer) value = cardsPerPlayer;

        const updatedBids = { ...game.currentBids, [username]: value };
        const order = getBidOrder(game);
        const allHaveBids = order.every((p) => typeof updatedBids[p] === 'number');
        const shouldTransition = allHaveBids && game.currentRoundPhase === 'bidding';

        if (shouldTransition) {
          const tricks: Record<string, number> = {};
          for (const p of game.players) tricks[p] = 0;
          const numPlayers = game.players.length;
          let startIndex = 0;
          if (game.currentStartingPlayer) {
            const idx = game.players.indexOf(game.currentStartingPlayer);
            startIndex = idx === -1 ? 0 : idx;
          } else if (game.currentDealer) {
            const dealerIndexRaw = game.players.indexOf(game.currentDealer);
            const di = dealerIndexRaw === -1 ? 0 : dealerIndexRaw;
            startIndex = (di - 1 + numPlayers) % numPlayers;
          }
          const leader = game.players[startIndex];
          return {
            ...game,
            currentBids: updatedBids,
            currentRoundPhase: 'playing',
            currentTricks: tricks,
            currentTrick: [],
            currentTrickIndex: 0,
            currentTrickLeader: leader,
            currentTurnPlayer: leader,
            currentPlayerIndex: startIndex,
          };
        }

        return {
          ...game,
          currentBids: updatedBids,
          currentRoundPhase: game.currentRoundPhase,
        };
      })
    );
  };

  const playCard = (gameId: string, username: string, card: Card) => {
    setGames((prev) =>
      prev.map((game) => {
        if (game.id !== gameId) return game;
        if (game.currentRoundPhase !== 'playing') return game;
        if (game.currentHandsByPlayer === null) return game;
        if (!game.players.includes(username)) return game;
        if (game.currentTurnPlayer !== username) return game;

        const hand = game.currentHandsByPlayer[username] || [];
        const cardIndex = hand.findIndex((c) => c.suit === card.suit && c.rank === card.rank);
        if (cardIndex === -1) return game;

        const trick = game.currentTrick;
        const numPlayers = game.players.length;
        const cardsPerPlayer = game.rounds[game.currentRoundIndex];

        const isLegal = isCardLegalToPlay(game, username, card);

        if (!isLegal) {
          if (!game.renuncioModeEnabled) return game;

          const totalBazasPedidas = Object.values(game.currentBids).reduce((s, v) => s + v, 0);
          const penalty = -totalBazasPedidas * 5;
          const legalCards = getPlayableCardsForPlayer(game, username);

          const scores: Record<string, PlayerRoundScore> = {};
          for (const player of game.players) {
            const bid = game.currentBids[player] ?? 0;
            if (player === username) {
              scores[player] = { bid, tricks: 0, points: penalty };
            } else {
              scores[player] = { bid, tricks: bid, points: computeRoundPoints(bid, bid) };
            }
          }

          const entry: RoundScoreEntry = {
            roundIndex: game.currentRoundIndex,
            scores,
            renuncio: {
              playerId: username,
              penalty,
              totalBazasPedidas,
              hand: [...hand],
              legalCards,
              playedCard: card,
            },
          };

          return {
            ...game,
            currentRoundPhase: 'scoring',
            roundScores: [...game.roundScores, entry],
          };
        }

        const newHand = hand.filter((_, i) => i !== cardIndex);
        const newTrick = [...trick, { player: username, card }];

        const updatedHands = { ...game.currentHandsByPlayer, [username]: newHand };

        if (newTrick.length < numPlayers) {
          const currentIndex = game.players.indexOf(username);
          const nextIndex = (currentIndex + 1) % numPlayers;
          return {
            ...game,
            currentHandsByPlayer: updatedHands,
            currentTrick: newTrick,
            currentTurnPlayer: game.players[nextIndex],
            currentPlayerIndex: nextIndex,
          };
        }

        const leadSuit = newTrick[0].card.suit;
        const trump = game.currentTrumpSuit;

        const trumpCards = trump !== null ? newTrick.filter((e) => e.card.suit === trump) : [];
        let winnerEntry: { player: string; card: Card };
        if (trumpCards.length > 0) {
          winnerEntry = trumpCards.reduce((best, e) =>
            getCardRankValue(e.card) > getCardRankValue(best.card) ? e : best
          );
        } else {
          const leadCards = newTrick.filter((e) => e.card.suit === leadSuit);
          winnerEntry = leadCards.reduce((best, e) =>
            getCardRankValue(e.card) > getCardRankValue(best.card) ? e : best
          );
        }

        const winnerPlayer = winnerEntry.player;
        const winnerIndex = game.players.indexOf(winnerPlayer);
        const updatedTricks = { ...game.currentTricks, [winnerPlayer]: (game.currentTricks[winnerPlayer] || 0) + 1 };
        const newTrickIndex = game.currentTrickIndex + 1;

        const wonTrick: WonTrick = { trickIndex: game.currentTrickIndex, cards: newTrick };
        const updatedWonTricksByPlayer: WonTrick[][] = game.wonTricksByPlayer.map((arr, i) =>
          i === winnerIndex ? [...arr, wonTrick] : arr
        );

        if (newTrickIndex >= cardsPerPlayer) {
          return {
            ...game,
            currentHandsByPlayer: updatedHands,
            currentTrick: [],
            currentTrickIndex: newTrickIndex,
            currentTricks: updatedTricks,
            wonTricksByPlayer: updatedWonTricksByPlayer,
            currentPlayerIndex: null,
          };
        }

        return {
          ...game,
          currentHandsByPlayer: updatedHands,
          currentTrick: [],
          currentTrickIndex: newTrickIndex,
          currentTricks: updatedTricks,
          wonTricksByPlayer: updatedWonTricksByPlayer,
          currentTrickLeader: winnerPlayer,
          currentTurnPlayer: winnerPlayer,
          currentPlayerIndex: winnerIndex,
        };
      })
    );
  };

  const replaceGame = (gameId: string, newState: Game) => {
    setGames((prev) => {
      const exists = prev.some((g) => g.id === gameId);
      if (exists) return prev.map((g) => (g.id === gameId ? newState : g));
      return [...prev, newState];
    });
  };

  const createGameFromRoom = (room: Room, players: RoomPlayer[]): Game => {
    const sorted = [...players].sort((a, b) => (a.seat_index ?? 0) - (b.seat_index ?? 0));
    const playerNames = sorted.map(
      (p) => p.profile?.nombre ?? p.profile?.player_code ?? 'Jugador',
    );

    const hostPlayer = players.find((p) => p.profile_id === room.host_profile_id);
    const createdByName =
      hostPlayer?.profile?.nombre ?? hostPlayer?.profile?.player_code ?? 'Host';

    const rounds = generateRounds(
      playerNames.length,
      room.max_cards_per_player,
      room.round_mode,
    );

    const newGame: Game = {
      id: room.id,
      name: room.name ?? `Sala de ${createdByName}`,
      mode: 'online',
      status: 'playing',
      maxPlayers: room.max_players,
      maxCardsPerPlayer: room.max_cards_per_player,
      roundMode: room.round_mode,
      renuncioModeEnabled: room.renuncio_mode_enabled,
      players: playerNames,
      playerJoinedAt: Object.fromEntries(
        playerNames.map((n) => [n, new Date().toISOString()]),
      ),
      createdBy: createdByName,
      started: true,
      rounds,
      currentRoundIndex: 0,
      roundScores: [],
      wonTricksByPlayer: playerNames.map(() => []) as WonTrick[][],
      ...EMPTY_DEAL_STATE,
      ...EMPTY_ROUND_STATE,
      currentDealer: playerNames[0] ?? null,
    };

    setGames((prev) => {
      if (prev.some((g) => g.id === room.id)) return prev;
      return [...prev, newGame];
    });

    return newGame;
  };

  return (
    <GameContext.Provider value={{ games, addGame, joinGame, getGameById, startGame, nextRound, finishRound, addTestPlayer, dealCurrentRound, updateRounds, startBidding, placeBid, setBidTest, setTrumpSuit, playCard, createGameFromRoom, replaceGame }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
