import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { CheckCircle, Crown, X, Layers } from 'lucide-react';
import type { Game, PlayedCard } from '../../types/game';
import type { Card, Suit } from '../../utils/cards';
import { getPlayableCardsForPlayer } from '../../utils/gameRules';
import { SpanishCard } from './SpanishCard';
import { assignSeats } from '../../utils/seats';
import type { SeatPosition } from '../../utils/seats';
import { SuitIcon, SUIT_LABEL } from './SuitIcon';
import { getSafePopoverPosition } from '../../utils/getSafePopoverPosition';
import { Portal } from '../ui/Portal';
import { MuestraOnTable } from './MuestraOnTable';

interface PlayingPhaseProps {
  game: Game;
  currentUsername: string | undefined;
  onPlayCard: (card: Card) => void;
  onFinishRound: () => void;
}

interface CollectingTrick {
  cards: PlayedCard[];
  winnerIndex: number;
  animating: boolean;
}

export function PlayingPhase({ game, currentUsername, onPlayCard, onFinishRound }: PlayingPhaseProps) {
  const cardsPerPlayer = game.rounds[game.currentRoundIndex];
  const allHandsEmpty = game.players.every(
    (p) => (game.currentHandsByPlayer![p]?.length ?? 0) === 0
  );

  const [lastTrickWinner, setLastTrickWinner] = useState<string | null>(null);
  const [showMyWonTricks, setShowMyWonTricks] = useState(false);
  const [hoveredPlayerIndex, setHoveredPlayerIndex] = useState<number | null>(null);
  const [collectingTrick, setCollectingTrick] = useState<CollectingTrick | null>(null);

  const prevTrickIndex = useRef(game.currentTrickIndex);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const prevTrickRef = useRef<PlayedCard[]>([]);
  const tableRef = useRef<HTMLDivElement>(null);
  const playerRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [muestraPos, setMuestraPos] = useState<{ x: number; y: number } | null>(null);
  const muestraHasAnimated = useRef(false);
  const postreIndex = game.players.indexOf(game.currentDealer ?? '');
  const firstPlayerIndex = game.players.indexOf(game.currentStartingPlayer ?? '');

  useEffect(() => {
    if (game.currentTrick.length > 0) {
      prevTrickRef.current = game.currentTrick;
    }
  }, [game.currentTrick]);

  useEffect(() => {
    if (game.currentTrickIndex > prevTrickIndex.current && !allHandsEmpty) {
      setLastTrickWinner(game.currentTrickLeader);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setLastTrickWinner(null), 2500);

      const winnerIndex = game.players.indexOf(game.currentTrickLeader ?? '');
      if (winnerIndex >= 0 && prevTrickRef.current.length > 0) {
        if (animTimerRef.current) clearTimeout(animTimerRef.current);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        setCollectingTrick({ cards: prevTrickRef.current, winnerIndex, animating: false });

        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = requestAnimationFrame(() => {
            setCollectingTrick((prev) => prev ? { ...prev, animating: true } : null);
            animTimerRef.current = setTimeout(() => {
              setCollectingTrick(null);
            }, 550);
          });
        });
      }
    }
    prevTrickIndex.current = game.currentTrickIndex;
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [game.currentTrickIndex, game.currentTrickLeader, allHandsEmpty, game.players]);

  useEffect(() => {
    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (!game.currentTrumpCard || allHandsEmpty) {
      muestraHasAnimated.current = false;
      setMuestraPos(null);
      return;
    }
    if (!tableRef.current) return;
    const pRef = playerRefs.current[postreIndex];
    const fRef = playerRefs.current[firstPlayerIndex];
    if (!pRef || !fRef) return;

    const tRect = tableRef.current.getBoundingClientRect();
    const pRect = pRef.getBoundingClientRect();
    const fRect = fRef.getBoundingClientRect();
    const midX = (pRect.left + pRect.width / 2 + fRect.left + fRect.width / 2) / 2 - tRect.left;

    setMuestraPos({ x: midX, y: 32 });
  }, [game.currentTrumpCard, allHandsEmpty, postreIndex, firstPlayerIndex]);

  useEffect(() => {
    if (!showMyWonTricks) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMyWonTricks(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showMyWonTricks]);

  const leadSuit = game.currentTrick.length > 0 ? game.currentTrick[0].card.suit : null;
  const myHand =
    currentUsername && game.currentHandsByPlayer
      ? game.currentHandsByPlayer[currentUsername] ?? null
      : null;
  const isMyTurn = game.currentTurnPlayer === currentUsername;

  const playableIds = new Set<string>(
    currentUsername && isMyTurn && !game.renuncioModeEnabled
      ? getPlayableCardsForPlayer(game, currentUsername).map((c) => c.id)
      : []
  );

  const localPlayerIndex = game.players.indexOf(currentUsername ?? '');
  const myWonTricks = localPlayerIndex >= 0 ? (game.wonTricksByPlayer[localPlayerIndex] ?? []) : [];

  const seated = assignSeats(game.players, currentUsername ?? '');
  const topSeats = seated.filter((s) => ['top', 'top-left', 'top-right'].includes(s.seat));
  const leftSeats = seated.filter((s) => s.seat === 'left');
  const rightSeats = seated.filter((s) => s.seat === 'right');

  const getAnimCoords = (winnerIndex: number) => {
    if (!tableRef.current) return null;
    const tRect = tableRef.current.getBoundingClientRect();
    const tCX = tRect.left + tRect.width / 2;
    const tCY = tRect.top + tRect.height / 2;
    const wRef = playerRefs.current[winnerIndex];
    if (!wRef) return { tCX, tCY, dx: 0, dy: 0 };
    const wRect = wRef.getBoundingClientRect();
    const wCX = wRect.left + wRect.width / 2;
    const wCY = wRect.top + wRect.height / 2;
    return { tCX, tCY, dx: wCX - tCX, dy: wCY - tCY };
  };

  const OpponentChip = ({
    player,
    playerIndex,
    seat,
    onHover,
    onLeave,
  }: {
    player: string;
    playerIndex: number;
    seat: SeatPosition;
    onHover: () => void;
    onLeave: () => void;
  }) => {
    const bid = game.currentBids[player] ?? 0;
    const tricks = game.currentTricks[player] ?? 0;
    const isTheirTurn = game.currentTurnPlayer === player;
    const handCount = game.currentHandsByPlayer?.[player]?.length ?? 0;
    const displayCount = Math.min(handCount, 7);
    const wonTricks = game.wonTricksByPlayer[playerIndex] ?? [];
    const isHovered = hoveredPlayerIndex === playerIndex;
    const lastTrick = wonTricks.length > 0 ? wonTricks[wonTricks.length - 1] : null;
    const isPostre = player === game.currentDealer;

    const anchorRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [tooltipPos, setTooltipPos] = useState<{
      top: number;
      left: number;
      placement: 'top' | 'bottom' | 'left' | 'right';
    } | null>(null);

    useLayoutEffect(() => {
      if (!isHovered || !lastTrick) {
        setTooltipPos(null);
        return;
      }
      if (!popoverRef.current || !anchorRef.current) return;
      const anchorRect = anchorRef.current.getBoundingClientRect();
      const pw = popoverRef.current.offsetWidth;
      const ph = popoverRef.current.offsetHeight;
      if (!pw || !ph) return;
      const pos = getSafePopoverPosition({
        anchorRect,
        popoverSize: { width: pw, height: ph },
        playerSlot: seat,
        viewport: { width: window.innerWidth, height: window.innerHeight },
      });
      setTooltipPos(pos);
    }, [isHovered, lastTrick, seat]);

    const animClass: Record<'top' | 'bottom' | 'left' | 'right', string> = {
      top: 'tooltip-from-below',
      bottom: 'tooltip-from-above',
      left: 'tooltip-from-right-side',
      right: 'tooltip-from-left-side',
    };

    return (
      <div
        ref={(el) => {
          playerRefs.current[playerIndex] = el;
          (anchorRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }}
        className="relative"
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
      >
        {isPostre && (
          <div className="absolute -top-1 -right-1 z-20 bg-yellow-400 text-black text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
            P
          </div>
        )}
        <div
          className={`flex flex-col gap-1.5 items-center px-3 py-2.5 rounded-2xl border shadow-lg transition-all duration-200 ${
            isTheirTurn
              ? 'bg-blue-900/80 border-blue-400/70 shadow-blue-500/20'
              : 'bg-black/60 border-white/15'
          }`}
          style={{ backdropFilter: 'blur(8px)', minWidth: 100 }}
        >
          {/* Card backs fan */}
          <div className="flex gap-0.5 items-end justify-center h-4">
            {Array.from({ length: displayCount }).map((_, i) => (
              <div
                key={i}
                className="w-2 h-3.5 rounded-[2px] border border-white/25 bg-gradient-to-b from-slate-600 to-slate-800"
                style={{ transform: `rotate(${(i - Math.floor(displayCount / 2)) * 6}deg)` }}
              />
            ))}
            {handCount === 0 && <div className="w-2 h-3.5 rounded-[2px] border border-white/10 bg-white/5" />}
          </div>

          {/* Avatar + name */}
          <div className="flex items-center gap-1.5">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                isTheirTurn ? 'bg-blue-500 text-white' : 'bg-white/20 text-white/70'
              }`}
            >
              {player.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <span
                  className={`text-[11px] font-semibold leading-tight truncate max-w-[68px] ${
                    isTheirTurn ? 'text-blue-200' : 'text-white/75'
                  }`}
                >
                  {player}
                </span>
                {isTheirTurn && (
                  <span className="text-[9px] font-bold text-blue-200 bg-blue-500/30 rounded px-1 leading-none border border-blue-400/30 shrink-0">
                    TURNO
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tricks / bid */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-white/40 leading-none">
              {tricks}/{bid} baza{bid !== 1 ? 's' : ''}
            </span>
            {wonTricks.length > 0 && (
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold leading-none shrink-0">
                {wonTricks.length}
              </span>
            )}
          </div>
        </div>

        {/* Hover tooltip: last trick */}
        {isHovered && lastTrick && (
          <Portal>
            <div
              ref={popoverRef}
              className={`z-[9999] bg-slate-900/95 border border-white/15 rounded-lg p-2 shadow-xl pointer-events-none${tooltipPos ? ` ${animClass[tooltipPos.placement]}` : ''}`}
              style={{
                position: 'fixed',
                top: tooltipPos ? tooltipPos.top : 0,
                left: tooltipPos ? tooltipPos.left : 0,
                maxWidth: 'min(90vw, 360px)',
                visibility: tooltipPos ? 'visible' : 'hidden',
              }}
            >
              <p className="text-[9px] text-white/40 font-medium uppercase tracking-wide mb-1.5 text-center">
                Última baza
              </p>
              <div className="flex flex-wrap gap-1 justify-center items-end">
                {lastTrick.cards.map((entry, i) => (
                  <SpanishCard
                    key={i}
                    rank={entry.card.rank}
                    suit={entry.card.suit}
                    trump={entry.card.suit === game.currentTrumpSuit}
                    small
                  />
                ))}
              </div>
            </div>
          </Portal>
        )}
      </div>
    );
  };

  const myHandCount = myHand?.length ?? 0;
  const myTricks = game.currentTricks[currentUsername ?? ''] ?? 0;
  const myBid = game.currentBids[currentUsername ?? ''] ?? 0;

  void cardsPerPlayer;

  return (
    <div className="flex flex-col h-full">

      {/* ── TOP OPPONENTS — overlap top edge of table ── */}
      {topSeats.length > 0 && (
        <div className="relative z-10 flex justify-center gap-2 pt-2 px-6 -mb-5">
          {[...topSeats].reverse().map((s) => (
            <OpponentChip
              key={s.name}
              player={s.name}
              playerIndex={game.players.indexOf(s.name)}
              seat={s.seat}
              onHover={() => setHoveredPlayerIndex(game.players.indexOf(s.name))}
              onLeave={() => setHoveredPlayerIndex(null)}
            />
          ))}
        </div>
      )}

      {/* ── MIDDLE: left | table | right ── */}
      <div className="flex-1 flex min-h-0 px-1">

        {/* Left seats */}
        {leftSeats.length > 0 && (
          <div className="relative z-10 flex flex-col gap-2 justify-center shrink-0 -mr-4 pl-1">
            {leftSeats.map((s) => (
              <OpponentChip
                key={s.name}
                player={s.name}
                playerIndex={game.players.indexOf(s.name)}
                seat={s.seat}
                onHover={() => setHoveredPlayerIndex(game.players.indexOf(s.name))}
                onLeave={() => setHoveredPlayerIndex(null)}
              />
            ))}
          </div>
        )}

        {/* Mesa central */}
        <div
          ref={tableRef}
          className="flex-1 relative rounded-3xl overflow-hidden bg-emerald-800 shadow-inner min-h-[240px]"
        >
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
              backgroundSize: '20px 20px',
            }}
          />

          {/* Last trick winner banner */}
          {lastTrickWinner && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-1.5 bg-emerald-900/80 border border-emerald-500/50 rounded-full text-sm font-medium text-emerald-200 animate-pulse whitespace-nowrap">
              <CheckCircle size={14} className="shrink-0 text-emerald-400" />
              <span>
                <span className="font-bold">{lastTrickWinner}</span> gana la baza
              </span>
            </div>
          )}

          <div className="relative flex flex-col items-center justify-center h-full px-6 py-6">
            {game.currentTrick.length === 0 ? (
              <div className="text-center">
                <div className="w-14 h-20 rounded-xl border-2 border-dashed border-emerald-600 opacity-40 mx-auto mb-3" />
                <p className="text-emerald-400 text-sm font-medium">
                  {allHandsEmpty ? 'Todas las bazas jugadas' : 'Esperando primera carta…'}
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-6 items-end">
                {game.currentTrick.map((entry, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-emerald-300 max-w-[64px] truncate text-center">
                      {entry.player}
                    </span>
                    <SpanishCard
                      rank={entry.card.rank}
                      suit={entry.card.suit}
                      trump={entry.card.suit === game.currentTrumpSuit}
                      isLead={i === 0}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {game.currentTrumpSuit && (
                <div className="flex items-center gap-1.5 bg-emerald-900/60 rounded-lg px-2.5 py-1.5">
                  <span className="text-[10px] text-emerald-400 font-medium uppercase tracking-wide">
                    Triunfo
                  </span>
                  <SuitIcon suit={game.currentTrumpSuit as Suit} size={16} />
                  <span className="text-[10px] text-emerald-300">
                    {SUIT_LABEL[game.currentTrumpSuit as Suit]}
                  </span>
                </div>
              )}
              {leadSuit && (
                <div className="flex items-center gap-1.5 bg-emerald-900/60 rounded-lg px-2 py-1.5">
                  <span className="text-[10px] text-emerald-400 font-medium uppercase">Salida</span>
                  <SuitIcon suit={leadSuit as Suit} size={14} />
                  <span className="text-[10px] text-emerald-300">
                    {SUIT_LABEL[leadSuit as Suit]}
                  </span>
                </div>
              )}
            </div>
            {!allHandsEmpty && game.currentTurnPlayer && (
              <div className="flex items-center gap-1 bg-emerald-900/60 rounded-lg px-2 py-1">
                <span className="text-[10px] text-emerald-400 font-medium">Turno:</span>
                <span className="text-[10px] text-white font-bold">
                  {game.currentTurnPlayer === currentUsername ? 'Tú' : game.currentTurnPlayer}
                </span>
              </div>
            )}
          </div>

          {/* Muestra card */}
          {game.currentTrumpCard && !allHandsEmpty && muestraPos && (
            <MuestraOnTable
              card={game.currentTrumpCard}
              style={{ left: muestraPos.x, top: muestraPos.y }}
              className={`transition-all duration-300${!muestraHasAnimated.current ? ' sample-card-animate' : ''}`}
              onAnimationEnd={() => { muestraHasAnimated.current = true; }}
            />
          )}
        </div>

        {/* Right seats */}
        {rightSeats.length > 0 && (
          <div className="relative z-10 flex flex-col gap-2 justify-center shrink-0 -ml-4 pr-1">
            {rightSeats.map((s) => (
              <OpponentChip
                key={s.name}
                player={s.name}
                playerIndex={game.players.indexOf(s.name)}
                seat={s.seat}
                onHover={() => setHoveredPlayerIndex(game.players.indexOf(s.name))}
                onLeave={() => setHoveredPlayerIndex(null)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── BOTTOM: local player seat — overlap bottom edge ── */}
      <div className="flex flex-col items-center gap-2 shrink-0 relative z-10 -mt-5 pb-3 px-3">

        {/* Local player seat chip */}
        <div className="relative">
        {currentUsername === game.currentDealer && (
          <div className="absolute -top-1 -right-1 z-20 bg-yellow-400 text-black text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
            P
          </div>
        )}
        <div
          ref={(el) => { playerRefs.current[localPlayerIndex] = el; }}
          className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border shadow-lg ${
            isMyTurn && !allHandsEmpty
              ? 'bg-blue-900/80 border-blue-400/60'
              : 'bg-black/60 border-white/15'
          }`}
          style={{ backdropFilter: 'blur(8px)' }}
        >
          {/* Mini hand cards */}
          <div className="flex gap-0.5 items-end h-4">
            {Array.from({ length: Math.min(myHandCount, 7) }).map((_, i) => (
              <div
                key={i}
                className="w-2 h-3.5 rounded-[2px] border border-white/25 bg-gradient-to-b from-slate-600 to-slate-800"
                style={{ transform: `rotate(${(i - Math.min(myHandCount, 7) / 2) * 5}deg)` }}
              />
            ))}
          </div>

          {/* Won tricks deck button */}
          {myWonTricks.length > 0 && (
            <button
              onClick={() => setShowMyWonTricks(true)}
              className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/35 transition-colors duration-150 shrink-0 group"
              title="Ver tus bazas ganadas"
            >
              <Layers size={13} className="text-amber-400" />
              <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold leading-none">
                {myWonTricks.length}
              </span>
            </button>
          )}

          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
              isMyTurn && !allHandsEmpty ? 'bg-blue-500 text-white' : 'bg-white/20 text-white/70'
            }`}
          >
            {(currentUsername ?? '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[11px] font-semibold ${isMyTurn && !allHandsEmpty ? 'text-white' : 'text-white/75'}`}>
              {currentUsername ?? 'Tú'}
            </span>
            <span className="text-[10px] text-white/40">
              {myTricks}/{myBid} baza{myBid !== 1 ? 's' : ''}
            </span>
            {isMyTurn && !allHandsEmpty && (
              <span className="flex items-center gap-1 text-[9px] font-bold text-blue-200 bg-blue-500/30 border border-blue-400/30 rounded px-1 leading-none">
                <Crown size={9} />
                TURNO
              </span>
            )}
            {!isMyTurn && myHand !== null && myHand.length > 0 && !allHandsEmpty && (
              <span className="text-[10px] text-white/35 italic">
                Esperando a {game.currentTurnPlayer}…
              </span>
            )}
          </div>
        </div>
        </div>

        {/* Cards */}
        {myHand !== null ? (
          myHand.length === 0 ? (
            <p className="text-sm text-white/30 italic">Sin cartas.</p>
          ) : (
            <div className="flex flex-wrap justify-center gap-2 items-end">
              {myHand.map((card) => {
                const legal = !isMyTurn || game.renuncioModeEnabled || playableIds.has(card.id);
                return (
                  <SpanishCard
                    key={card.id}
                    rank={card.rank}
                    suit={card.suit}
                    trump={card.suit === game.currentTrumpSuit}
                    clickable={isMyTurn && legal}
                    disabled={isMyTurn && !legal}
                    onClick={isMyTurn && legal ? () => onPlayCard(card) : undefined}
                  />
                );
              })}
            </div>
          )
        ) : (
          <p className="text-sm text-white/30 italic">No eres jugador en esta partida.</p>
        )}

        {allHandsEmpty && (
          <div className="flex flex-col items-center gap-2 pt-2 border-t border-white/10 w-full">
            <p className="text-sm text-white/60">Todas las bazas jugadas.</p>
            <button
              onClick={onFinishRound}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition duration-200 shadow-sm"
            >
              <CheckCircle size={16} />
              Ver puntos de la ronda
            </button>
          </div>
        )}
      </div>

      {/* ── WON TRICKS MODAL ── */}
      {showMyWonTricks && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowMyWonTricks(false)}
        >
          <div
            className="bg-slate-900/95 border border-white/15 rounded-2xl p-6 shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-amber-400" />
                <h2 className="text-sm font-bold text-white">Tus bazas ganadas</h2>
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {myWonTricks.length}
                </span>
              </div>
              <button
                onClick={() => setShowMyWonTricks(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors duration-150"
              >
                <X size={14} />
              </button>
            </div>

            {myWonTricks.length === 0 ? (
              <p className="text-center text-sm text-white/30 italic py-6">
                Aún no has ganado ninguna baza.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {myWonTricks.map((trick, idx) => (
                  <div key={idx}>
                    <p className="text-[10px] text-white/35 font-medium uppercase tracking-wide mb-2">
                      Baza #{idx + 1}
                    </p>
                    <div className="flex flex-wrap gap-3 items-end">
                      {trick.cards.map((entry, ci) => (
                        <div key={ci} className="flex flex-col items-center gap-1">
                          <span className="text-[9px] text-white/40 truncate max-w-[48px] text-center">
                            {entry.player === currentUsername ? 'Tú' : entry.player}
                          </span>
                          <SpanishCard
                            rank={entry.card.rank}
                            suit={entry.card.suit}
                            trump={entry.card.suit === game.currentTrumpSuit}
                            small
                          />
                        </div>
                      ))}
                    </div>
                    {idx < myWonTricks.length - 1 && (
                      <div className="mt-3 border-t border-white/8" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TRICK COLLECTION ANIMATION OVERLAY ── */}
      {collectingTrick && (() => {
        const coords = getAnimCoords(collectingTrick.winnerIndex);
        if (!coords) return null;
        const { tCX, tCY, dx, dy } = coords;
        const cardW = 56;
        const cardH = 80;
        const count = collectingTrick.cards.length;

        return collectingTrick.cards.map((entry, i) => {
          const offset = (i - (count - 1) / 2) * 22;
          const startLeft = tCX - cardW / 2 + offset;
          const startTop = tCY - cardH / 2;

          return (
            <div
              key={i}
              className="trick-card"
              style={{
                left: startLeft,
                top: startTop,
                width: cardW,
                height: cardH,
                transform: collectingTrick.animating
                  ? `translate(${dx - offset}px, ${dy}px) scale(0.6)`
                  : 'translate(0, 0) scale(1)',
                opacity: collectingTrick.animating ? 0 : 1,
              }}
            >
              <SpanishCard
                rank={entry.card.rank}
                suit={entry.card.suit}
                trump={entry.card.suit === game.currentTrumpSuit}
              />
            </div>
          );
        });
      })()}
    </div>
  );
}
