import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { RoomWithPlayers } from '../types/rooms';

interface UseOnlineRoomsOptions {
  devMode?: boolean;
  profileId?: string;
}

interface UseOnlineRoomsResult {
  rooms: RoomWithPlayers[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

async function fetchRooms(devMode: boolean, profileId: string | undefined): Promise<RoomWithPlayers[]> {
  let query = supabase
    .from('rooms')
    .select(`
      *,
      host:profiles!host_profile_id(id, player_code, nombre),
      room_players(id, profile_id)
    `)
    .in('status', ['waiting', 'playing'])
    .order('created_at', { ascending: false });

  if (!devMode) {
    if (profileId) {
      query = query.or(`is_public.eq.true,host_profile_id.eq.${profileId}`);
    } else {
      query = query.eq('is_public', true);
    }
    query = query.eq('dev_only', false);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => ({
    ...row,
    host: row.host ?? null,
    player_count: Array.isArray(row.room_players) ? row.room_players.length : 0,
    player_profile_ids: Array.isArray(row.room_players)
      ? (row.room_players as { profile_id: string }[]).map((rp) => rp.profile_id)
      : [],
  }));
}

export function useOnlineRooms({ devMode = false, profileId }: UseOnlineRoomsOptions = {}): UseOnlineRoomsResult {
  const [rooms, setRooms] = useState<RoomWithPlayers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchRooms(devMode, profileId);
      setRooms(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [devMode, profileId]);

  useEffect(() => {
    load();

    const channel = supabase
      .channel('online-rooms')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        () => { load(); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players' },
        () => { load(); },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { rooms, loading, error, refetch: load };
}
