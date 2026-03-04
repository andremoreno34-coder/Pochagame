import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { LogOut, User, Monitor, Wifi } from 'lucide-react';
import { TableLayout } from '../components/TableLayout';
import { CreateGameForm } from '../components/lobby/CreateGameForm';
import { LocalGamesSection } from '../components/lobby/LocalGamesSection';
import { OnlineRoomsSection } from '../components/lobby/OnlineRoomsSection';
import { createRoom } from '../services/roomService';
import { supabase } from '../lib/supabase';
import type { GameFormData } from '../components/lobby/CreateGameForm';

type LobbyMode = 'local' | 'online';

export function Lobby() {
  const { user, logout } = useAuth();
  const { addGame } = useGame();
  const navigate = useNavigate();
  const [mode, setMode] = useState<LobbyMode>('online');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateLocal = (data: GameFormData) => {
    if (!user) return;
    const newGame = addGame({
      name: data.name,
      maxPlayers: data.maxPlayers,
      maxCardsPerPlayer: data.maxCardsPerPlayer,
      roundMode: data.roundMode,
      createdBy: user.username,
      renuncioModeEnabled: data.renuncioModeEnabled,
    });
    setShowCreateForm(false);
    navigate(`/game/${newGame.id}`);
  };

  const handleCreateOnline = async (data: GameFormData) => {
    if (!user?.profileId) return;
    setCreateLoading(true);
    setCreateError(null);
    try {
      const result = await createRoom({
        host_profile_id: user.profileId,
        name: data.name,
        max_players: data.maxPlayers,
        max_cards_per_player: data.maxCardsPerPlayer,
        round_mode: data.roundMode,
        renuncio_mode_enabled: data.renuncioModeEnabled,
        dev_only: user.devMode,
        is_public: data.isPublic,
      });

      const { error: joinError } = await supabase
        .from('room_players')
        .insert({ room_id: result.room.id, profile_id: user.profileId });
      if (joinError && (joinError as { code?: string }).code !== '23505') {
        throw joinError;
      }

      setShowCreateForm(false);
      navigate(`/room/${result.room.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Error al crear la sala');
    } finally {
      setCreateLoading(false);
    }
  };

  const nav = (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <h1 className="text-2xl font-bold text-slate-800">Pocha</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:text-blue-600 rounded-lg transition duration-200"
            >
              <User size={18} />
              <span className="font-medium">{user?.username}</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition duration-200"
            >
              <LogOut size={18} />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </nav>
  );

  if (showCreateForm) {
    return (
      <TableLayout>
        {nav}
        {createError && (
          <div className="max-w-[520px] mx-auto mt-4 px-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {createError}
            </div>
          </div>
        )}
        <CreateGameForm
          title={mode === 'online' ? 'Crear sala online' : 'Crear partida local'}
          submitLabel={mode === 'online' ? 'Crear sala' : 'Crear partida'}
          onSubmit={mode === 'online' ? handleCreateOnline : handleCreateLocal}
          onCancel={() => { setShowCreateForm(false); setCreateError(null); }}
          loading={createLoading}
          showVisibilityToggle={mode === 'online'}
        />
      </TableLayout>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      {nav}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-1 p-1 bg-white rounded-xl shadow-sm border border-slate-200 w-fit mb-6">
          <button
            onClick={() => setMode('online')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition duration-200 ${
              mode === 'online'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Wifi size={15} />
            Online
          </button>
          <button
            onClick={() => setMode('local')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition duration-200 ${
              mode === 'local'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Monitor size={15} />
            Local / Test
          </button>
        </div>

        {mode === 'online' ? (
          <OnlineRoomsSection onCreateClick={() => { setCreateError(null); setShowCreateForm(true); }} />
        ) : (
          <LocalGamesSection onCreateClick={() => { setCreateError(null); setShowCreateForm(true); }} />
        )}
      </main>
    </div>
  );
}
