import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, Crown, CheckCircle, Circle,
  LogOut, Play, Wifi, AlertCircle, Clock, RefreshCw,
  Copy, Check, Lock, Globe,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { useRoomDetail } from '../hooks/useRoomDetail';
import { leaveRoom, setReady, startRoom } from '../services/roomService';
import { supabase } from '../lib/supabase';

const roundModeLabel: Record<string, string> = {
  ascending: 'Ascendente',
  descending: 'Descendente',
  combined: 'Combinado',
};

export function OnlineRoom() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { createGameFromRoom } = useGame();
  const navigate = useNavigate();
  const { room, players, loading, error, refetch } = useRoomDetail(id ?? '');

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const hasJoinedGameRef = useRef(false);
  const hasAutoJoinedRef = useRef(false);
  const playersRef = useRef(players);
  useEffect(() => { playersRef.current = players; }, [players]);

  const handleCopyCode = () => {
    if (!room?.code) return;
    navigator.clipboard.writeText(room.code).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  const myPlayer = players.find((p) => p.profile_id === user?.profileId);
  const isHost = room?.host_profile_id === user?.profileId;
  const nonHostPlayers = players.filter((p) => p.profile_id !== room?.host_profile_id);
  const allReady = players.length >= 2 && nonHostPlayers.length > 0 && nonHostPlayers.every((p) => p.is_ready);
  const canStart = isHost && players.length >= 2 && room?.status === 'waiting';

  useEffect(() => {
    if (!room || !id) return;
    if (hasJoinedGameRef.current) return;
    if (room.status !== 'playing') return;
    hasJoinedGameRef.current = true;
    if (isHost) {
      const latestPlayers = playersRef.current;
      if (latestPlayers.length > 0) {
        createGameFromRoom(room, latestPlayers);
      }
    }
    navigate(`/game/${id}`, { replace: true });
  }, [room?.status, room?.id, isHost]);

  useEffect(() => {
    if (!room || !id || room.status !== 'waiting') return;
    const interval = setInterval(() => { refetch(); }, 3000);
    return () => clearInterval(interval);
  }, [room?.id, room?.status]);

  useEffect(() => {
    if (loading || !room || !user?.profileId) return;
    if (hasAutoJoinedRef.current) return;

    const alreadyJoined = players.some((p) => p.profile_id === user.profileId);
    if (alreadyJoined) return;

    if (room.status !== 'waiting') {
      setActionError('Esta sala ya no está disponible para unirse.');
      setTimeout(() => navigate('/lobby'), 2500);
      return;
    }

    hasAutoJoinedRef.current = true;

    (async () => {
      const { error: insertError } = await supabase.from('room_players').insert({
        room_id: room.id,
        profile_id: user.profileId,
        seat_index: players.length,
        is_ready: false,
      });

      if (insertError) {
        console.error('JOIN ERROR:', insertError);
        hasAutoJoinedRef.current = false;
        setActionError(insertError.message ?? 'Error al unirse a la sala');
        setTimeout(() => navigate('/lobby'), 2500);
        return;
      }

      refetch();
    })();
  }, [loading, room?.id, room?.status, players, user?.profileId]);

  const withAction = async (fn: () => Promise<void>) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleReady = () => withAction(async () => {
    if (!user?.profileId || !id) return;
    await setReady(id, user.profileId, !myPlayer?.is_ready);
  });

  const handleLeave = () => withAction(async () => {
    if (!user?.profileId || !id) return;
    await leaveRoom(id, user.profileId);
    navigate('/lobby');
  });

  const handleStart = () => withAction(async () => {
    if (!user?.profileId || !id) return;
    await startRoom(id, user.profileId);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-500">
          <RefreshCw size={20} className="animate-spin" />
          <span>Cargando sala...</span>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full text-center">
          <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
          <h2 className="text-lg font-bold text-slate-800 mb-1">Sala no encontrada</h2>
          <p className="text-slate-500 text-sm mb-5">{error ?? 'Esta sala no existe o ha sido eliminada.'}</p>
          <button
            onClick={() => navigate('/lobby')}
            className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg transition"
          >
            Volver al lobby
          </button>
        </div>
      </div>
    );
  }

  const hostProfile = players.find((p) => p.profile_id === room.host_profile_id)?.profile;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      <nav className="bg-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/lobby')}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-lg font-bold text-slate-800 leading-tight">
                  {room.name ?? `Sala de ${hostProfile?.nombre ?? '?'}`}
                </h1>
                <div className="flex items-center gap-1.5">
                  <Wifi size={11} className="text-emerald-500" />
                  <span className="text-xs text-emerald-600 font-medium">En tiempo real</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 hidden sm:block">{user?.username}</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">
        {actionError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            {actionError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Modo de rondas</p>
            <p className="font-semibold text-slate-800">{roundModeLabel[room.round_mode] ?? room.round_mode}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Jugadores</p>
            <p className="font-semibold text-slate-800">
              {players.length} / {room.max_players}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Máx. cartas</p>
            <p className="font-semibold text-slate-800">{room.max_cards_per_player} por jugador</p>
          </div>
        </div>

        <div className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
          room.is_public
            ? 'bg-sky-50 border-sky-200'
            : 'bg-slate-800 border-slate-700'
        }`}>
          <div className="flex items-center gap-2.5">
            {room.is_public ? (
              <Globe size={15} className="text-sky-500 shrink-0" />
            ) : (
              <Lock size={15} className="text-slate-400 shrink-0" />
            )}
            <div>
              <span className={`text-sm font-medium ${room.is_public ? 'text-sky-700' : 'text-white'}`}>
                {room.is_public ? 'Sala pública' : 'Sala privada'}
              </span>
              <span className={`ml-2 text-xs ${room.is_public ? 'text-sky-500' : 'text-slate-400'}`}>
                {room.is_public ? '— visible en el lobby' : '— solo por código'}
              </span>
            </div>
          </div>
          <button
            onClick={handleCopyCode}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-mono font-bold tracking-widest transition duration-200 ${
              room.is_public
                ? 'bg-white border border-sky-200 text-slate-700 hover:border-sky-400'
                : 'bg-slate-700 hover:bg-slate-600 text-white'
            }`}
            title="Copiar código"
          >
            {room.code}
            {codeCopied ? (
              <Check size={13} className="text-emerald-500" />
            ) : (
              <Copy size={13} className="opacity-60" />
            )}
          </button>
        </div>

        {room.renuncio_mode_enabled && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-lg text-orange-700 text-sm font-medium">
            <AlertCircle size={15} />
            Modo RENUNCIO activado — romper una regla implica penalización fuerte
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-2 mb-5">
            <Users size={18} className="text-slate-600" />
            <h2 className="text-lg font-bold text-slate-800">Jugadores en sala</h2>
          </div>

          <div className="space-y-3">
            {players.map((player) => {
              const isMe = player.profile_id === user?.profileId;
              const isRoomHost = player.profile_id === room.host_profile_id;

              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition ${
                    isMe
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      isRoomHost ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {(player.seat_index ?? 0) + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-800 truncate">
                          {player.profile?.nombre ?? player.profile?.player_code ?? 'Jugador'}
                        </span>
                        {isRoomHost && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                            <Crown size={10} />
                            Host
                          </span>
                        )}
                        {isMe && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            Tú
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {player.profile?.player_code ?? ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {player.is_ready ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">
                        <CheckCircle size={14} />
                        Listo
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-sm">
                        <Circle size={14} />
                        Esperando
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {Array.from({ length: room.max_players - players.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center gap-3 p-4 rounded-lg border border-dashed border-slate-200 text-slate-400"
              >
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold">
                  {players.length + i + 1}
                </div>
                <span className="text-sm">Esperando jugador...</span>
              </div>
            ))}
          </div>
        </div>

        {!allReady && players.length >= 2 && room.status === 'waiting' && (
          <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-sm">
            <Clock size={15} />
            Esperando a que todos los jugadores estén listos
            {isHost && <span className="ml-1 text-slate-400">(puedes iniciar aunque no todos estén listos)</span>}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          {myPlayer && !isHost && room.status === 'waiting' && (
            <button
              onClick={handleToggleReady}
              disabled={actionLoading}
              className={`flex items-center justify-center gap-2 flex-1 py-3 px-6 font-semibold rounded-lg transition duration-200 disabled:opacity-60 disabled:cursor-not-allowed ${
                myPlayer.is_ready
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {myPlayer.is_ready ? (
                <><Circle size={18} /> No estoy listo</>
              ) : (
                <><CheckCircle size={18} /> Estoy listo</>
              )}
            </button>
          )}

          {isHost && room.status === 'waiting' && (
            <button
              onClick={handleStart}
              disabled={!canStart || actionLoading}
              className="flex items-center justify-center gap-2 flex-1 py-3 px-6 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition duration-200"
            >
              <Play size={18} />
              {actionLoading ? 'Iniciando...' : 'Iniciar partida'}
            </button>
          )}

          <button
            onClick={handleLeave}
            disabled={actionLoading}
            className="flex items-center justify-center gap-2 py-3 px-6 border border-red-200 text-red-600 hover:bg-red-50 font-medium rounded-lg transition duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <LogOut size={18} />
            {isHost ? 'Cerrar sala' : 'Abandonar sala'}
          </button>
        </div>
      </main>
    </div>
  );
}
