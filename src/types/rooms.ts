export type RoomStatus = 'waiting' | 'playing' | 'finished';
export type RoomRoundMode = 'ascending' | 'descending' | 'combined';

export interface Room {
  id: string;
  created_at: string;
  status: RoomStatus;
  host_profile_id: string;
  max_players: number;
  name: string | null;
  dev_only: boolean;
  is_public: boolean;
  code: string;
  max_cards_per_player: number;
  round_mode: RoomRoundMode;
  renuncio_mode_enabled: boolean;
}

export interface RoomPlayer {
  id: string;
  room_id: string;
  profile_id: string;
  seat_index: number | null;
  is_ready: boolean;
  joined_at: string;
  profile?: {
    id: string;
    player_code: string;
    nombre: string | null;
  };
}

export interface RoomWithPlayers extends Room {
  host: {
    id: string;
    player_code: string;
    nombre: string | null;
  } | null;
  player_count: number;
  player_profile_ids: string[];
}
