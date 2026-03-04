import type { Game } from '../types/game';
import type { Card } from './cards';
import { getSpanishCardStrength, determineTrickWinner } from './cards';

export function getPlayableCardsForPlayer(game: Game, playerName: string): Card[] {
  const hand = game.currentHandsByPlayer?.[playerName] ?? [];
  const trick = game.currentTrick;

  if (trick.length === 0) {
    return hand;
  }

  const leadSuit = trick[0].card.suit;
  const trumpSuit = game.currentTrumpSuit;
  const currentWinningCard = determineTrickWinner(trick, leadSuit, trumpSuit).card;

  const hasLeadSuit = hand.some((c) => c.suit === leadSuit);
  const hasTrump = trumpSuit !== null ? hand.some((c) => c.suit === trumpSuit) : false;
  const anyTrumpInTrick = trumpSuit !== null && trick.some((t) => t.card.suit === trumpSuit);

  if (hasLeadSuit) {
    const leadCards = hand.filter((c) => c.suit === leadSuit);

    if (currentWinningCard.suit === leadSuit) {
      const winningStrength = getSpanishCardStrength(currentWinningCard.rank);
      const strongerLeadCards = leadCards.filter(
        (c) => getSpanishCardStrength(c.rank) > winningStrength
      );
      return strongerLeadCards.length > 0 ? strongerLeadCards : leadCards;
    }

    return leadCards;
  }

  if (hasTrump) {
    const trumpCards = hand.filter((c) => c.suit === trumpSuit);

    if (!anyTrumpInTrick) {
      return trumpCards;
    }

    const winningStrength = getSpanishCardStrength(currentWinningCard.rank);
    const strongerTrumps = trumpCards.filter(
      (c) => getSpanishCardStrength(c.rank) > winningStrength
    );
    return strongerTrumps.length > 0 ? strongerTrumps : hand;
  }

  return hand;
}

export function isCardLegalToPlay(game: Game, playerName: string, card: Card): boolean {
  const playable = getPlayableCardsForPlayer(game, playerName);
  return playable.some((c) => c.id === card.id);
}
