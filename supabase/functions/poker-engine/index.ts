import { serve } from 'https://deno.land/std@0.200.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

type Operation =
  | 'create_table'
  | 'join_table'
  | 'start_hand'
  | 'act'
  | 'state';

interface RequestBody {
  op: Operation;
  user_id?: string;
  family_id?: string;
  name?: string;
  table_id?: string;
  seat_id?: string;
  variant?: string;
  small_blind?: number;
  starting_chips?: number;
  hand_id?: string;
  action?: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all_in';
  amount?: number;
}

const deckCards = () => {
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const suits = ['h', 'd', 'c', 's'];
  const cards: string[] = [];
  for (const r of ranks) for (const s of suits) cards.push(`${r}${s}`);
  return cards;
};

const shuffle = (cards: string[]) => {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return json({ ok: true }, 200);
  }

  try {
    let body: RequestBody | undefined;
    try {
      body = (await req.json()) as RequestBody;
    } catch (_err) {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    if (!body) return json({ error: 'Missing body' }, 400);
    const { op } = body;

    if (!op) return json({ error: 'Missing op' }, 400);

    switch (op) {
      case 'create_table': {
        const { user_id, name, variant = 'holdem', small_blind = 10, starting_chips = 200 } = body;
        if (!user_id || !name) return json({ error: 'user_id and name are required' }, 400);

        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('family_id')
          .eq('id', user_id)
          .single();
        if (profileErr || !profile?.family_id) return json({ error: 'Profile not found' }, 400);

        const { data: table, error } = await supabase
          .from('poker_tables')
          .insert({
            family_id: profile.family_id,
            name,
            variant,
            small_blind,
            starting_chips,
            created_by: user_id,
          })
          .select()
          .single();

        if (error) return json({ error: error.message }, 400);
        return json({ table });
      }

      case 'join_table': {
        const { table_id, user_id } = body;
        if (!table_id || !user_id) return json({ error: 'table_id and user_id are required' }, 400);

        const { data: table, error: tErr } = await supabase
          .from('poker_tables')
          .select('family_id, starting_chips')
          .eq('id', table_id)
          .single();
        if (tErr || !table) return json({ error: 'Table not found' }, 404);

        const { data: profile, error: pErr } = await supabase
          .from('profiles')
          .select('family_id')
          .eq('id', user_id)
          .single();
        if (pErr || profile?.family_id !== table.family_id) return json({ error: 'Not in family' }, 403);

        const { data: seats } = await supabase
          .from('poker_seats')
          .select('seat_no')
          .eq('table_id', table_id);
        const nextSeat = seats?.length ? Math.max(...seats.map((s: any) => s.seat_no)) + 1 : 1;

        const { data: seat, error } = await supabase
          .from('poker_seats')
          .insert({
            table_id,
            user_id,
            seat_no: nextSeat,
            chips: table.starting_chips,
          })
          .select()
          .single();
        if (error) return json({ error: error.message }, 400);

        return json({ seat });
      }

      case 'start_hand': {
        const { table_id } = body;
        if (!table_id) return json({ error: 'table_id is required' }, 400);

        const { data: seats, error: seatErr } = await supabase
          .from('poker_seats')
          .select('id, seat_no, chips')
          .eq('table_id', table_id)
          .eq('status', 'active')
          .gt('chips', 0)
          .order('seat_no');
        if (seatErr) return json({ error: seatErr.message }, 400);
        if (!seats?.length) return json({ error: 'No active seats' }, 400);

        const deck = shuffle(deckCards());
        const hole_cards: Record<string, string[]> = {};
        for (const seat of seats) {
          hole_cards[seat.id] = [deck.pop()!, deck.pop()!];
        }

        const { data: lastHand } = await supabase
          .from('poker_hands')
          .select('hand_no')
          .eq('table_id', table_id)
          .order('hand_no', { ascending: false })
          .limit(1)
          .single();
        const hand_no = (lastHand?.hand_no ?? 0) + 1;

        const { data: hand, error } = await supabase
          .from('poker_hands')
          .insert({
            table_id,
            hand_no,
            board_cards: [],
            hole_cards,
            deck,
            status: 'betting',
            street: 'preflop',
            turn_seat_no: seats[0].seat_no,
          })
          .select()
          .single();

        if (error) return json({ error: error.message }, 400);

        return json({
          hand: {
            ...hand,
            hole_cards: undefined, // hide by default
          },
        });
      }

      case 'act': {
        const { hand_id, seat_id, action = 'check', amount = 0 } = body;
        if (!hand_id || !seat_id) return json({ error: 'hand_id and seat_id are required' }, 400);

        const { data: hand, error: hErr } = await supabase
          .from('poker_hands')
          .select('id, table_id, turn_seat_no, pot, street, status, deck, board_cards')
          .eq('id', hand_id)
          .single();
        if (hErr || !hand) return json({ error: 'Hand not found' }, 404);

        const { data: seat, error: sErr } = await supabase
          .from('poker_seats')
          .select('seat_no')
          .eq('id', seat_id)
          .single();
        if (sErr || !seat) return json({ error: 'Seat not found' }, 404);

        const activeSeatsResp = await supabase
          .from('poker_seats')
          .select('id, seat_no, status, chips')
          .eq('table_id', hand.table_id)
          .eq('status', 'active')
          .order('seat_no');
        const activeSeats = activeSeatsResp.data ?? [];
        if (!activeSeats.length) return json({ error: 'No active seats' }, 400);

        if (hand.status === 'complete' || hand.status === 'done') {
          return json({ error: 'Hand already complete' }, 400);
        }
        if (hand.turn_seat_no !== seat.seat_no) {
          return json({ error: 'Not your turn' }, 400);
        }

        const spend = Math.max(0, Math.min(amount, seat.chips ?? 0));

        if (spend > 0) {
          await supabase
            .from('poker_seats')
            .update({ chips: (seat.chips ?? 0) - spend, last_action_at: new Date().toISOString() })
            .eq('id', seat_id);
        }

        await supabase
          .from('poker_actions')
          .insert({
            hand_id,
            seat_id,
            action,
            amount,
            street: hand.street,
          });

        const currentIdxRaw = activeSeats.findIndex((s) => s.seat_no === hand.turn_seat_no);
        const currentIdx = currentIdxRaw >= 0 ? currentIdxRaw : 0;
        const nextSeat = activeSeats[(currentIdx + 1) % activeSeats.length];
        const firstSeatNo = activeSeats[0].seat_no;

        // Simple street progression: once action wraps to first seat, move to next street
        let { street, board_cards, deck } = hand as any;
        let status = hand.status;
        if (nextSeat?.seat_no === firstSeatNo) {
          if (street === 'preflop') {
            street = 'flop';
            board_cards = [...(board_cards ?? []), deck.pop(), deck.pop(), deck.pop()];
          } else if (street === 'flop') {
            street = 'turn';
            board_cards = [...(board_cards ?? []), deck.pop()];
          } else if (street === 'turn') {
            street = 'river';
            board_cards = [...(board_cards ?? []), deck.pop()];
          } else if (street === 'river') {
            street = 'done';
            status = 'complete';
          }
        }

        await supabase
          .from('poker_hands')
          .update({
            pot: (hand.pot ?? 0) + spend,
            turn_seat_no: nextSeat?.seat_no ?? hand.turn_seat_no,
            street,
            status,
            deck,
            board_cards,
            updated_at: new Date().toISOString(),
          })
          .eq('id', hand_id);

        return json({ ok: true, next_seat: nextSeat?.seat_no ?? hand.turn_seat_no, street, status, board_cards });
      }

      case 'state': {
        const { table_id, hand_id, seat_id } = body;
        const handQuery = supabase
          .from('poker_hands')
          .select('*')
          .order('hand_no', { ascending: false })
          .limit(1);
        if (hand_id) handQuery.eq('id', hand_id);
        else if (table_id) handQuery.eq('table_id', table_id);

        const { data: hand, error } = await handQuery.single();
        if (error || !hand) return json({ error: 'Hand not found' }, 404);

        const { data: seats } = await supabase
          .from('poker_seats')
          .select('id, seat_no, user_id, chips, status')
          .eq('table_id', hand.table_id)
          .order('seat_no');

        const holeForSeat = seat_id ? (hand.hole_cards ?? {})[seat_id] : undefined;

        return json({
          hand: {
            ...hand,
            hole_cards: undefined,
          },
          hole_cards: holeForSeat,
          seats: seats ?? [],
        });
      }

      default:
        return json({ error: 'Unsupported op' }, 400);
    }
  } catch (err: any) {
    console.error('[poker-engine] error', err?.message ?? err);
    return json({ error: err?.message ?? 'Server error' }, 500);
  }
});
