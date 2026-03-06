import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame, generateRounds } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { useRoomDetail } from '../hooks/useRoomDetail';
import { supabase } from '../lib/supabase';
import type { Suit } from '../utils/cards';
import type { Game as GameType } from '../types/game';
import { ArrowLeft, Users, PlayCircle, Trophy, FlaskConical, Shuffle, Settings, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { BiddingPhase } from '../components/game/BiddingPhase';
import { PlayingPhase } from '../components/game/PlayingPhase';
import { ScoringPhase } from '../components/game/ScoringPhase';
import { ScoreboardWidget } from '../components/game/ScoreboardWidget';
import { SpanishCard } from '../components/game/SpanishCard';
import { SuitIcon, SUIT_LABEL } from '../components/game/SuitIcon';
import { TableLayout } from '../components/TableLayout';
import { DealingAnimationOverlay } from '../components/game/DealingAnimationOverlay';
import { RenuncioModal } from '../components/game/RenuncioModal';
import { DevOnly } from '../devToolsContext';

const roundModeLabel: Record<string, string> = {
  ascending: 'Ascendente',
  descending: 'Descendente',
  combined: 'Combinado',
};

export function Game() {
  const { id } = useParams<{ id: string }>();
  const { getGameById, startGame, nextRound, finishRound, addTestPlayer, dealCurrentRound, updateRounds, startBidding, placeBid, setBidTest, setTrumpSuit, playCard, replaceGame } = useGame();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [testPlayerName, setTestPlayerName] = useState('');
  const [testBidInputs, setTestBidInputs] = useState<Record<string, string>>({});
  const [hotseatMode, setHotseatMode] = useState(false);
  const [showStatePanel, setShowStatePanel] = useState(true);
  const [preBidCountdown, setPreBidCountdown] = useState<number | null>(null);
  const [isDealingAnimation, setIsDealingAnimation] = useState(false);
  const [dealCountdown, setDealCountdown] = useState<number | null>(null);
  const [renuncioPanelDismissed, setRenuncioPanelDismissed] = useState(false);
  const lastAnimatedRoundRef = useRef<number>(-1);
  // Prevents write-back loops when applying a state received from Supabase
  const isApplyingRemoteUpdateRef = useRef(false);

  const { room } = useRoomDetail(id ?? '');

  

  const game = id ? getGameById(id) : undefined;
  console.log('DEBUG Game.tsx -> id de la URL:', id, 'game:', game);

  // ── Online sync: load initial state from Supabase + subscribe to changes ──
  // Runs once per room ID. Handles page-refresh (game not in context) and
  // keeps all clients in sync via pocha_games realtime updates.
  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    // If the game is not yet in context (page refresh), load it from Supabase
    if (!game) {
      const tryLoad = async (attempts: number) => {
        if (!isMounted) return;
        const { data } = await supabase
          .from('pocha_games')
          .select('state')
          .eq('room_id', id)
          .maybeSingle();
        if (!isMounted) return;
        if (data?.state) {
          isApplyingRemoteUpdateRef.current = true;
          replaceGame(id, data.state as GameType);
        } else if (attempts > 0) {
          setTimeout(() => tryLoad(attempts - 1), 2000);
        }
      };
      tryLoad(10);
    }

    // Subscribe to UPDATE events on pocha_games for this room so all clients
    // receive state changes made by any player in real time.
    const channel = supabase
      .channel(`pocha-game-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pocha_games', filter: `room_id=eq.${id}` },
        (payload) => {
          if (!isMounted) return;
          const remoteState = (payload.new as { state: GameType }).state;
          isApplyingRemoteUpdateRef.current = true;
          replaceGame(id, remoteState);
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Online sync: write game state to Supabase whenever it changes ──
  // All room members can write; the strictly sequential turn order of Pocha
  // prevents concurrent writes. isApplyingRemoteUpdateRef prevents the loop
  // where applying a remote update would re-trigger a write.
 useEffect(() => {
    if (!game) return;

    supabase
      .from('pocha_games')
      .upsert({ room_id: game.id, state: game }, { onConflict: 'room_id' })
      .then(({ error }) => {
        if (error) console.error('UPSERT ERROR:', error);
        else console.log('UPSERT OK:', game.id);
      });
  }, [game?.id]);
  
  const preBiddingActive = (() => {
    if (!game || !game.started || game.currentHandsByPlayer === null) return false;
    const cp = game.rounds[game.currentRoundIndex];
    if (!cp) return false;
    const dealt = game.players.every((p) => (game.currentHandsByPlayer![p]?.length ?? 0) === cp);
    const noLeftover = game.currentTrumpCard === null;
    const blocked = noLeftover && game.currentTrumpSuit === null;
    return game.rounds.length > 0 && dealt && game.currentRoundPhase === 'idle' && !blocked;
  })();

  useEffect(() => {
    if (!preBiddingActive || !game) {
      setPreBidCountdown(null);
      return;
    }
    let count = 3;
    setPreBidCountdown(3);
    const timer = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(timer);
        setPreBidCountdown(null);
        startBidding(game.id);
      } else {
        setPreBidCountdown(count);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [preBiddingActive, game?.id]);

  const needsAutoDeal =
    !!game &&
    game.started &&
    game.status === 'playing' &&
    game.currentHandsByPlayer === null &&
    game.currentRoundIndex > 0;

  useEffect(() => {
    if (!needsAutoDeal || !game) return;
    dealCurrentRound(game.id);
  }, [needsAutoDeal, game?.id]);

  const dealReady =
    !!game &&
    game.started &&
    game.currentHandsByPlayer === null &&
    user?.username === game.createdBy &&
    game.players.length === game.maxPlayers &&
    game.currentRoundIndex === 0;

  useEffect(() => {
    if (!dealReady) {
      setDealCountdown(null);
      return;
    }
    setDealCountdown(5);
  }, [dealReady]);

  useEffect(() => {
    if (dealCountdown === null || !game) return;
    if (dealCountdown === 0) {
      dealCurrentRound(game.id);
      setDealCountdown(null);
      return;
    }
    const id = setTimeout(() => setDealCountdown((p) => (p === null ? null : p - 1)), 1000);
    return () => clearTimeout(id);
  }, [dealCountdown, game?.id]);

  useEffect(() => {
    if (!game || game.currentHandsByPlayer === null) return;
    if (lastAnimatedRoundRef.current !== game.currentRoundIndex) {
      lastAnimatedRoundRef.current = game.currentRoundIndex;
      setIsDealingAnimation(true);
    }
  }, [game?.currentHandsByPlayer, game?.currentRoundIndex]);

  useEffect(() => {
    if (!isDealingAnimation) return;
    const id = setTimeout(() => setIsDealingAnimation(false), 1450);
    return () => clearTimeout(id);
  }, [isDealingAnimation]);

  const currentRoundIndexForReset = game?.currentRoundIndex ?? -1;
  useEffect(() => {
    setRenuncioPanelDismissed(false);
  }, [currentRoundIndexForReset]);

  if (!game) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          <span>Cargando partida...</span>
        </div>
      </div>
    );
  }

  const isCreator = user?.username === game.createdBy;
  const latestRenuncio = game.roundScores[game.roundScores.length - 1]?.renuncio;
  const numPlayers = game.players.length;
  const numPlayersForLimit = game.started ? game.players.length : game.maxPlayers;
  const maxAllowed = numPlayersForLimit > 0 ? Math.floor(40 / numPlayersForLimit) : 0;

  const backButton = (
    <button
      onClick={() => navigate('/lobby')}
      className="flex items-center gap-2 mb-6 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg transition duration-200 shadow-sm"
    >
      <ArrowLeft size={18} />
      Volver al lobby
    </button>
  );

  // ============================================================
  // WAITING ROOM VIEW
  // ============================================================
  const isWaitingRoom =
    !game.started ||
    (game.currentHandsByPlayer === null && game.currentRoundIndex === 0);

  if (isWaitingRoom) {
    return (
      <TableLayout>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          {backButton}

          <div className="bg-white rounded-xl shadow-2xl border-t-4 border-green-500 p-6">
            <div className="border-b border-slate-200 pb-4 mb-6">
              <h1 className="text-2xl font-bold text-slate-800 mb-1">{game.name}</h1>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Sala de partida</p>
              <div className="flex items-center gap-3 mt-2 text-sm">
                <span className="flex items-center gap-1 text-slate-600">
                  <Users size={15} />
                  {game.players.length}/{game.maxPlayers} jugadores
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-600">Modo: {roundModeLabel[game.roundMode] ?? game.roundMode}</span>
                {game.rounds.length > 0 && (
                  <>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600">{game.rounds.length} rondas</span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
                  Jugadores en la partida
                </h3>
                <div className="space-y-2">
                  {game.players.map((player, index) => (
                    <div
                      key={player}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                        {index + 1}
                      </div>
                      <span className="font-medium text-slate-800">{player}</span>
                      {player === user?.username && (
                        <span className="ml-auto text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                          tú
                        </span>
                      )}
                      {player === game.createdBy && (
                        <span className={`${player === user?.username ? '' : 'ml-auto'} text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded`}>
                          creador
                        </span>
                      )}
                    </div>
                  ))}
                  {game.players.length < game.maxPlayers && (
                    <div className="p-3 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 text-center text-sm text-slate-400">
                      Esperando {game.maxPlayers - game.players.length} jugador{game.maxPlayers - game.players.length !== 1 ? 'es' : ''} más...
                    </div>
                  )}
                </div>
              </div>

              {isCreator && !game.started && numPlayers > 0 && (
                <div className="border border-slate-200 bg-slate-50 rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Settings size={18} className="text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                      Configuración de rondas
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">
                    Configura el número de rondas y cartas antes de empezar.
                    Máx. cartas por jugador con {numPlayersForLimit} jugador{numPlayersForLimit !== 1 ? 'es' : ''}: <strong>{maxAllowed}</strong>.
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <button
                      onClick={() => {
                        const generated = generateRounds(numPlayers, game.maxCardsPerPlayer, game.roundMode);
                        updateRounds(game.id, generated);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition duration-200"
                    >
                      <Settings size={13} />
                      Generar rondas por defecto
                    </button>
                    <button
                      onClick={() => {
                        const next = game.rounds.length > 0 ? game.rounds[game.rounds.length - 1] : 1;
                        updateRounds(game.id, [...game.rounds, next]);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition duration-200"
                    >
                      <Plus size={13} />
                      Añadir ronda
                    </button>
                  </div>

                  {game.rounds.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">Sin rondas definidas.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {game.rounds.map((cards, i) => (
                        <div key={i} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2">
                          <span className="text-xs font-semibold text-slate-500 w-16 shrink-0">Ronda {i + 1}</span>
                          <div className="flex items-center gap-1.5 flex-1">
                            <label className="text-xs text-slate-500 whitespace-nowrap">Cartas / jugador</label>
                            <input
                              type="number"
                              min={1}
                              max={maxAllowed}
                              value={cards}
                              onChange={(e) => {
                                const raw = parseInt(e.target.value, 10);
                                const clamped = isNaN(raw) ? 1 : Math.max(1, Math.min(raw, maxAllowed));
                                const updated = game.rounds.map((v, idx) => (idx === i ? clamped : v));
                                updateRounds(game.id, updated);
                              }}
                              className="w-16 px-2 py-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-800 text-center"
                            />
                          </div>
                          <button
                            onClick={() => {
                              const filtered = game.rounds.filter((_, idx) => idx !== i);
                              updateRounds(game.id, filtered);
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-md transition duration-200 border border-red-200 shrink-0"
                          >
                            <Trash2 size={12} />
                            Eliminar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!game.started && isCreator && (
                <button
                  onClick={() => startGame(game.id)}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition duration-200"
                >
                  <PlayCircle size={20} />
                  Comenzar partida
                </button>
              )}

              {game.started && game.currentHandsByPlayer === null && isCreator && (
                <div>
                  <button
                    onClick={() => { setDealCountdown(null); dealCurrentRound(game.id); }}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition duration-200"
                  >
                    <Shuffle size={20} />
                    Repartir cartas
                  </button>
                  {dealCountdown !== null && (
                    <p className="mt-2.5 text-sm text-slate-500 text-center">
                      La partida comienza en{' '}
                      <span className="font-semibold text-slate-700 tabular-nums">{dealCountdown}</span>{' '}
                      {dealCountdown === 1 ? 'segundo' : 'segundos'}...
                    </p>
                  )}
                </div>
              )}

              {game.started && game.currentHandsByPlayer === null && !isCreator && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-blue-800 text-sm">Esperando a que el creador reparta las cartas...</p>
                </div>
              )}

              {user?.username === game.createdBy && !game.started && (
                <DevOnly>
                <div className="border-2 border-dashed border-amber-300 bg-amber-50 rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <FlaskConical size={18} className="text-amber-600" />
                    <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wide">
                      Modo test: añadir jugadores
                    </h3>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={testPlayerName}
                      onChange={(e) => setTestPlayerName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addTestPlayer(game.id, testPlayerName);
                          setTestPlayerName('');
                        }
                      }}
                      placeholder="Nombre del jugador ficticio"
                      className="flex-1 px-3 py-2 text-sm border border-amber-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-800 placeholder-slate-400"
                    />
                    <button
                      onClick={() => {
                        addTestPlayer(game.id, testPlayerName);
                        setTestPlayerName('');
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition duration-200 whitespace-nowrap"
                    >
                      Añadir
                    </button>
                  </div>
                  <p className="text-xs text-amber-700">
                    Solo para desarrollo/pruebas. No crea cuentas reales.
                  </p>
                </div>
                </DevOnly>
              )}
            </div>
          </div>
        </div>
      </TableLayout>
    );
  }

  // ============================================================
  // TABLE VIEW (started && hands dealt)
  // ============================================================
  const cardsPerPlayer = game.rounds[game.currentRoundIndex];
  const totalTricks = cardsPerPlayer;

  const dealtWithNoLeftover = game.currentHandsByPlayer !== null && game.currentTrumpCard === null;
  const biddingBlocked = dealtWithNoLeftover && game.currentTrumpSuit === null;

  const currentBidderName =
    game.currentBidderIndex != null ? game.players[game.currentBidderIndex] : null;

  const cardsDealt =
    game.currentHandsByPlayer !== null &&
    game.players.every(
      (p) => (game.currentHandsByPlayer![p]?.length ?? 0) === cardsPerPlayer
    );

  const trumpPickerNeeded =
    game.currentHandsByPlayer !== null &&
    game.currentTrumpCard === null &&
    game.currentTrumpSuit === null;

  const showPreBidding = preBiddingActive && !isDealingAnimation;

  return (
    <TableLayout>
      <div className="flex flex-col min-h-screen">

        {/* ── Compact header ── */}
        <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 bg-black/30 backdrop-blur-sm border-b border-white/10">
          <button
            onClick={() => navigate('/lobby')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 text-xs font-medium rounded-lg transition duration-200 shrink-0"
          >
            <ArrowLeft size={14} />
            Volver
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <span className="text-white font-bold text-sm truncate">{game.name}</span>
            {game.rounds.length > 0 && (
              <span className="text-white/40 text-xs shrink-0 hidden sm:inline">
                Ronda {game.currentRoundIndex + 1}/{game.rounds.length}
                {' · '}{cardsPerPlayer} cartas
              </span>
            )}
            <span className="flex items-center gap-1 text-white/40 text-xs shrink-0">
              <Users size={12} />
              {game.players.length}
            </span>
          </div>
          <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium bg-green-700/50 text-green-300 border border-green-600/30">
            En juego
          </span>
          {game.renuncioModeEnabled && (
            <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-bold bg-orange-600/40 text-orange-300 border border-orange-500/50 tracking-wide">
              RENUNCIO ON
            </span>
          )}
        </div>

        {/* ── Alert banners ── */}
        {game.players.length < 3 && (
          <div className="shrink-0 px-4 py-1 bg-amber-500/10 border-b border-amber-400/20 text-xs text-amber-300 text-center">
            Modo test: menos de 3 jugadores.
          </div>
        )}
        {(!game.rounds || game.rounds.length === 0) && (
          <div className="shrink-0 px-4 py-1 bg-red-500/10 border-b border-red-400/20 text-xs text-red-400 text-center">
            No hay rondas definidas para esta partida.
          </div>
        )}

        {/* ── Main table area ── */}
        <div className="flex-1 relative" style={{ minHeight: 'calc(100vh - 48px)' }}>

          {/* ── Dealing animation overlay ── */}
          {isDealingAnimation && (
            <DealingAnimationOverlay
              playerCount={game.players.length}
              hasMuestra={game.currentTrumpCard !== null}
            />
          )}

          {/* Estado de la ronda overlay — top-right */}
          <div className="absolute top-4 right-4 z-20 w-72">
            <div className="bg-black/70 backdrop-blur-md rounded-xl border border-amber-500/40 shadow-2xl overflow-hidden">
              <button
                onClick={() => setShowStatePanel((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FlaskConical size={13} className="text-amber-400" />
                  <span className="text-xs font-semibold text-amber-300 uppercase tracking-wide">
                    Estado de la ronda
                  </span>
                </div>
                {showStatePanel
                  ? <ChevronUp size={13} className="text-amber-400/60" />
                  : <ChevronDown size={13} className="text-amber-400/60" />}
              </button>

              {showStatePanel && (
                <div className="border-t border-amber-500/20 px-3 pb-3 space-y-3 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2 pt-3 text-sm">
                    <div className="bg-black/30 border border-white/10 rounded-lg p-2.5">
                      <p className="text-[10px] text-amber-400/80 font-medium uppercase mb-1">Ronda</p>
                      <p className="font-bold text-white text-sm">
                        {game.currentRoundIndex + 1}
                        <span className="font-normal text-white/50 text-xs"> / {game.rounds.length}</span>
                      </p>
                    </div>
                    <div className="bg-black/30 border border-white/10 rounded-lg p-2.5">
                      <p className="text-[10px] text-amber-400/80 font-medium uppercase mb-1">Cartas</p>
                      <p className="font-bold text-white text-sm">{game.rounds[game.currentRoundIndex]}</p>
                    </div>
                    <div className="bg-black/30 border border-white/10 rounded-lg p-2.5">
                      <p className="text-[10px] text-amber-400/80 font-medium uppercase mb-1">Postre</p>
                      <p className="font-semibold text-white/80 text-xs truncate">{game.currentDealer ?? '—'}</p>
                    </div>
                    <div className="bg-black/30 border border-white/10 rounded-lg p-2.5">
                      <p className="text-[10px] text-amber-400/80 font-medium uppercase mb-1">Empieza</p>
                      <p className="font-semibold text-white/80 text-xs truncate">{game.currentStartingPlayer ?? '—'}</p>
                    </div>
                    <div className="bg-black/30 border border-white/10 rounded-lg p-2.5 col-span-2">
                      {game.currentTrumpCard !== null ? (
                        <div className="flex items-center gap-2">
                          <SpanishCard
                            rank={game.currentTrumpCard.rank}
                            suit={game.currentTrumpCard.suit}
                            trump={true}
                            small={true}
                          />
                          <div>
                            <p className="text-[10px] text-amber-400/80 font-medium uppercase mb-0.5">Triunfo</p>
                            <p className="font-semibold text-white/80 capitalize text-xs">{game.currentTrumpSuit}</p>
                            <p className="text-[10px] text-white/30">Fuera de juego</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-[10px] text-amber-400/80 font-medium uppercase mb-1">Palo de triunfo</p>
                          <p className="text-white/40 text-[10px]">40 cartas repartidas — el postre elige.</p>
                        </>
                      )}
                    </div>
                  </div>

                  <DevOnly>
                  <div>
                    <p className="text-[10px] text-amber-400/80 font-medium uppercase mb-1.5">Manos</p>
                    <div className="space-y-1.5">
                      {game.players.map((player) => {
                        const hand = game.currentHandsByPlayer?.[player] ?? [];
                        return (
                          <div key={player} className="bg-black/30 border border-white/10 rounded-lg p-2 text-xs">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-semibold text-white/80">{player}</span>
                              <span className="text-amber-400/80 font-medium">{hand.length} cartas</span>
                            </div>
                            <p className="text-white/35 leading-relaxed">
                              {hand.map((card) => `${card.rank} de ${card.suit}`).join(', ')}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={() => dealCurrentRound(game.id)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium rounded-lg transition duration-200 border border-amber-400/30 w-full justify-center"
                  >
                    <Shuffle size={13} />
                    Volver a repartir (test)
                  </button>
                  </DevOnly>
                </div>
              )}
            </div>
          </div>

          {/* Hotseat indicators — top-left */}
          {hotseatMode && game.currentRoundPhase === 'bidding' && currentBidderName && (
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 border border-blue-400/30 rounded-lg text-xs font-medium text-blue-300 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
              Hotseat — apuesta como <span className="font-bold ml-1">{currentBidderName}</span>
            </div>
          )}
          {hotseatMode && game.currentRoundPhase === 'playing' && game.currentTurnPlayer && (
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-400/30 rounded-lg text-xs font-medium text-green-300 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
              Hotseat — jugando como <span className="font-bold ml-1">{game.currentTurnPlayer}</span>
            </div>
          )}

          {/* ── Trump picker — top-of-tapete overlay ── */}
          {trumpPickerNeeded && !isDealingAnimation && (
            <div className="absolute top-0 left-0 right-0 flex justify-center z-10 pt-16 px-4 pointer-events-none">
              <div
                className="pointer-events-auto rounded-2xl border border-white/15 shadow-2xl p-3 w-full max-w-[260px]"
                style={{ background: '#00000088', backdropFilter: 'blur(12px)' }}
              >
                <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wide mb-2">
                  Elige el palo de triunfo
                </h3>
                {(user?.username === game.currentDealer || hotseatMode) ? (
                  <>
                    <p className="text-[10px] text-white/45 mb-3">
                      {hotseatMode && user?.username !== game.currentDealer
                        ? <>Postre: <span className="font-semibold text-white/65">{game.currentDealer}</span> — elige (hotseat).</>
                        : 'Se repartieron las 40 cartas. Elige el palo de triunfo.'
                      }
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['oros', 'copas', 'espadas', 'bastos'] as Suit[]).map((suit) => {
                        const colorMap: Record<Suit, string> = {
                          oros: 'bg-amber-500/20 hover:bg-amber-500/35 border-amber-400/40 text-amber-300',
                          copas: 'bg-red-500/20 hover:bg-red-500/35 border-red-400/40 text-red-300',
                          espadas: 'bg-slate-500/20 hover:bg-slate-500/35 border-slate-400/40 text-slate-200',
                          bastos: 'bg-emerald-500/20 hover:bg-emerald-500/35 border-emerald-400/40 text-emerald-300',
                        };
                        return (
                          <button
                            key={suit}
                            onClick={() => setTrumpSuit(game.id, suit)}
                            className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-semibold transition duration-200 ${colorMap[suit]}`}
                          >
                            <SuitIcon suit={suit} size={16} />
                            {SUIT_LABEL[suit]}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-[10px] text-white/50">
                    Esperando al postre (<span className="font-semibold text-white/70">{game.currentDealer}</span>) para elegir.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Pre-bidding countdown overlay ── */}
          {showPreBidding && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <div className="pointer-events-auto bg-black/80 backdrop-blur-md border border-white/15 rounded-2xl p-8 shadow-2xl max-w-xs w-full mx-6 text-center">
                <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest mb-1">
                  Apuestas — Ronda {game.currentRoundIndex + 1}
                </h2>
                <p className="text-xs text-white/35 mb-6">
                  Cartas por jugador:{' '}
                  <span className="text-white/60 font-semibold">{cardsPerPlayer}</span>
                  {' · '}Bazas totales:{' '}
                  <span className="text-white/60 font-semibold">{totalTricks}</span>
                </p>
                <p className="text-xs text-white/50 uppercase tracking-wider mb-3">
                  Las apuestas empiezan en:
                </p>
                <div
                  className="text-7xl font-black text-white mb-6 tabular-nums"
                  style={{ textShadow: '0 0 40px rgba(255,255,255,0.25)' }}
                >
                  {preBidCountdown ?? '…'}
                </div>
                <button
                  onClick={() => startBidding(game.id)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs font-medium rounded-lg transition duration-200 border border-white/10"
                >
                  <PlayCircle size={14} />
                  Empezar ahora
                </button>
              </div>
            </div>
          )}

          {/* ── Bidding phase — fills the area ── */}
          {(game.currentRoundPhase === 'bidding' || (game.currentRoundPhase === 'idle' && cardsDealt)) && game.currentHandsByPlayer !== null && (() => {
            const viewAsBidder = hotseatMode ? (currentBidderName ?? user?.username) : user?.username;
            return (
              <div className={game.currentRoundPhase === 'idle' ? 'pointer-events-none opacity-40 h-full' : 'h-full'}>
                <BiddingPhase
                  game={game}
                  viewAsUsername={viewAsBidder}
                  hotseatMode={hotseatMode}
                  onPlaceBid={(bidderName, value) => placeBid(game.id, bidderName, value)}
                />
              </div>
            );
          })()}

          {/* ── Playing phase — fills the area (also shown frozen during renuncio panel) ── */}
          {(game.currentRoundPhase === 'playing' || (game.currentRoundPhase === 'scoring' && !!latestRenuncio && !renuncioPanelDismissed)) && game.currentHandsByPlayer !== null && (() => {
            const isRenuncioFrozen = game.currentRoundPhase === 'scoring' && !!latestRenuncio && !renuncioPanelDismissed;
            const hotseatUsername = hotseatMode ? (game.currentTurnPlayer ?? user?.username) : user?.username;
            return (
              <div className={isRenuncioFrozen ? 'pointer-events-none h-full select-none' : 'h-full'}>
                <PlayingPhase
                  game={game}
                  currentUsername={hotseatUsername}
                  onPlayCard={(card) => {
                    const playAs = hotseatMode ? (game.currentTurnPlayer ?? user?.username) : user?.username;
                    if (playAs) playCard(game.id, playAs, card);
                  }}
                  onFinishRound={() => finishRound(game.id)}
                />
              </div>
            );
          })()}

          {/* Scoreboard shown during non-scoring, non-finished phases (also during renuncio frozen view) */}
          {(game.currentRoundPhase !== 'scoring' || (!!latestRenuncio && !renuncioPanelDismissed)) && game.status !== 'finished' && game.roundScores.length > 0 && (
            <div className="absolute bottom-4 left-4 z-10 w-60">
              <ScoreboardWidget game={game} currentUsername={user?.username} />
            </div>
          )}

          {/* ── Scoring modal ── */}
          {game.currentRoundPhase === 'scoring' && game.status !== 'finished' && (!latestRenuncio || renuncioPanelDismissed) && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
              <div className="modal-slide-up relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
                <div className="p-5 space-y-4">
                  <ScoringPhase
                    game={game}
                    currentUsername={user?.username}
                    isCreator={isCreator}
                    onNextRound={() => nextRound(game.id)}
                  />
                  {game.roundScores.length > 0 && (
                    <ScoreboardWidget game={game} currentUsername={user?.username} />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Renuncio panel (shown before scoring modal when renuncio detected) ── */}
          {game.currentRoundPhase === 'scoring' && game.status !== 'finished' &&
            latestRenuncio && !renuncioPanelDismissed && (
            <RenuncioModal
              game={game}
              currentUsername={user?.username}
              isCreator={isCreator}
              onNextRound={() => setRenuncioPanelDismissed(true)}
            />
          )}

          {/* ── Final results modal ── */}
          {game.status === 'finished' && (() => {
            const totals: Record<string, number> = {};
            for (const player of game.players) {
              totals[player] = game.roundScores.reduce(
                (sum, e) => sum + (e.scores[player]?.points ?? 0),
                0
              );
            }
            const sorted = [...game.players].sort((a, b) => (totals[b] ?? 0) - (totals[a] ?? 0));
            const currentUsername = user?.username;
            const medals = ['1º', '2º', '3º'];
            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                <div className="modal-slide-up relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
                  <div className="p-6 space-y-5">
                    <div className="text-center pb-2">
                      <Trophy size={36} className="mx-auto mb-2 text-amber-500" />
                      <h2 className="text-2xl font-bold text-slate-800">Partida terminada</h2>
                      <p className="text-slate-500 text-sm mt-1">{game.name} · {game.rounds.length} rondas jugadas</p>
                    </div>

                    <div className="space-y-2">
                      {sorted.map((player, idx) => {
                        const isYou = player === currentUsername;
                        return (
                          <div
                            key={player}
                            className={`flex items-center justify-between p-3 rounded-xl border ${
                              idx === 0
                                ? 'bg-amber-50 border-amber-200'
                                : isYou
                                ? 'bg-blue-50 border-blue-200'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-slate-500 w-8">{medals[idx] ?? `${idx + 1}.`}</span>
                              <span className={`font-semibold ${isYou ? 'text-blue-800' : 'text-slate-800'}`}>
                                {player}{isYou ? ' (tú)' : ''}
                              </span>
                            </div>
                            <span className={`text-lg font-bold ${idx === 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                              {totals[player] ?? 0} pts
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {game.roundScores.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 font-medium uppercase mb-2">Desglose por rondas</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-slate-200">
                                <th className="text-left py-1.5 pr-2 text-slate-500 font-medium">Ronda</th>
                                {game.players.map((p) => (
                                  <th key={p} className="text-center py-1.5 px-1 text-slate-500 font-medium">
                                    {p === currentUsername ? 'Tú' : p}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {game.roundScores.map((entry) => (
                                <tr key={entry.roundIndex}>
                                  <td className="py-1.5 pr-2 text-slate-600 font-medium">{entry.roundIndex + 1}</td>
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
                              <tr className="border-t-2 border-slate-300 font-bold">
                                <td className="py-1.5 pr-2 text-slate-700">Total</td>
                                {game.players.map((p) => (
                                  <td key={p} className="py-1.5 px-1 text-center text-slate-800">
                                    {totals[p] ?? 0}
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100">
                      <button
                        onClick={() => navigate('/lobby')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition duration-200 shadow-sm"
                      >
                        <ArrowLeft size={16} />
                        Volver al lobby
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* ── Dev panels — scrollable below the fold ── */}
        <DevOnly>
        <div className="shrink-0 border-t border-amber-500/20 bg-black/30 p-4 space-y-4">
          {isCreator && game.rounds.length > 0 && (
            <div className="border-2 border-dashed border-amber-500/40 bg-black/20 rounded-xl p-5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <FlaskConical size={18} className="text-amber-400" />
                  <h3 className="text-sm font-semibold text-amber-300 uppercase tracking-wide">
                    Modo test: editar apuestas
                  </h3>
                </div>
                <button
                  onClick={() => setHotseatMode((v) => !v)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors duration-200 ${
                    hotseatMode
                      ? 'bg-green-500 border-green-600 text-white'
                      : 'bg-white/10 border-amber-400/40 text-amber-300 hover:bg-white/20'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${hotseatMode ? 'bg-white' : 'bg-amber-400'}`} />
                  Hotseat {hotseatMode ? 'ON' : 'OFF'}
                </button>
              </div>
              <p className="text-xs text-amber-300/60 italic mb-4">
                Sobreescribe apuestas sin respetar el turno ni las reglas del Postre.
                {hotseatMode && <span className="ml-1 font-semibold not-italic text-green-400">Modo hotseat activo — un navegador controla todos los asientos.</span>}
              </p>
              <div className="space-y-2">
                {game.players.map((player) => {
                  const cpPlayer = game.rounds[game.currentRoundIndex];
                  const inputVal = testBidInputs[player] ?? String(game.currentBids[player] ?? 0);
                  return (
                    <div key={player} className="flex items-center gap-3 bg-black/20 border border-white/10 rounded-lg px-3 py-2">
                      <span className="text-sm font-medium text-white/80 flex-1">{player}</span>
                      <input
                        type="number"
                        min={0}
                        max={cpPlayer}
                        value={inputVal}
                        onChange={(e) => setTestBidInputs((prev) => ({ ...prev, [player]: e.target.value }))}
                        className="w-16 px-2 py-1 text-sm border border-amber-400/30 rounded-lg bg-black/30 focus:outline-none focus:ring-2 focus:ring-amber-400 text-white text-center"
                      />
                      <button
                        onClick={() => {
                          const parsed = parseInt(inputVal, 10);
                          if (!isNaN(parsed)) {
                            setBidTest(game.id, player, parsed);
                          }
                        }}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition duration-200 whitespace-nowrap"
                      >
                        Actualizar (test)
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        </DevOnly>
      </div>
    </TableLayout>
  );
}
