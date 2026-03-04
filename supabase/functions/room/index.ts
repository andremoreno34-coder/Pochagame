import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

async function generateUniqueCode(supabase: ReturnType<typeof createClient>): Promise<string> {
  for (let attempts = 0; attempts < 20; attempts++) {
    const code = generateCode();
    const { data } = await supabase
      .from('rooms')
      .select('id')
      .eq('code', code)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error('Could not generate unique room code');
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (req.method === "POST") {
      const body = await req.json();
      const {
        host_profile_id,
        name,
        max_players = 4,
        max_cards_per_player = 10,
        round_mode = "ascending",
        renuncio_mode_enabled = false,
        dev_only = false,
        is_public = true,
      } = body;

      if (!host_profile_id) {
        return json({ error: "host_profile_id required" }, 400);
      }

      const { data: existingRoom } = await supabase
        .from("rooms")
        .select("id")
        .eq("host_profile_id", host_profile_id)
        .eq("status", "waiting")
        .maybeSingle();

      if (existingRoom) {
        return json({ error: "You already have an open room" }, 409);
      }

      const code = await generateUniqueCode(supabase);

      const { data: room, error: roomErr } = await supabase
        .from("rooms")
        .insert({
          host_profile_id,
          name,
          max_players,
          max_cards_per_player,
          round_mode,
          renuncio_mode_enabled,
          dev_only,
          is_public,
          code,
        })
        .select()
        .single();

      if (roomErr) throw roomErr;

      const { data: roomPlayer, error: rpErr } = await supabase
        .from("room_players")
        .insert({
          room_id: room.id,
          profile_id: host_profile_id,
          seat_index: 0,
          is_ready: true,
        })
        .select()
        .single();

      if (rpErr) throw rpErr;

      return json({ room, room_player: roomPlayer });
    }

    if (req.method === "PATCH") {
      const body = await req.json();
      const { action, room_id, profile_id, is_ready } = body;

      if (!action || !profile_id) {
        return json({ error: "action and profile_id required" }, 400);
      }

      if (action === "join_by_code") {
        const { code } = body;
        if (!code) return json({ error: "code required" }, 400);

        const { data: targetRoom, error: codeFetchErr } = await supabase
          .from("rooms")
          .select("*")
          .eq("code", (code as string).toUpperCase().trim())
          .maybeSingle();

        if (codeFetchErr) throw codeFetchErr;
        if (!targetRoom) return json({ error: "Código de sala no válido" }, 404);
        if (targetRoom.status !== "waiting") return json({ error: "La sala ya no está disponible" }, 409);

        const { data: existingPlayer } = await supabase
          .from("room_players")
          .select("id")
          .eq("room_id", targetRoom.id)
          .eq("profile_id", profile_id)
          .maybeSingle();

        if (existingPlayer) {
          return json({ room: targetRoom, room_player: existingPlayer, already_joined: true });
        }

        const { data: currentPlayers } = await supabase
          .from("room_players")
          .select("id, seat_index")
          .eq("room_id", targetRoom.id);

        if ((currentPlayers?.length ?? 0) >= targetRoom.max_players) {
          return json({ error: "La sala está llena" }, 409);
        }

        const usedSeats = new Set((currentPlayers ?? []).map((p: { seat_index: number | null }) => p.seat_index));
        let nextSeat = 0;
        while (usedSeats.has(nextSeat)) nextSeat++;

        const { data: rp, error: joinErr } = await supabase
          .from("room_players")
          .insert({
            room_id: targetRoom.id,
            profile_id,
            seat_index: nextSeat,
            is_ready: false,
          })
          .select()
          .single();

        if (joinErr) throw joinErr;

        return json({ room: targetRoom, room_player: rp });
      }

      if (!room_id) {
        return json({ error: "room_id required" }, 400);
      }

      const { data: room, error: roomFetchErr } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", room_id)
        .maybeSingle();

      if (roomFetchErr) throw roomFetchErr;
      if (!room) return json({ error: "Room not found" }, 404);

      if (action === "join") {
        const { data: existingPlayer } = await supabase
          .from("room_players")
          .select("id")
          .eq("room_id", room_id)
          .eq("profile_id", profile_id)
          .maybeSingle();

        if (existingPlayer) {
          return json({ room_player: existingPlayer, already_joined: true });
        }

        if (room.status !== "waiting") {
          return json({ error: "Room is not accepting players" }, 409);
        }

        const { data: currentPlayers } = await supabase
          .from("room_players")
          .select("id, seat_index")
          .eq("room_id", room_id);

        if ((currentPlayers?.length ?? 0) >= room.max_players) {
          return json({ error: "Room is full" }, 409);
        }

        const usedSeats = new Set((currentPlayers ?? []).map((p: { seat_index: number | null }) => p.seat_index));
        let nextSeat = 0;
        while (usedSeats.has(nextSeat)) nextSeat++;

        const { data: rp, error: joinErr } = await supabase
          .from("room_players")
          .insert({
            room_id,
            profile_id,
            seat_index: nextSeat,
            is_ready: false,
          })
          .select()
          .single();

        if (joinErr) throw joinErr;

        return json({ room_player: rp });
      }

      if (action === "leave") {
        if (room.host_profile_id === profile_id) {
          if (room.status === "waiting") {
            const { error: deleteRoomErr } = await supabase
              .from("rooms")
              .delete()
              .eq("id", room_id);
            if (deleteRoomErr) throw deleteRoomErr;
            return json({ ok: true, room_deleted: true });
          }
        }

        const { error: leaveErr } = await supabase
          .from("room_players")
          .delete()
          .eq("room_id", room_id)
          .eq("profile_id", profile_id);

        if (leaveErr) throw leaveErr;
        return json({ ok: true });
      }

      if (action === "set_ready") {
        const { data: rp, error: readyErr } = await supabase
          .from("room_players")
          .update({ is_ready: is_ready ?? true })
          .eq("room_id", room_id)
          .eq("profile_id", profile_id)
          .select()
          .single();

        if (readyErr) throw readyErr;
        return json({ room_player: rp });
      }

      if (action === "start") {
        if (room.host_profile_id !== profile_id) {
          return json({ error: "Only the host can start the game" }, 403);
        }
        if (room.status !== "waiting") {
          return json({ error: "Room is not in waiting state" }, 409);
        }

        const { data: players } = await supabase
          .from("room_players")
          .select("id")
          .eq("room_id", room_id);

        if (!players || players.length < 2) {
          return json({ error: "Need at least 2 players to start" }, 409);
        }

        const { data: updatedRoom, error: startErr } = await supabase
          .from("rooms")
          .update({ status: "playing" })
          .eq("id", room_id)
          .select()
          .single();

        if (startErr) throw startErr;
        return json({ room: updatedRoom });
      }

      return json({ error: "Unknown action" }, 400);
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
