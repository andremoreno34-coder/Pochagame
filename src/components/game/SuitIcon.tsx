import type { Suit } from '../../utils/cards';

interface IconProps {
  size?: number;
  className?: string;
}

export function OrosIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" fill="#e5a800" stroke="#b87800" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="7.2" fill="none" stroke="#f5cc50" strokeWidth="1" />
      <circle cx="12" cy="12" r="4.4" fill="#f5cc50" opacity="0.7" />
      <circle cx="12" cy="12" r="2" fill="#ffe680" />
    </svg>
  );
}

export function CopasIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3C8 3 5 5.5 5 9c0 2.5 1.5 4.5 4 5.5l-1 3h1l-0.5 1.5h7L15.5 17.5h1l-1-3c2.5-1 4-3 4-5.5C19.5 5.5 16 3 12 3z"
        fill="#c0392b"
        stroke="#8B1a1a"
        strokeWidth="0.8"
      />
      <path d="M8.5 17.5h7v1H8.5z" fill="#8B1a1a" />
      <path
        d="M12 5c-2.5 0-5 2-5 4 0 1.8 1.2 3.3 3 4.2"
        stroke="#e87070"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}

export function EspadasIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 2 L12.8 8 L18 9 L12.8 10.5 L13.5 16 L12 15 L10.5 16 L11.2 10.5 L6 9 L11.2 8 Z"
        fill="#4a7fc0"
        stroke="#1a3a6a"
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      <rect x="9.5" y="16" width="5" height="1.2" rx="0.4" fill="#2a5090" />
      <path d="M10.5 17.2 L11 21 L13 21 L13.5 17.2 Z" fill="#2a5090" />
      <line x1="8" y1="9" x2="16" y2="9" stroke="#1a3a6a" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function BastosIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M9 21 L11 6 L12 4 L13 6 L15 21 Z"
        fill="#2d7a4a"
        stroke="#1a4a2a"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <path
        d="M11 6 C11 6 8 7 7 9.5 C6 12 8 13.5 9.5 13 L11 12"
        fill="#3d9a5a"
        stroke="#1a4a2a"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 6 C13 6 16 7 17 9.5 C18 12 16 13.5 14.5 13 L13 12"
        fill="#3d9a5a"
        stroke="#1a4a2a"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 10 C10.5 10 9 11 9 13 C9 15 10.5 15.5 12 15.5 C13.5 15.5 15 15 15 13 C15 11 13.5 10 13.5 10"
        fill="#3d9a5a"
        stroke="#1a4a2a"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse cx="12" cy="4.5" rx="1.5" ry="1.8" fill="#4dba6a" stroke="#1a4a2a" strokeWidth="0.8" />
    </svg>
  );
}

const SUIT_ICONS: Record<Suit, typeof OrosIcon> = {
  oros: OrosIcon,
  copas: CopasIcon,
  espadas: EspadasIcon,
  bastos: BastosIcon,
};

export function SuitIcon({ suit, size = 20, className }: { suit: Suit; size?: number; className?: string }) {
  const Icon = SUIT_ICONS[suit];
  return <Icon size={size} className={className} />;
}

export const SUIT_LABEL: Record<Suit, string> = {
  oros: 'Oros',
  copas: 'Copas',
  espadas: 'Espadas',
  bastos: 'Bastos',
};
