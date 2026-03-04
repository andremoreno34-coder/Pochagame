import { useNavigate } from 'react-router-dom';
import { Users, Trophy, Eye, Plus } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import type { Game } from '../../types/game';

const statusLabel: Record<string, string> = {
  waiting: 'esperando',
  playing: 'en juego',
  finished: 'terminada',
};

const roundModeLabel: Record<string, string> = {
  ascending: 'Ascendente',
  descending: 'Descendente',
  combined: 'Combinado',
};

function computeWinner(game: Game): { name: string; score: number } | null {
  if (game.roundScores.length === 0) return null;
  const totals: Record<string, number> = {};
  for (const entry of game.roundScores) {
    for (const [player, s] of Object.entries(entry.scores)) {
      totals[player] = (totals[player] ?? 0) + s.points;
    }
  }
  let winner = '';
  let best = -Infinity;
  for (const [player, score] of Object.entries(totals)) {
    if (score > best) { best = score; winner = player; }
  }
  return winner ? { name: winner, score: best } : null;
}

interface Props {
  onCreateClick: () => void;
}

export function LocalGamesSection({ onCreateClick }: Props) {
  const { user } = useAuth();
  const { games, joinGame } = useGame();
  const navigate = useNavigate();

  const ongoingGames = games.filter((g) => g.status !== 'finished');
  const finishedGames = games.filter((g) => g.status === 'finished');

  const handleJoin = (gameId: string) => {
    if (user) {
      joinGame(gameId, user.username);
      navigate(`/game/${gameId}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">Partidas locales</h2>
          <button
            onClick={onCreateClick}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition duration-200"
          >
            <Plus size={18} />
            Nueva partida
          </button>
        </div>

        <div className="space-y-3">
          {ongoingGames.length === 0 ? (
            <p className="text-center text-slate-500 py-8">
              No hay partidas locales. ¡Crea una para empezar!
            </p>
          ) : (
            ongoingGames.map((game) => {
              const inGame = game.players.includes(user?.username ?? '');
              const canJoin = !inGame && game.players.length < game.maxPlayers && game.status === 'waiting';

              return (
                <div key={game.id} className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-800">{game.name}</h3>
                    <button
                      onClick={() => inGame ? navigate(`/game/${game.id}`) : handleJoin(game.id)}
                      disabled={!inGame && !canJoin}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition duration-200 disabled:bg-slate-400 disabled:cursor-not-allowed"
                    >
                      {inGame ? 'Entrar' : 'Unirse'}
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded capitalize">
                      {statusLabel[game.status] ?? game.status}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={16} />
                      {game.players.length}/{game.maxPlayers}
                    </span>
                    <span className="text-slate-500">Modo: {roundModeLabel[game.roundMode] ?? game.roundMode}</span>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="text-slate-600">Jugadores: </span>
                    <span className="text-slate-800">{game.players.join(', ')}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {finishedGames.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-2 mb-5">
            <Trophy size={20} className="text-amber-500" />
            <h2 className="text-xl font-bold text-slate-800">Partidas terminadas</h2>
          </div>
          <div className="space-y-3">
            {finishedGames.map((game) => {
              const winner = computeWinner(game);
              return (
                <div key={game.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50 hover:border-slate-300 transition">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-800">{game.name}</h3>
                    <button
                      onClick={() => navigate(`/game/${game.id}`)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm rounded-lg transition duration-200"
                    >
                      <Eye size={15} />
                      Ver resultados
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600 flex-wrap">
                    <span className="px-2 py-1 bg-slate-200 text-slate-600 rounded">
                      {game.roundScores.length} rondas
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={16} />
                      {game.players.length} jugadores
                    </span>
                    <span className="text-slate-500">Modo: {roundModeLabel[game.roundMode] ?? game.roundMode}</span>
                  </div>
                  {winner && (
                    <div className="mt-2 text-sm flex items-center gap-1">
                      <Trophy size={14} className="text-amber-500" />
                      <span className="text-slate-600">Ganador: </span>
                      <span className="font-semibold text-amber-700">{winner.name}</span>
                      <span className="text-slate-500 ml-1">({winner.score} pts)</span>
                    </div>
                  )}
                  <div className="mt-1 text-sm">
                    <span className="text-slate-600">Jugadores: </span>
                    <span className="text-slate-700">{game.players.join(', ')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
