export type Suit = "oros" | "copas" | "espadas" | "bastos";
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10 | 11 | 12;

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
}

const SUITS: Suit[] = ["oros", "copas", "espadas", "bastos"];
const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

export function generateDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${suit}-${rank}`, suit, rank });
    }
  }
  return deck;
}

const SPANISH_STRENGTH_ORDER: Rank[] = [1, 3, 12, 11, 10, 7, 6, 5, 4, 2];

export function getSpanishCardStrength(rank: number): number {
  const index = SPANISH_STRENGTH_ORDER.indexOf(rank as Rank);
  return index === -1 ? -1 : SPANISH_STRENGTH_ORDER.length - index;
}

export function getCardRankValue(card: Card): number {
  return getSpanishCardStrength(card.rank);
}

export function determineTrickWinner(
  trick: { player: string; card: Card }[],
  leadSuit: Suit,
  trumpSuit: Suit | null
): { player: string; card: Card } {
  const trumpCards = trumpSuit !== null ? trick.filter((e) => e.card.suit === trumpSuit) : [];
  if (trumpCards.length > 0) {
    return trumpCards.reduce((best, e) =>
      getCardRankValue(e.card) > getCardRankValue(best.card) ? e : best
    );
  }
  const leadCards = trick.filter((e) => e.card.suit === leadSuit);
  return leadCards.reduce((best, e) =>
    getCardRankValue(e.card) > getCardRankValue(best.card) ? e : best
  );
}

export function shuffleDeck(deck: Card[]) {
  const copy = [...deck];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export interface DealResult {
  dealer: string;
  startingPlayer: string;
  nextDealer: string;
  trumpSuit: Suit | null;
  leftoverCount: number;
  leftoverTopCard?: Card;
  handsByPlayer: Record<string, Card[]>;
}

export function dealRoundForTest(
  players: string[],
  cardsPerPlayer: number,
  dealerName: string
): DealResult | null {
  if (players.length === 0 || cardsPerPlayer < 1) return null;

  const deck = shuffleDeck(generateDeck());
  const numPlayers = players.length;
  const totalNeeded = numPlayers * cardsPerPlayer;

  if (totalNeeded > 40) return null;

  const handsByPlayer: Record<string, Card[]> = {};
  for (const player of players) {
    handsByPlayer[player] = [];
  }

  const dealtCount = Math.min(totalNeeded, deck.length);
  for (let i = 0; i < dealtCount; i++) {
    const playerName = players[i % numPlayers];
    handsByPlayer[playerName].push(deck[i]);
  }

  const leftoverStart = dealtCount;
  const leftoverCount = Math.max(0, deck.length - leftoverStart);

  let trumpSuit: Suit | null = null;
  let leftoverTopCard: Card | undefined;

  if (leftoverCount > 0) {
    leftoverTopCard = deck[leftoverStart];
    trumpSuit = leftoverTopCard.suit;
  }

  const dealerIdxRaw = players.indexOf(dealerName);
  const dealerIdx = dealerIdxRaw === -1 ? 0 : dealerIdxRaw;
  const dealer = players[dealerIdx];
  const startingPlayer = players[(dealerIdx + 1) % numPlayers];
  const nextDealer = players[(dealerIdx + 1) % numPlayers];

  return {
    dealer,
    startingPlayer,
    nextDealer,
    trumpSuit,
    leftoverCount,
    leftoverTopCard,
    handsByPlayer,
  };
}
