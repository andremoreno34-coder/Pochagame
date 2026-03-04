import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Wifi, RefreshCw, AlertCircle, Lock, Globe, KeyRound, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOnlineRooms } from '../../hooks/useOnlineRooms';
import { joinRoom, joinRoomByCode } from '../../services/roomService';
import type { RoomWithPlayers } from '../../types/rooms';

const roundModeLabel: Record<string, string> = {
  ascending: 'Ascendente',
  descending: 'Descendente',
  combined: 'Combinado',
};

const statusLabel: Record<string, string> = {
  waiting: 'Esperando',
  playing: 'En juego',
  finished: 'Terminada',
};

const statusColor: Record<string, string> = {
  waiting: 'bg-emerald-100 text-emerald-800',
  playing: 'bg-blue-100 text-blue-800',
  finished: 'bg-slate-100 text-slate-600',
};

interface Props {
  onCreateClick: () => void;
}

export function OnlineRoomsSection({ onCreateClick }: Props) {
  const { user } = useAuth();
  const { rooms, loading, error, refetch } = useOnlineRooms({
    devMode: user?.devMode ?? false,
    profileId: user?.profileId,
  });
  const navigate = useNavigate();
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [codeInput, setCodeInput] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const handleJoin = async (room: RoomWithPlayers) => {
    if (!user?.profileId) return;
    setJoiningId(room.id);
    setJoinError(null);
    try {
      await joinRoom(room.id, user.profileId);
      navigate(`/room/${room.id}`);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Error al unirse');
    } finally {
      setJoiningId(null);
    }
  };

  const handleEnter = (roomId: string) => {
    navigate(`/room/${roomId}`);
  };

  const handleJoinByCode = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code || !user?.profileId) return;
    setCodeLoading(true);
    setCodeError(null);
    try {
      const result = await joinRoomByCode(code, user.profileId);
      navigate(`/room/${result.room.id}`);
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : 'Código no válido');
    } finally {
      setCodeLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800">Salas online</h2>
            <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full">
              <Wifi size={11} className="text-emerald-500" />
              <span className="text-xs text-emerald-700 font-medium">En tiempo real</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refetch}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition duration-200"
              title="Actualizar"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={onCreateClick}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition duration-200"
            >
              <Plus size={18} />
              Crear sala
            </button>
          </div>
        </div>

        {joinError && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            {joinError}
          </div>
        )}

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="flex items-center gap-2 text-slate-500">
              <RefreshCw size={18} className="animate-spin" />
              <span>Cargando salas...</span>
            </div>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-red-600 text-sm mb-3">{error}</p>
            <button
              onClick={refetch}
              className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
            >
              Reintentar
            </button>
          </div>
        ) : rooms.length === 0 ? (
          <div className="py-12 text-center">
            <Wifi size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No hay salas disponibles</p>
            <p className="text-slate-400 text-sm mt-1">Crea una sala y espera a que otros jugadores se unan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => {
              const isHost = room.host_profile_id === user?.profileId;
              const isMember = !isHost && (room.player_profile_ids ?? []).includes(user?.profileId ?? '');
              const isFull = room.player_count >= room.max_players;
              const isWaiting = room.status === 'waiting';
              const isPlaying = room.status === 'playing';
              const canJoin = isWaiting && !isFull && !isHost && !isMember;

              return (
                <div
                  key={room.id}
                  className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-slate-800 truncate">
                          {room.name ?? `Sala de ${room.host?.nombre ?? '?'}`}
                        </h3>
                        {!room.is_public && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                            <Lock size={10} />
                            Privada
                          </span>
                        )}
                        {room.is_public && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-sky-50 text-sky-600 rounded-full text-xs font-medium">
                            <Globe size={10} />
                            Pública
                          </span>
                        )}
                        {room.dev_only && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                            DEV
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[room.status] ?? 'bg-slate-100 text-slate-600'}`}>
                          {statusLabel[room.status] ?? room.status}
                        </span>
                        <span className="flex items-center gap-1 text-slate-600">
                          <Users size={14} />
                          {room.player_count}/{room.max_players}
                          {isFull && isWaiting && (
                            <span className="text-red-500 text-xs ml-1">llena</span>
                          )}
                        </span>
                        <span className="text-slate-500">
                          Modo: {roundModeLabel[room.round_mode] ?? room.round_mode}
                        </span>
                        {room.renuncio_mode_enabled && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                            Renuncio
                          </span>
                        )}
                      </div>
                      {room.host && (
                        <div className="mt-1.5 text-xs text-slate-500">
                          Creada por <span className="font-medium text-slate-700">{room.host.nombre ?? room.host.player_code}</span>
                          <span className="ml-1 text-slate-400">({room.host.player_code})</span>
                        </div>
                      )}
                      {isHost && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="text-xs text-slate-400">Código:</span>
                          <span className="font-mono text-sm font-bold tracking-widest text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {room.code}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0">
                      {isHost ? (
                        <button
                          onClick={() => handleEnter(room.id)}
                          className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition duration-200"
                        >
                          Gestionar
                        </button>
                      ) : isMember ? (
                        <button
                          onClick={() => isPlaying ? navigate(`/game/${room.id}`) : handleEnter(room.id)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition duration-200"
                        >
                          {isPlaying ? 'Retomar' : 'Entrar'}
                        </button>
                      ) : canJoin ? (
                        <button
                          onClick={() => handleJoin(room)}
                          disabled={joiningId === room.id}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition duration-200"
                        >
                          {joiningId === room.id ? 'Uniéndose...' : 'Unirse'}
                        </button>
                      ) : (
                        <button
                          disabled
                          className="px-4 py-2 bg-slate-200 text-slate-500 text-sm font-medium rounded-lg cursor-not-allowed"
                        >
                          {isFull ? 'Llena' : 'No disponible'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound size={16} className="text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">Unirse con código</h3>
          <span className="text-xs text-slate-400">— para salas privadas</span>
        </div>
        {codeError && (
          <div className="flex items-center gap-2 mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle size={14} className="shrink-0" />
            {codeError}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={codeInput}
            onChange={(e) => {
              setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
              setCodeError(null);
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleJoinByCode(); }}
            placeholder="XXXXXX"
            maxLength={6}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent outline-none font-mono text-center tracking-widest text-lg uppercase placeholder:font-sans placeholder:tracking-normal placeholder:text-base"
          />
          <button
            onClick={handleJoinByCode}
            disabled={codeInput.length < 6 || codeLoading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition duration-200"
          >
            {codeLoading ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <ArrowRight size={15} />
            )}
            Entrar
          </button>
        </div>
      </div>
    </div>
  );
}
