import type { SeatPosition } from './seats';

export type PlayerSlot = SeatPosition | 'bottom-center';

export interface PopoverPositionInput {
  anchorRect: DOMRect;
  popoverSize: { width: number; height: number };
  playerSlot: PlayerSlot;
  viewport: { width: number; height: number };
  padding?: number;
}

export interface PopoverPositionOutput {
  top: number;
  left: number;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

type Direction = 'top' | 'bottom' | 'left' | 'right';

const GAP = 8;

const PREFERRED: Record<PlayerSlot, Direction> = {
  'top': 'bottom',
  'top-left': 'bottom',
  'top-right': 'bottom',
  'left': 'right',
  'right': 'left',
  'bottom-center': 'top',
};

const OPPOSITE: Record<Direction, Direction> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

function calcForPlacement(
  placement: Direction,
  anchorRect: DOMRect,
  pw: number,
  ph: number,
): { top: number; left: number } {
  switch (placement) {
    case 'bottom':
      return {
        top: anchorRect.bottom + GAP,
        left: anchorRect.left + anchorRect.width / 2 - pw / 2,
      };
    case 'top':
      return {
        top: anchorRect.top - ph - GAP,
        left: anchorRect.left + anchorRect.width / 2 - pw / 2,
      };
    case 'right':
      return {
        top: anchorRect.top + anchorRect.height / 2 - ph / 2,
        left: anchorRect.right + GAP,
      };
    case 'left':
      return {
        top: anchorRect.top + anchorRect.height / 2 - ph / 2,
        left: anchorRect.left - pw - GAP,
      };
  }
}

function fits(
  top: number,
  left: number,
  pw: number,
  ph: number,
  vw: number,
  vh: number,
  padding: number,
): boolean {
  return (
    top >= padding &&
    left >= padding &&
    top + ph <= vh - padding &&
    left + pw <= vw - padding
  );
}

export function getSafePopoverPosition(
  input: PopoverPositionInput,
): PopoverPositionOutput {
  const { anchorRect, popoverSize, playerSlot, viewport, padding = 16 } = input;
  const { width: pw, height: ph } = popoverSize;
  const { width: vw, height: vh } = viewport;

  const preferred = PREFERRED[playerSlot];
  const fallback = OPPOSITE[preferred];

  const preferredPos = calcForPlacement(preferred, anchorRect, pw, ph);

  let chosenPlacement: Direction = preferred;
  let chosenPos = preferredPos;

  if (!fits(preferredPos.top, preferredPos.left, pw, ph, vw, vh, padding)) {
    const fallbackPos = calcForPlacement(fallback, anchorRect, pw, ph);
    if (fits(fallbackPos.top, fallbackPos.left, pw, ph, vw, vh, padding)) {
      chosenPlacement = fallback;
      chosenPos = fallbackPos;
    }
  }

  const top = Math.max(padding, Math.min(chosenPos.top, vh - padding - ph));
  const left = Math.max(padding, Math.min(chosenPos.left, vw - padding - pw));

  return { top, left, placement: chosenPlacement };
}
