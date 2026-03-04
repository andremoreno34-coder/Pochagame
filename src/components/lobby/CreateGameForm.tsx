import { useState } from 'react';
import { X, Globe, Lock } from 'lucide-react';
import type { RoundMode } from '../../types/game';

export interface GameFormData {
  name: string;
  maxPlayers: number;
  maxCardsPerPlayer: number;
  roundMode: RoundMode;
  renuncioModeEnabled: boolean;
  isPublic: boolean;
}

interface Props {
  title: string;
  submitLabel: string;
  onSubmit: (data: GameFormData) => void;
  onCancel: () => void;
  loading?: boolean;
  showVisibilityToggle?: boolean;
}

export function CreateGameForm({ title, submitLabel, onSubmit, onCancel, loading, showVisibilityToggle }: Props) {
  const [name, setName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [maxCardsPerPlayer, setMaxCardsPerPlayer] = useState(10);
  const [roundMode, setRoundMode] = useState<RoundMode>('ascending');
  const [renuncioModeEnabled, setRenuncioModeEnabled] = useState(false);
  const [isPublic, setIsPublic] = useState(true);

  const maxAllowedCards = Math.floor(40 / maxPlayers);

  const handleSubmit = () => {
    if (!name.trim() || loading) return;
    onSubmit({
      name: name.trim(),
      maxPlayers,
      maxCardsPerPlayer: Math.min(Math.max(1, maxCardsPerPlayer), maxAllowedCards),
      roundMode,
      renuncioModeEnabled,
      isPublic,
    });
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-xl shadow-2xl border-t-4 border-green-500 w-full max-w-[520px] p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 transition duration-200"
          >
            <X size={22} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre de la partida
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              placeholder="Introduce el nombre de la partida"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Máx. jugadores
            </label>
            <select
              value={maxPlayers}
              onChange={(e) => {
                const val = Number(e.target.value);
                setMaxPlayers(val);
                setMaxCardsPerPlayer((prev) => Math.min(prev, Math.floor(40 / val)));
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            >
              {[3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>{n} jugadores</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Máx. cartas por jugador
              <span className="ml-2 font-normal text-slate-400">
                (máx. {maxAllowedCards} con {maxPlayers} jugadores)
              </span>
            </label>
            <input
              type="number"
              min={1}
              max={maxAllowedCards}
              value={maxCardsPerPlayer}
              onChange={(e) => {
                const parsed = parseInt(e.target.value, 10);
                if (!isNaN(parsed)) {
                  setMaxCardsPerPlayer(Math.max(1, Math.min(parsed, maxAllowedCards)));
                }
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Modo de rondas
            </label>
            <select
              value={roundMode}
              onChange={(e) => setRoundMode(e.target.value as RoundMode)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            >
              <option value="ascending">Ascendente</option>
              <option value="descending">Descendente</option>
              <option value="combined">Combinado</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="block text-sm font-medium text-slate-700">Modo RENUNCIO</span>
              <span className="block text-xs text-slate-400 mt-0.5">
                Las reglas no bloquean cartas; romper una regla implica penalización fuerte.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={renuncioModeEnabled}
              onClick={() => setRenuncioModeEnabled((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                renuncioModeEnabled
                  ? 'bg-orange-500 focus:ring-orange-400'
                  : 'bg-slate-300 focus:ring-slate-400'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform transition duration-200 ${
                  renuncioModeEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {showVisibilityToggle && (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition duration-150 ${
                  isPublic
                    ? 'bg-green-50 border-l-2 border-green-500'
                    : 'hover:bg-slate-50'
                }`}
              >
                <Globe size={17} className={isPublic ? 'text-green-600' : 'text-slate-400'} />
                <div>
                  <span className={`block text-sm font-medium ${isPublic ? 'text-green-700' : 'text-slate-700'}`}>
                    Sala pública
                  </span>
                  <span className="block text-xs text-slate-400 mt-0.5">
                    Aparece en la lista del lobby, cualquiera puede unirse
                  </span>
                </div>
              </button>
              <div className="border-t border-slate-200" />
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition duration-150 ${
                  !isPublic
                    ? 'bg-slate-800 border-l-2 border-slate-900'
                    : 'hover:bg-slate-50'
                }`}
              >
                <Lock size={17} className={!isPublic ? 'text-slate-300' : 'text-slate-400'} />
                <div>
                  <span className={`block text-sm font-medium ${!isPublic ? 'text-white' : 'text-slate-700'}`}>
                    Sala privada
                  </span>
                  <span className={`block text-xs mt-0.5 ${!isPublic ? 'text-slate-400' : 'text-slate-400'}`}>
                    Solo accesible con el código de sala
                  </span>
                </div>
              </button>
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2 px-4 border border-slate-300 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition duration-200"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || loading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
            >
              {loading ? 'Creando...' : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
