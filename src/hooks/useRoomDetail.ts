import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Room, RoomPlayer } from '../types/rooms';

interface UseRoomDetailResult {
  room: Room | null;
  players: RoomPlayer[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

async function fetchRoom(roomId: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function fetchPlayers(roomId: string): Promise<RoomPlayer[]> {
  const { data, error } = await supabase
    .from('room_players')
    .select(`
      *,
      profile:profiles!profile_id(id, player_code, nombre)
    `)
    .eq('room_id', roomId)
    .order('seat_index', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    profile: row.profile ?? undefined,
  }));
}

export function useRoomDetail(roomId: string): UseRoomDetailResult {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!roomId) return;
    try {
      setError(null);
      const [roomData, playersData] = await Promise.all([
        fetchRoom(roomId),
        fetchPlayers(roomId),
      ]);
      setRoom(roomData);
      setPlayers(playersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    load();

    const channel = supabase
      .channel(`room-detail-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        () => { load(); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
        () => { load(); },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, load]);

  return { room, players, loading, error, refetch: load };
}
