import { useState } from 'react';
import { BarChart2, ChevronDown, ChevronUp } from 'lucide-react';
import type { Game } from '../../types/game';

interface ScoreboardWidgetProps {
  game: Game;
  currentUsername: string | undefined;
}

export function ScoreboardWidget({ game, currentUsername }: ScoreboardWidgetProps) {
  const [open, setOpen] = useState(true);

  if (game.roundScores.length === 0) return null;

  const totals: Record<string, number> = {};
  for (const player of game.players) {
    totals[player] = game.roundScores.reduce(
      (sum, entry) => sum + (entry.scores[player]?.points ?? 0),
      0
    );
  }

  const sorted = [...game.players].sort((a, b) => (totals[b] ?? 0) - (totals[a] ?? 0));
  const leader = sorted[0];
  const maxScore = Math.max(1, totals[leader] ?? 1);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition duration-150"
      >
        <div className="flex items-center gap-2">
          <BarChart2 size={15} className="text-slate-500" />
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Marcador</span>
          <span className="text-xs px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded font-medium">
            {game.roundScores.length} ronda{game.roundScores.length !== 1 ? 's' : ''}
          </span>
        </div>
        {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </button>

      {open && (
        <div className="px-4 py-3 bg-white space-y-2">
          {sorted.map((player, idx) => {
            const isYou = player === currentUsername;
            const isLeading = player === leader;
            const total = totals[player] ?? 0;
            const barWidth = maxScore > 0 ? Math.max(6, Math.round((total / maxScore) * 100)) : 6;

            return (
              <div key={player} className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-4 text-right shrink-0">{idx + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-xs font-medium ${isYou ? 'text-blue-700' : 'text-slate-700'}`}>
                      {player}{isYou ? ' (tú)' : ''}
                    </span>
                    <span className={`text-xs font-bold ${isLeading ? 'text-emerald-700' : 'text-slate-600'}`}>
                      {total}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isLeading ? 'bg-emerald-400' : isYou ? 'bg-blue-400' : 'bg-slate-300'}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
