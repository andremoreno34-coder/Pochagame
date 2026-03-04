import { useState } from 'react';
import type { Game, PlaceBidResult } from '../../types/game';
import { SpanishCard } from './SpanishCard';
import { assignSeats } from '../../utils/seats';
import { SuitIcon, SUIT_LABEL } from './SuitIcon';
import type { Suit } from '../../utils/cards';
import { MuestraOnTable } from './MuestraOnTable';

interface BiddingPhaseProps {
  game: Game;
  viewAsUsername: string | undefined;
  hotseatMode: boolean;
  onPlaceBid: (bidderName: string, value: number) => PlaceBidResult;
}

export function BiddingPhase({ game, viewAsUsername, hotseatMode, onPlaceBid }: BiddingPhaseProps) {
  const [forbiddenError, setForbiddenError] = useState<string | null>(null);

  const cardsPerPlayer = game.rounds[game.currentRoundIndex];
  const totalTricks = cardsPerPlayer;

  const dealerIndex =
    game.currentDealer && game.players.indexOf(game.currentDealer) >= 0
      ? game.players.indexOf(game.currentDealer)
      : 0;
  const postre = game.players[dealerIndex] ?? null;

  const currentBidderName =
    game.currentBidderIndex != null ? game.players[game.currentBidderIndex] : null;

  const partialSum = Object.values(game.currentBids).reduce((s, v) => s + v, 0);

  const myHand =
    viewAsUsername && game.currentHandsByPlayer
      ? game.currentHandsByPlayer[viewAsUsername] ?? null
      : null;

  const isMyTurn = viewAsUsername === currentBidderName;
  const canAct = isMyTurn;

  let forbiddenValue: number | null = null;
  if (viewAsUsername === postre && isMyTurn) {
    const partial = Object.entries(game.currentBids)
      .filter(([name]) => name !== viewAsUsername)
      .reduce((sum, [, v]) => sum + v, 0);
    const f = totalTricks - partial;
    if (f >= 0 && f <= cardsPerPlayer) forbiddenValue = f;
  }

  const seated = assignSeats(game.players, viewAsUsername ?? '');
  const topSeats = seated.filter((s) => ['top', 'top-left', 'top-right'].includes(s.seat));
  const leftSeats = seated.filter((s) => s.seat === 'left');
  const rightSeats = seated.filter((s) => s.seat === 'right');

  const OpponentChip = ({ player }: { player: string }) => {
    const bid = game.currentBids[player];
    const hasBid = typeof bid === 'number';
    const isCurrentBidder = player === currentBidderName;
    const isPostrePlayer = player === postre;
    const handCount = game.currentHandsByPlayer?.[player]?.length ?? 0;
    const displayCount = Math.min(handCount, 7);

    return (
      <div
        className={`flex flex-col gap-1.5 items-center px-3 py-2.5 rounded-2xl border shadow-lg transition-all duration-200 ${
          isCurrentBidder
            ? 'bg-blue-900/80 border-blue-400/70 shadow-blue-500/20'
            : 'bg-black/60 border-white/15'
        }`}
        style={{ backdropFilter: 'blur(8px)', minWidth: 100 }}
      >
        {/* Card backs */}
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

        {/* Avatar + name row */}
        <div className="flex items-center gap-1.5">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
              isCurrentBidder ? 'bg-blue-500 text-white' : 'bg-white/20 text-white/70'
            }`}
          >
            {player.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1">
              <span
                className={`text-[11px] font-semibold leading-tight truncate max-w-[68px] ${
                  isCurrentBidder ? 'text-white' : 'text-white/75'
                }`}
              >
                {player}
              </span>
              {isPostrePlayer && (
                <span className="text-[8px] px-1 py-0.5 bg-amber-500/40 text-amber-300 rounded font-bold uppercase border border-amber-400/40 leading-none shrink-0">
                  P
                </span>
              )}
            </div>
            {isCurrentBidder && (
              <span className="text-[9px] font-bold text-blue-200 bg-blue-500/30 rounded px-1 leading-none border border-blue-400/30 w-fit mt-0.5">
                TURNO
              </span>
            )}
          </div>
        </div>

        {/* Bid status */}
        <span
          className={`text-[10px] font-medium leading-none ${
            hasBid ? 'text-emerald-400' : 'text-white/30 italic'
          }`}
        >
          {hasBid ? `Apuesta: ${bid}` : '…'}
        </span>
      </div>
    );
  };

  const hasBid = !!(viewAsUsername && typeof game.currentBids[viewAsUsername] === 'number');
  const myHandCount = myHand?.length ?? 0;
  const isPostreLocal = viewAsUsername === postre;

  return (
    <div className="flex flex-col h-full">

      {/* ── TOP OPPONENTS — overlap top edge of table ── */}
      {topSeats.length > 0 && (
        <div className="relative z-10 flex justify-center gap-2 pt-2 px-6 -mb-5">
          {[...topSeats].reverse().map((s) => (
            <OpponentChip key={s.name} player={s.name} />
          ))}
        </div>
      )}

      {/* ── MIDDLE: left | table | right ── */}
      <div className="flex-1 flex min-h-0 px-1">

        {/* Left seats */}
        {leftSeats.length > 0 && (
          <div className="relative z-10 flex flex-col gap-2 justify-center shrink-0 -mr-4 pl-1">
            {leftSeats.map((s) => (
              <OpponentChip key={s.name} player={s.name} />
            ))}
          </div>
        )}

        {/* Mesa central */}
        <div className="flex-1 relative rounded-3xl overflow-hidden bg-emerald-800 shadow-inner min-h-[240px]">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
              backgroundSize: '20px 20px',
            }}
          />
          {/* Muestra card — shown from the start of each round */}
          {game.currentTrumpCard && (
            <MuestraOnTable
              card={game.currentTrumpCard}
              style={{ left: '50%', top: 32 }}
              className="z-10 sample-card-animate"
            />
          )}

          <div className={`relative flex flex-col items-center justify-center h-full px-8 py-6${game.currentTrumpCard ? ' pt-28' : ''}`}>
            <div className="text-center">
              <p className="text-emerald-300 text-base font-medium mb-2">
                {currentBidderName
                  ? currentBidderName === viewAsUsername
                    ? 'Es tu turno de apostar'
                    : `Esperando a ${currentBidderName}…`
                  : 'Todas las apuestas realizadas'}
              </p>
              <p className="text-emerald-500 text-sm">
                Suma parcial:{' '}
                <span className="text-emerald-300 font-semibold">{partialSum}</span>
                {' · '}Bazas en juego:{' '}
                <span className="text-emerald-300 font-semibold">{totalTricks}</span>
              </p>
            </div>
          </div>
          <div className="absolute bottom-3 left-4 right-4 flex items-center gap-3">
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
            {viewAsUsername === postre && (
              <div className="flex items-center gap-1 bg-amber-900/40 rounded-lg px-2 py-1 border border-amber-500/30">
                <span className="text-[10px] text-amber-300 font-semibold uppercase">Postre</span>
              </div>
            )}
          </div>
        </div>

        {/* Right seats */}
        {rightSeats.length > 0 && (
          <div className="relative z-10 flex flex-col gap-2 justify-center shrink-0 -ml-4 pr-1">
            {rightSeats.map((s) => (
              <OpponentChip key={s.name} player={s.name} />
            ))}
          </div>
        )}
      </div>

      {/* ── BOTTOM: local player seat — overlap bottom edge ── */}
      <div className="flex flex-col items-center gap-2 shrink-0 relative z-10 -mt-5 pb-3 px-3">

        {/* Local player seat chip */}
        <div
          className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border shadow-lg ${
            isMyTurn
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
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
              isMyTurn ? 'bg-blue-500 text-white' : 'bg-white/20 text-white/70'
            }`}
          >
            {(viewAsUsername ?? '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-semibold ${isMyTurn ? 'text-white' : 'text-white/75'}`}>
                {viewAsUsername ?? 'Tú'}
              </span>
              {isPostreLocal && (
                <span className="text-[8px] px-1 py-0.5 bg-amber-500/40 text-amber-300 rounded font-bold uppercase border border-amber-400/40 leading-none">
                  P
                </span>
              )}
              {hasBid && viewAsUsername && (
                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/30 text-emerald-300 rounded font-medium border border-emerald-400/30 leading-none">
                  Apuesta: {game.currentBids[viewAsUsername]}
                </span>
              )}
              {isMyTurn && (
                <span className="text-[9px] font-bold text-blue-200 bg-blue-500/30 rounded px-1 leading-none border border-blue-400/30">
                  TURNO
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bid buttons */}
        {(canAct || hotseatMode) && currentBidderName && !hasBid && (
          <div className="flex flex-col items-center gap-2 w-full">
            {forbiddenValue !== null && (
              <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-400/30 rounded-lg px-3 py-1.5 text-center max-w-xs">
                Como Postre no puedes apostar <strong>{forbiddenValue}</strong>.
              </p>
            )}
            {forbiddenError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-1.5 font-medium text-center max-w-xs">
                {forbiddenError}
              </p>
            )}
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider">
                Tu apuesta
              </p>
              <div className="flex flex-wrap justify-center gap-2 max-w-[340px]">
                {Array.from({ length: cardsPerPlayer + 1 }, (_, i) => i).map((v) => {
                  const isForbidden =
                    v === forbiddenValue &&
                    (viewAsUsername === postre || currentBidderName === postre);
                  return (
                    <button
                      key={v}
                      disabled={isForbidden}
                      onClick={() => {
                        if (isForbidden) return;
                        setForbiddenError(null);
                        const bidAs = currentBidderName;
                        const result = onPlaceBid(bidAs, v);
                        if (!result.ok) {
                          setForbiddenError(
                            result.reason === 'not_turn'
                              ? 'Para apostar, espere su turno'
                              : 'Esa apuesta no es válida para el Postre'
                          );
                        }
                      }}
                      className={`w-11 h-11 flex items-center justify-center text-sm font-semibold rounded-lg transition duration-200 ${
                        isForbidden
                          ? 'bg-amber-500/10 text-amber-400/40 cursor-not-allowed border border-amber-400/20 line-through'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                      }`}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Waiting message */}
        {!canAct && !hotseatMode && currentBidderName && viewAsUsername !== currentBidderName && (
          <p className="text-xs text-white/40 italic">
            Esperando a{' '}
            <span className="font-semibold text-white/60">{currentBidderName}</span>{' '}
            apueste…
          </p>
        )}

        {/* Hand */}
        <div className="flex flex-col items-center gap-1.5 w-full">
          <p className="text-[10px] text-white/30 font-medium uppercase tracking-wider">Tu mano</p>
          {myHand !== null ? (
            myHand.length === 0 ? (
              <p className="text-sm text-white/30 italic">Sin cartas.</p>
            ) : (
              <div className="flex flex-wrap justify-center gap-1.5 items-end">
                {myHand.map((card) => (
                  <SpanishCard
                    key={card.id}
                    rank={card.rank}
                    suit={card.suit}
                    trump={card.suit === game.currentTrumpSuit}
                    clickable={false}
                    large={hasBid}
                  />
                ))}
              </div>
            )
          ) : (
            <p className="text-sm text-white/30 italic">No eres jugador en esta partida.</p>
          )}
        </div>
      </div>
    </div>
  );
}
