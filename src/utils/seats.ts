export type SeatPosition = 'top-left' | 'top' | 'top-right' | 'left' | 'right';

export interface SeatedPlayer {
  name: string;
  seat: SeatPosition;
}

// Positions for n opponents ordered clockwise from the local player:
// right (n+1) → top-right → top(s) → top-left → left (n-1)
const SEAT_MAPS: SeatPosition[][] = [
  [],
  ['top'],
  ['right', 'left'],
  ['right', 'top', 'left'],
  ['right', 'top-right', 'top-left', 'left'],
  ['right', 'top-right', 'top', 'top-left', 'left'],
  ['right', 'top-right', 'top', 'top', 'top-left', 'left'],
  ['right', 'top-right', 'top', 'top', 'top', 'top-left', 'left'],
];

/**
 * Assigns visual seat positions to all players except the local player.
 * Opponents are ordered by turn order starting from the player immediately
 * after localUsername, going clockwise around the table.
 */
export function assignSeats(players: string[], localUsername: string): SeatedPlayer[] {
  const localIndex = players.indexOf(localUsername);
  const n = players.length;

  if (localIndex < 0 || n <= 1) return [];

  const opponents = Array.from(
    { length: n - 1 },
    (_, i) => players[(localIndex + 1 + i) % n]
  );

  const numOpponents = opponents.length;
  const positions: SeatPosition[] =
    numOpponents < SEAT_MAPS.length
      ? SEAT_MAPS[numOpponents]!
      : ['right', ...Array(numOpponents - 2).fill('top' as SeatPosition), 'left'];

  return opponents.map((name, i) => ({ name, seat: positions[i] ?? 'top' }));
}
