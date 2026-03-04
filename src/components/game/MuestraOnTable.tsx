import type { Card } from '../../utils/cards';
import { SpanishCard } from './SpanishCard';

interface MuestraOnTableProps {
  card: Card;
  style?: React.CSSProperties;
  className?: string;
  onAnimationEnd?: () => void;
}

export function MuestraOnTable({ card, style, className = '', onAnimationEnd }: MuestraOnTableProps) {
  return (
    <div
      className={`absolute -translate-x-1/2 pointer-events-none ${className}`}
      style={style}
      onAnimationEnd={onAnimationEnd}
    >
      <div className="relative">
        <SpanishCard rank={card.rank} suit={card.suit} trump={true} />
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold text-emerald-300 bg-emerald-900/70 rounded px-1.5 py-0.5 border border-emerald-600/40">
          Muestra
        </div>
      </div>
    </div>
  );
}
