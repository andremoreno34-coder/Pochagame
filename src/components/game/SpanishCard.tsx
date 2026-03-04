import type { Suit } from '../../utils/cards';
import { SuitIcon, SUIT_LABEL } from './SuitIcon';

export type { Suit as SpanishSuit };

export interface SpanishCardProps {
  rank: number;
  suit: Suit;
  trump?: boolean;
  clickable?: boolean;
  selected?: boolean;
  disabled?: boolean;
  small?: boolean;
  large?: boolean;
  isLead?: boolean;
  onClick?: () => void;
}

const RANK_NAME: Record<number, string> = {
  1: 'As',
  2: 'Dos',
  3: 'Tres',
  4: 'Cuatro',
  5: 'Cinco',
  6: 'Seis',
  7: 'Siete',
  10: 'Sota',
  11: 'Caballo',
  12: 'Rey',
};

const SUIT_CONFIG: Record<
  Suit,
  { color: string; bg: string; border: string; trumpBorder: string }
> = {
  oros: {
    color: '#b87800',
    bg: 'bg-gradient-to-b from-amber-50 via-white to-amber-50',
    border: 'border-amber-300',
    trumpBorder: 'border-amber-500',
  },
  copas: {
    color: '#c0392b',
    bg: 'bg-gradient-to-b from-red-50 via-white to-red-50',
    border: 'border-red-300',
    trumpBorder: 'border-red-500',
  },
  espadas: {
    color: '#2a5090',
    bg: 'bg-gradient-to-b from-blue-50 via-white to-blue-50',
    border: 'border-blue-300',
    trumpBorder: 'border-blue-500',
  },
  bastos: {
    color: '#1a4a2a',
    bg: 'bg-gradient-to-b from-emerald-50 via-white to-emerald-50',
    border: 'border-emerald-400',
    trumpBorder: 'border-emerald-500',
  },
};

export function SpanishCard({
  rank,
  suit,
  trump = false,
  clickable = false,
  selected = false,
  disabled = false,
  small = false,
  large = false,
  isLead = false,
  onClick,
}: SpanishCardProps) {
  const cfg = SUIT_CONFIG[suit];
  const label = String(rank);
  const name = RANK_NAME[rank] ?? String(rank);

  const sizeClass = small
    ? 'w-11 h-[62px] px-1 py-0.5'
    : large
    ? 'w-[72px] h-[108px] px-1.5 py-1'
    : 'w-16 h-[96px] px-1.5 py-1';

  const centerIconSize = small ? 18 : large ? 38 : 30;
  const cornerIconSize = small ? 9 : large ? 12 : 10;

  const cardClasses = [
    'relative flex flex-col items-center justify-between select-none rounded-xl border-2 shadow-md',
    cfg.bg,
    trump ? `${cfg.trumpBorder} ring-2 ring-amber-400 ring-offset-1` : cfg.border,
    selected ? 'ring-2 ring-blue-500 ring-offset-1' : '',
    disabled ? 'opacity-35' : '',
    sizeClass,
    clickable && !disabled
      ? 'cursor-pointer transition-all duration-150 hover:-translate-y-2 hover:shadow-xl active:scale-95 active:translate-y-0'
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const rankFontClass = small
    ? 'text-[11px] font-black'
    : large
    ? 'text-base font-black'
    : 'text-sm font-black';

  const cornerBlock = (flipped: boolean) => (
    <div
      className={`flex flex-col items-center leading-none ${flipped ? 'rotate-180 self-end' : 'self-start'}`}
    >
      <span className={`${rankFontClass} leading-none`} style={{ color: cfg.color }}>
        {label}
      </span>
      <SuitIcon suit={suit} size={cornerIconSize} />
    </div>
  );

  const inner = (
    <>
      {trump && (
        <span className="absolute top-0.5 right-0.5 text-[7px] font-black text-amber-600 bg-amber-100 rounded px-0.5 leading-tight z-10">
          T
        </span>
      )}
      {cornerBlock(false)}
      <SuitIcon suit={suit} size={centerIconSize} />
      {cornerBlock(true)}
    </>
  );

  const wrapper = (
    <div className="relative flex flex-col items-center">
      {isLead && !small && (
        <span className="mb-0.5 text-[9px] font-black text-blue-600 bg-blue-100 rounded px-1 leading-tight uppercase tracking-wide">
          Salida
        </span>
      )}
      {clickable && !disabled && onClick ? (
        <button onClick={onClick} className={cardClasses} title={`${name} de ${SUIT_LABEL[suit]}`}>
          {inner}
        </button>
      ) : (
        <div className={cardClasses} title={`${name} de ${SUIT_LABEL[suit]}`}>
          {inner}
        </div>
      )}
    </div>
  );

  return wrapper;
}
