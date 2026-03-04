import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { useDevTools, DEV_EMAIL } from '../devToolsContext';
import { User, LogOut, ArrowRight, Copy, Check, Gamepad2, Calendar, Mail, Hash, FlaskConical } from 'lucide-react';

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES') + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export function Profile() {
  const { user, logout } = useAuth();
  const { games } = useGame();
  const { devMode, setDevMode } = useDevTools();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const canUseDevMode = user?.email === DEV_EMAIL;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCopyId = () => {
    if (!user?.playerId) return;
    navigator.clipboard.writeText(user.playerId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const activeGame = user
    ? games.find((g) => g.started && g.status === 'playing' && g.players.includes(user.username))
    : undefined;

  const playerIndex = activeGame ? activeGame.players.indexOf(user!.username) : -1;
  const joinedAt = activeGame ? activeGame.playerJoinedAt[user!.username] : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">

        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
            <User size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Perfil de jugador</h1>
          <p className="text-slate-500 text-sm mt-1">Tu identidad en Pocha</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-800 px-5 py-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Datos del jugador</p>
          </div>
          <div className="p-5 space-y-4">

            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Hash size={13} className="text-slate-400" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">ID de jugador</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-900 rounded-lg px-4 py-2.5 flex items-center">
                  <span className="font-mono text-base font-bold text-emerald-400 tracking-widest">
                    {user?.playerId ?? '—'}
                  </span>
                </div>
                <button
                  onClick={handleCopyId}
                  title="Copiar ID"
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-600 text-xs font-medium min-w-[84px] justify-center"
                >
                  {copied ? (
                    <>
                      <Check size={14} className="text-emerald-500" />
                      <span className="text-emerald-600">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <User size={13} className="text-slate-400" />
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre</p>
                </div>
                <p className="text-sm font-semibold text-slate-800">{user?.username ?? '—'}</p>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Calendar size={13} className="text-slate-400" />
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cuenta creada</p>
                </div>
                <p className="text-sm font-medium text-slate-700">{formatDate(user?.createdAt)}</p>
              </div>
            </div>

            {user?.email && (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Mail size={13} className="text-slate-400" />
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Correo electrónico</p>
                </div>
                <p className="text-sm font-medium text-slate-700">{user.email}</p>
              </div>
            )}
          </div>
        </div>

        {canUseDevMode && (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-300 overflow-hidden">
            <div className="bg-amber-500 px-5 py-3 flex items-center gap-2">
              <FlaskConical size={14} className="text-amber-100" />
              <p className="text-xs font-semibold text-amber-100 uppercase tracking-widest">Modo desarrollo</p>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-slate-600">
                Activa o desactiva las herramientas de prueba y depuración. Solo visible para tu cuenta.
              </p>
              <button
                type="button"
                onClick={() => setDevMode(!devMode)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  devMode
                    ? 'bg-amber-500 text-white border-amber-400 hover:bg-amber-600'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${devMode ? 'bg-white' : 'bg-slate-400'}`}
                />
                {devMode ? 'Desactivar modo desarrollo' : 'Activar modo desarrollo'}
              </button>
            </div>
          </div>
        )}

        {activeGame && playerIndex !== -1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-blue-200 overflow-hidden">
            <div className="bg-blue-600 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gamepad2 size={14} className="text-blue-100" />
                <p className="text-xs font-semibold text-blue-100 uppercase tracking-widest">En la partida</p>
              </div>
              <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                En curso
              </span>
            </div>
            <div className="p-5 space-y-4">

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Partida</p>
                  <p className="text-sm font-semibold text-slate-800 truncate">{activeGame.name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Número de jugador</p>
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center">
                      {playerIndex + 1}
                    </span>
                    <span className="text-sm text-slate-600">de {activeGame.players.length}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Nombre en partida</p>
                  <p className="text-sm font-semibold text-slate-800">{user?.username}</p>
                </div>
                {joinedAt && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Se unió el</p>
                    <p className="text-sm font-medium text-slate-700">{formatDate(joinedAt)}</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => navigate(`/game/${activeGame.id}`)}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition duration-200"
              >
                Volver a la partida
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={() => navigate('/lobby')}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition duration-200 shadow-sm"
          >
            Ir a las partidas
            <ArrowRight size={18} />
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-xl transition duration-200"
          >
            <LogOut size={17} />
            Cerrar sesión
          </button>
        </div>

      </div>
    </div>
  );
}
