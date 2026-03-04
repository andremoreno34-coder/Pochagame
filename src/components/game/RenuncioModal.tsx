import { AlertTriangle, ChevronRight, XCircle, CheckCircle, Shield } from 'lucide-react';
import type { Game } from '../../types/game';
import { SpanishCard } from './SpanishCard';
import type { Card } from '../../utils/cards';

interface RenuncioModalProps {
  game: Game;
  currentUsername: string | undefined;
  isCreator: boolean;
  onNextRound: () => void;
}

export function RenuncioModal({ game, currentUsername, isCreator, onNextRound }: RenuncioModalProps) {
  const latestEntry = game.roundScores[game.roundScores.length - 1];
  if (!latestEntry?.renuncio) return null;

  const { playerId, penalty, totalBazasPedidas, hand, legalCards, playedCard } = latestEntry.renuncio;

  const isLastRound = game.currentRoundIndex === game.rounds.length - 1;
  const isYou = playerId === currentUsername;

  const isPlayedCard = (card: Card) =>
    card.suit === playedCard.suit && card.rank === playedCard.rank;

  const isLegalCard = (card: Card) =>
    legalCards.some((c) => c.suit === card.suit && c.rank === card.rank);

  return (
    <div
      className="renuncio-panel-in fixed top-0 right-0 h-full z-[60] flex flex-col w-full sm:w-[410px]"
      style={{
        background: 'rgba(4, 8, 16, 0.75)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderLeft: '1px solid rgba(239,68,68,0.18)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.55)',
      }}
    >
      <div className="flex flex-col h-full overflow-hidden">

        <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-white/8"
          style={{ background: 'linear-gradient(180deg, rgba(127,29,29,0.35) 0%, transparent 100%)' }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/15 border border-red-500/35 flex items-center justify-center mt-0.5">
              <AlertTriangle size={20} className="text-red-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white leading-tight tracking-tight">
                {isYou ? '¡Has RENUNCIADO!' : `¡${playerId} ha RENUNCIADO!`}
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Se ha jugado una carta ilegal, rompiendo las reglas obligatorias.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3.5 px-3 py-2 rounded-lg bg-red-950/40 border border-red-500/20">
            <AlertTriangle size={13} className="text-red-400 shrink-0" />
            <p className="text-xs text-slate-300 leading-relaxed">
              <span className="font-bold text-red-300">Penalización:</span>{' '}
              <span className="text-white font-semibold">{Math.abs(penalty)} pts</span> para{' '}
              <span className="font-semibold text-white">{isYou ? 'ti' : playerId}</span>
              {' '}({totalBazasPedidas} baza{totalBazasPedidas !== 1 ? 's' : ''} × −5).{' '}
              El resto puntúa automáticamente.
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
              Mano de {isYou ? 'ti' : playerId} en ese momento
            </p>

            <div className="flex flex-wrap gap-2.5 justify-start">
              {hand.map((card, i) => {
                const played = isPlayedCard(card);
                const legal = !played && isLegalCard(card);

                return (
                  <div key={`${card.suit}-${card.rank}-${i}`} className="flex flex-col items-center gap-1">
                    <div
                      className={[
                        'rounded-xl transition-all duration-200',
                        played ? 'card-shake' : '',
                      ].filter(Boolean).join(' ')}
                      style={
                        played
                          ? {
                              outline: '2px solid rgb(239,68,68)',
                              outlineOffset: '2px',
                              boxShadow: '0 0 12px rgba(239,68,68,0.55)',
                            }
                          : legal
                          ? undefined
                          : { opacity: 0.38 }
                      }
                    >
                      <div className={legal ? 'card-pulse-gold rounded-xl' : ''}>
                        <SpanishCard
                          rank={card.rank}
                          suit={card.suit}
                          trump={card.suit === game.currentTrumpSuit}
                          small
                        />
                      </div>
                    </div>

                    {played && (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-red-400 uppercase tracking-wide">
                        <XCircle size={9} />
                        Ilegal
                      </span>
                    )}
                    {legal && (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-400 uppercase tracking-wide">
                        <CheckCircle size={9} />
                        Legal
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 px-3 py-2.5 rounded-lg bg-white/4 border border-white/8">
              <div className="flex items-center gap-1.5 text-[11px] text-red-400">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ outline: '2px solid rgb(239,68,68)', outlineOffset: '1px' }} />
                Carta jugada (ilegal)
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-amber-400">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ boxShadow: '0 0 0 2px rgba(251,191,36,0.7)' }} />
                Podría haber jugado
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <div className="w-2.5 h-2.5 rounded-sm bg-slate-600 opacity-40" />
                Otras cartas
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-lg bg-slate-800/50 border border-white/8 px-3.5 py-3">
            <Shield size={14} className="text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400 leading-relaxed">
              Cuando un jugador renuncia, pierde todos los puntos de sus bazas apostadas y el resto de
              jugadores obtiene sus puntos automáticamente sin importar el resultado de la ronda.
            </p>
          </div>
        </div>

        <div className="renuncio-btn-fade-in flex-shrink-0 px-5 pb-6 pt-3 border-t border-white/8">
          {isCreator ? (
            <button
              onClick={onNextRound}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-150 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                boxShadow: '0 4px 20px rgba(29,78,216,0.45)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 28px rgba(29,78,216,0.65)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(29,78,216,0.45)';
              }}
            >
              <ChevronRight size={18} />
              {isLastRound ? 'Ver resultados finales' : 'Siguiente ronda'}
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 py-3">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse" />
              <p className="text-xs text-slate-500 italic">
                Esperando a que el creador inicie la siguiente ronda…
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
