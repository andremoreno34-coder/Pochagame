export type RoundMode = "ascending" | "descending" | "combined";
export type RoundPhase = "idle" | "bidding" | "playing" | "scoring";

export type PlaceBidResult =
  | { ok: true }
  | { ok: false; reason: "not_turn" | "forbidden_sum" };

import type { Suit, Card } from '../utils/cards';

export interface PlayedCard {
  player: string;
  card: Card;
}

export interface WonTrick {
  trickIndex: number;
  cards: PlayedCard[];
}

export interface PlayerRoundScore {
  bid: number;
  tricks: number;
  points: number;
}

export interface RenuncioInfo {
  playerId: string;
  penalty: number;
  totalBazasPedidas: number;
  hand: Card[];
  legalCards: Card[];
  playedCard: Card;
}

export interface RoundScoreEntry {
  roundIndex: number;
  scores: Record<string, PlayerRoundScore>;
  renuncio?: RenuncioInfo;
}

export interface Game {
  id: string;
  name: string;
  mode: 'local' | 'online';
  status: "waiting" | "playing" | "finished";
  maxPlayers: number;
  maxCardsPerPlayer: number;
  roundMode: RoundMode;
  renuncioModeEnabled: boolean;
  players: string[];
  playerJoinedAt: Record<string, string>;
  createdBy: string;
  started: boolean;
  rounds: number[];
  currentRoundIndex: number;
  currentDealer: string | null;
  currentStartingPlayer: string | null;
  currentNextDealer: string | null;
  currentTrumpSuit: Suit | null;
  currentTrumpCard: Card | null;
  currentHandsByPlayer: Record<string, Card[]> | null;
  currentRoundPhase: RoundPhase;
  currentBidderIndex: number | null;
  currentBids: Record<string, number>;
  currentTricks: Record<string, number>;
  currentTrick: PlayedCard[];
  wonTricksByPlayer: WonTrick[][];
  currentTrickLeader: string | null;
  currentTurnPlayer: string | null;
  currentPlayerIndex: number | null;
  currentTrickIndex: number;
  roundScores: RoundScoreEntry[];
}
