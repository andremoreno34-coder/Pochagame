import { ChevronRight, Trophy, AlertTriangle } from 'lucide-react';
import type { Game } from '../../types/game';

interface ScoringPhaseProps {
  game: Game;
  currentUsername: string | undefined;
  isCreator: boolean;
  onNextRound: () => void;
}

export function ScoringPhase({ game, currentUsername, isCreator, onNextRound }: ScoringPhaseProps) {
  const isLastRound = game.currentRoundIndex === game.rounds.length - 1;
  const latestEntry = game.roundScores[game.roundScores.length - 1] ?? null;

  const cumulativeTotals: Record<string, number> = {};
  for (const player of game.players) {
    cumulativeTotals[player] = game.roundScores.reduce(
      (sum, entry) => sum + (entry.scores[player]?.points ?? 0),
      0
    );
  }

  const sortedPlayers = [...game.players].sort(
    (a, b) => (cumulativeTotals[b] ?? 0) - (cumulativeTotals[a] ?? 0)
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Resultados de la ronda {game.currentRoundIndex + 1}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Apuesta exacta: +10 + bazas &nbsp;·&nbsp; Fallo: −10 × |apuesta − bazas|
          </p>
        </div>
        {isLastRound && (
          <span className="flex items-center gap-1 text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded-full font-medium">
            <Trophy size={12} />
            Última ronda
          </span>
        )}
      </div>

      {latestEntry?.renuncio && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              RENUNCIO — {latestEntry.renuncio.playerId === currentUsername ? 'Has renunciado' : `${latestEntry.renuncio.playerId} ha renunciado`}
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              Total apostado en la ronda: {latestEntry.renuncio.totalBazasPedidas} baza{latestEntry.renuncio.totalBazasPedidas !== 1 ? 's' : ''} · Penalización: {latestEntry.renuncio.penalty} pts · El resto puntúa por acierto automático.
            </p>
          </div>
        </div>
      )}

      {latestEntry && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 pr-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Jugador</th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Apuesta</th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Bazas</th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Puntos</th>
                <th className="text-center py-2 pl-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedPlayers.map((player) => {
                const entry = latestEntry.scores[player];
                if (!entry) return null;
                const exact = entry.bid === entry.tricks;
                const isYou = player === currentUsername;
                const isRenuncio = latestEntry.renuncio?.playerId === player;
                const rowClass = isRenuncio ? 'bg-red-50' : isYou ? 'bg-blue-50' : '';
                return (
                  <tr key={player} className={rowClass}>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-1.5">
                        {isRenuncio && <AlertTriangle size={12} className="text-red-500 shrink-0" />}
                        <span className={`font-medium ${isRenuncio ? 'text-red-800' : isYou ? 'text-blue-800' : 'text-slate-800'}`}>
                          {player}{isYou ? ' (tú)' : ''}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-600">{entry.bid}</td>
                    <td className="py-2.5 px-2 text-center text-slate-600">{entry.tricks}</td>
                    <td className="py-2.5 px-2 text-center">
                      <span className={`inline-block font-bold px-2 py-0.5 rounded text-xs ${exact ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {entry.points > 0 ? `+${entry.points}` : entry.points}
                      </span>
                    </td>
                    <td className="py-2.5 pl-2 text-center font-bold text-slate-800">
                      {cumulativeTotals[player] ?? 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {game.roundScores.length > 1 && (
        <div>
          <p className="text-xs text-slate-500 font-medium uppercase mb-2">Historial de puntos</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-1.5 pr-2 text-slate-500 font-medium">Ronda</th>
                  {game.players.map((p) => (
                    <th key={p} className="text-center py-1.5 px-1 text-slate-500 font-medium truncate max-w-[60px]">
                      {p === currentUsername ? 'Tú' : p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {game.roundScores.map((entry) => (
                  <tr key={entry.roundIndex} className={entry.roundIndex === game.currentRoundIndex ? 'bg-slate-50' : ''}>
                    <td className="py-1.5 pr-2 text-slate-600 font-medium">
                      <span className="flex items-center gap-1">
                        {entry.roundIndex + 1}
                        {entry.renuncio && <AlertTriangle size={10} className="text-red-400 shrink-0" />}
                      </span>
                    </td>
                    {game.players.map((p) => {
                      const s = entry.scores[p];
                      const exact = s && s.bid === s.tricks;
                      return (
                        <td key={p} className="py-1.5 px-1 text-center">
                          <span className={exact ? 'text-emerald-700 font-semibold' : 'text-red-600 font-semibold'}>
                            {s ? (s.points > 0 ? `+${s.points}` : s.points) : '—'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isCreator ? (
        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={onNextRound}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition duration-200 shadow-sm"
          >
            <ChevronRight size={16} />
            {isLastRound ? 'Ver resultados finales' : 'Siguiente ronda'}
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic pt-1 border-t border-slate-100">
          Esperando a que el creador inicie la siguiente ronda...
        </p>
      )}
    </div>
  );
}
