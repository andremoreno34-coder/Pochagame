import type { RoomRoundMode } from '../types/rooms';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${supabaseAnonKey}`,
  'Apikey': supabaseAnonKey,
};

async function callRoomApi(method: 'POST' | 'PATCH', body: Record<string, unknown>) {
  const res = await fetch(`${supabaseUrl}/functions/v1/room`, {
    method,
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? 'Room API error');
  }
  return data;
}

export interface CreateRoomOptions {
  host_profile_id: string;
  name: string;
  max_players: number;
  max_cards_per_player: number;
  round_mode: RoomRoundMode;
  renuncio_mode_enabled: boolean;
  dev_only: boolean;
  is_public: boolean;
}

export async function createRoom(options: CreateRoomOptions) {
  return callRoomApi('POST', options);
}

export async function joinRoom(room_id: string, profile_id: string) {
  return callRoomApi('PATCH', { action: 'join', room_id, profile_id });
}

export async function joinRoomByCode(code: string, profile_id: string) {
  return callRoomApi('PATCH', { action: 'join_by_code', profile_id, code });
}

export async function leaveRoom(room_id: string, profile_id: string) {
  return callRoomApi('PATCH', { action: 'leave', room_id, profile_id });
}

export async function setReady(room_id: string, profile_id: string, is_ready: boolean) {
  return callRoomApi('PATCH', { action: 'set_ready', room_id, profile_id, is_ready });
}

export async function startRoom(room_id: string, profile_id: string) {
  return callRoomApi('PATCH', { action: 'start', room_id, profile_id });
}
