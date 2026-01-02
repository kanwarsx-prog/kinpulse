import { serve } from 'https://deno.land/std@0.200.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { Hand } from 'https://esm.sh/pokersolver@2.1.4';

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

type CommittedMap = Record<
  string,
  {
    amount: number;
    folded?: boolean;
  }
>;

type Strength = {
  rank: number; // 8 straight flush .. 0 high card
  tiebreak: number[];
};

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

const rankVal: Record<string, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

const evaluate5 = (cards: string[]): Strength => {
  const vals = cards.map((c) => rankVal[c[0]]);
  const suits = cards.map((c) => c[1]);
  const counts: Record<number, number> = {};
  vals.forEach((v) => (counts[v] = (counts[v] ?? 0) + 1));
  const byCount = Object.entries(counts)
    .map(([k, v]) => ({ v: Number(k), c: v }))
    .sort((a, b) => (b.c === a.c ? b.v - a.v : b.c - a.c));

  const isFlush = suits.every((s) => s === suits[0]);
  const uniqVals = [...new Set(vals)].sort((a, b) => b - a);
  // straight check with wheel
  const straightHigh = (() => {
    const v = uniqVals.slice().sort((a, b) => a - b);
    for (let i = 0; i <= v.length - 5; i++) {
      const seq = v.slice(i, i + 5);
      if (seq[4] - seq[0] === 4 && new Set(seq).size === 5) return seq[4];
    }
    // wheel A2345
    if (v.includes(14) && v.includes(2) && v.includes(3) && v.includes(4) && v.includes(5)) return 5;
    return null;
  })();

  if (isFlush && straightHigh) return { rank: 8, tiebreak: [straightHigh] };

  if (byCount[0]?.c === 4) {
    const quad = byCount[0].v;
    const kicker = uniqVals.find((v) => v !== quad) ?? 0;
    return { rank: 7, tiebreak: [quad, kicker] };
  }

  if (byCount[0]?.c === 3 && byCount[1]?.c >= 2) {
    return { rank: 6, tiebreak: [byCount[0].v, byCount[1].v] };
  }

  if (isFlush) return { rank: 5, tiebreak: uniqVals };
  if (straightHigh) return { rank: 4, tiebreak: [straightHigh] };

  if (byCount[0]?.c === 3) {
    const trips = byCount[0].v;
    const kickers = uniqVals.filter((v) => v !== trips);
    return { rank: 3, tiebreak: [trips, ...kickers] };
  }

  if (byCount[0]?.c === 2 && byCount[1]?.c === 2) {
    const highPair = Math.max(byCount[0].v, byCount[1].v);
    const lowPair = Math.min(byCount[0].v, byCount[1].v);
    const kicker = uniqVals.find((v) => v !== highPair && v !== lowPair) ?? 0;
    return { rank: 2, tiebreak: [highPair, lowPair, kicker] };
  }

  if (byCount[0]?.c === 2) {
    const pair = byCount[0].v;
    const kickers = uniqVals.filter((v) => v !== pair);
    return { rank: 1, tiebreak: [pair, ...kickers] };
  }

  return { rank: 0, tiebreak: uniqVals };
};

const bestOf7 = (cards: string[]): Strength => {
  if (cards.length < 5) return { rank: -1, tiebreak: [] };
  let best: Strength | null = null;
  const n = cards.length;
  for (let a = 0; a < n - 4; a++)
    for (let b = a + 1; b < n - 3; b++)
      for (let c = b + 1; c < n - 2; c++)
        for (let d = c + 1; d < n - 1; d++)
          for (let e = d + 1; e < n; e++) {
            const hand = [cards[a], cards[b], cards[c], cards[d], cards[e]];
            const s = evaluate5(hand);
            if (!best || compareStrength(s, best) > 0) {
              best = s;
            }
          }
  return best ?? { rank: -1, tiebreak: [] };
};

const compareStrength = (a: Strength, b: Strength) => {
  if (a.rank !== b.rank) return a.rank - b.rank;
  const len = Math.max(a.tiebreak.length, b.tiebreak.length);
  for (let i = 0; i < len; i++) {
    const diff = (a.tiebreak[i] ?? 0) - (b.tiebreak[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
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
        if (tErr || !table) return json({ error: 'Table not found' }, 200);

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

        // rotate dealer
        const { data: lastHand } = await supabase
          .from('poker_hands')
          .select('hand_no, dealer_seat_no')
          .eq('table_id', table_id)
          .order('hand_no', { ascending: false })
          .limit(1)
          .single();
        const dealerIdx =
          seats.findIndex((s) => s.seat_no === lastHand?.dealer_seat_no) ?? -1;
        const nextDealer = seats[(dealerIdx + 1) % seats.length];
        const turnSeat = seats[(dealerIdx + 2) % seats.length];

        const deck = shuffle(deckCards());
        const hole_cards: Record<string, string[]> = {};
        for (const seat of seats) {
          hole_cards[seat.id] = [deck.pop()!, deck.pop()!];
        }

        const hand_no = (lastHand?.hand_no ?? 0) + 1;
        const committed: CommittedMap = {};
        seats.forEach((s) => {
          committed[s.id] = { amount: 0 };
        });

        const { data: hand, error } = await supabase
          .from('poker_hands')
          .insert({
            table_id,
            hand_no,
            board_cards: [],
            hole_cards,
            deck,
            current_bet: 0,
            committed,
            status: 'betting',
            street: 'preflop',
            dealer_seat_no: nextDealer.seat_no,
            turn_seat_no: turnSeat.seat_no,
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
          .select(
            'id, table_id, turn_seat_no, pot, street, status, deck, board_cards, current_bet, committed, dealer_seat_no',
          )
          .eq('id', hand_id)
          .single();
        if (hErr || !hand) return json({ error: 'Hand not found' }, 200);

        const { data: seat, error: sErr } = await supabase
          .from('poker_seats')
          .select('seat_no, chips')
          .eq('id', seat_id)
          .single();
        if (sErr || !seat) return json({ error: 'Seat not found' }, 200);

        const { data: table } = await supabase
          .from('poker_tables')
          .select('small_blind')
          .eq('id', hand.table_id)
          .single();

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

        const committed: CommittedMap = hand.committed || {};
        const entry = committed[seat_id] || { amount: 0 };
        const currentBet = hand.current_bet ?? 0;

        if (entry.folded) return json({ error: 'You are folded' }, 400);

        let spend = 0;
        let newCurrentBet = currentBet;
        let message = '';

        const seatChips = seat.chips ?? 0;
        const baseBlind = table?.small_blind ?? 10;
        const minRaise = currentBet === 0 ? baseBlind * 2 : Math.max(baseBlind, currentBet - entry.amount + baseBlind);
        const callNeeded = Math.max(0, currentBet - entry.amount);

        if (action === 'fold') {
          entry.folded = true;
          message = 'folded';
        } else if (action === 'check') {
          if (callNeeded > 0) return json({ error: 'Cannot check, need to call' }, 400);
          message = 'checked';
        } else if (action === 'call') {
          spend = Math.min(callNeeded, seatChips);
          entry.amount += spend;
          message = 'called';
        } else if (action === 'bet' || action === 'raise') {
          if (action === 'raise' && currentBet === 0) return json({ error: 'Nothing to raise' }, 400);
          let betAmt = amount && amount > 0 ? amount : Math.max(minRaise, Math.floor((hand.pot ?? 0) / 2));
          betAmt = Math.min(betAmt, seatChips);
          if (betAmt <= 0) return json({ error: 'Invalid bet' }, 400);
          if (betAmt < callNeeded) return json({ error: 'Bet too small to call' }, 400);
          const raiseOverCall = betAmt - callNeeded;
          if (currentBet > 0 && raiseOverCall < minRaise && betAmt < seatChips) {
            return json({ error: `Min raise is ${minRaise}` }, 400);
          }
          spend = betAmt;
          entry.amount += betAmt;
          newCurrentBet = Math.max(newCurrentBet, entry.amount);
          message = action === 'bet' ? 'bet' : 'raised';
          // Track last aggressor for betting round completion
          lastAggressorSeatNo = seat.seat_no;
        } else {
          return json({ error: 'Unsupported action' }, 400);
        }

        committed[seat_id] = entry;
        const remainingChips = (seat.chips ?? 0) - spend;
        await supabase.from('poker_seats').update({ chips: remainingChips, last_action_at: new Date().toISOString() }).eq('id', seat_id);

        await supabase.from('poker_actions').insert({
          hand_id,
          seat_id,
          action,
          amount: spend,
          street: hand.street,
        });

        const activeRemaining = activeSeats.filter((s) => !(committed[s.id]?.folded));
        const newPot = (hand.pot ?? 0) + spend;
        let street = hand.street ?? 'preflop';
        let status = hand.status ?? 'betting';
        let board_cards = hand.board_cards ?? [];
        let deck = hand.deck ?? [];
        let winnerSeatId: string | undefined;
        let winnerSeatIds: string[] = [];
        let nextTurnSeatNo = hand.turn_seat_no;
        let lastAggressorSeatNo = hand.last_aggressor_seat_no ?? null;


        // if only one player left, award pot
        if (activeRemaining.length <= 1) {
          winnerSeatId = activeRemaining[0]?.id;
          status = 'complete';
          street = 'done';
        } else {
          // Move to next player
          const ordered = activeSeats.filter((s) => !(committed[s.id]?.folded));
          const currentIdxRaw = ordered.findIndex((s) => s.seat_no === hand.turn_seat_no);
          const currentIdx = currentIdxRaw >= 0 ? currentIdxRaw : 0;
          const nextSeat = ordered[(currentIdx + 1) % ordered.length];
          nextTurnSeatNo = nextSeat?.seat_no ?? hand.turn_seat_no;

          // Check if betting round is complete
          // All players must have matched the current bet (or be all-in)
          const allMatched = activeRemaining.every((s) => {
            const entryS = committed[s.id] || { amount: 0 };
            const seatChip = s.chips ?? 0;
            const target = newCurrentBet;
            return entryS.amount >= target || seatChip === 0 || entryS.folded;
          });

          // Determine if betting round is complete
          // Round ends when action returns to last aggressor (or dealer if no raises)
          let roundComplete = false;
          if (allMatched) {
            if (lastAggressorSeatNo === null) {
              // No one has bet/raised this street - round ends when back to dealer
              const dealerSeat = ordered.find((s) => s.seat_no === hand.dealer_seat_no);
              roundComplete = nextTurnSeatNo === dealerSeat?.seat_no;
            } else {
              // Someone bet/raised - round ends when action returns to them
              roundComplete = nextTurnSeatNo === lastAggressorSeatNo;
            }
          }

          // Advance street if betting round is complete
          if (roundComplete) {
            // advance street
            if (street === 'preflop') {
              street = 'flop';
              board_cards = [...board_cards, deck.pop(), deck.pop(), deck.pop()];
            } else if (street === 'flop') {
              street = 'turn';
              board_cards = [...board_cards, deck.pop()];
            } else if (street === 'turn') {
              street = 'river';
              board_cards = [...board_cards, deck.pop()];
            } else if (street === 'river') {
              street = 'done';
              status = 'complete';
            }
            // reset committed for next street
            Object.keys(committed).forEach((k) => {
              committed[k].amount = committed[k].folded ? committed[k].amount : 0;
            });
            newCurrentBet = 0;
            lastAggressorSeatNo = null; // Reset for new street
            // Start next street with player after dealer
            const dealerIdx = ordered.findIndex((s) => s.seat_no === hand.dealer_seat_no);
            const firstPlayer = ordered[(dealerIdx + 1) % ordered.length];
            nextTurnSeatNo = firstPlayer?.seat_no ?? nextTurnSeatNo;
          }
        }

        const awardChips = async (winnerIds: string[], totalPot: number) => {
          if (!winnerIds.length || totalPot <= 0) return;
          const share = Math.floor(totalPot / winnerIds.length);
          const remainder = totalPot % winnerIds.length;
          const { data: winnerSeats } = await supabase
            .from('poker_seats')
            .select('id, chips')
            .in('id', winnerIds);
          for (let i = 0; i < (winnerSeats ?? []).length; i++) {
            const w = winnerSeats?.[i];
            if (!w) continue;
            const bonus = share + (i === 0 ? remainder : 0);
            await supabase.from('poker_seats').update({ chips: (w.chips ?? 0) + bonus }).eq('id', w.id);
          }
        };

        if (status === 'complete') {
          let winningHandName = '';
          let winningHandDescr = '';

          if (!winnerSeatId) {
            // Showdown: evaluate best hand using pokersolver
            const survivors = activeSeats.filter((s) => !(committed[s.id]?.folded));
            const board = board_cards ?? [];

            // Evaluate each player's hand
            const playerHands = survivors.map(s => {
              const hole = (hand.hole_cards ?? {})[s.id] ?? [];
              // pokersolver expects uppercase format: 'Ah', 'Kd', etc.
              const allCards = [...hole, ...board].map(c => c[0].toUpperCase() + c[1].toLowerCase());
              return {
                seatId: s.id,
                hand: Hand.solve(allCards)
              };
            });

            // Find winner(s)
            const hands = playerHands.map(ph => ph.hand);
            const winningHands = Hand.winners(hands);

            // Get seat IDs of winners
            winnerSeatIds = playerHands
              .filter(ph => winningHands.includes(ph.hand))
              .map(ph => ph.seatId);

            // Store winning hand info
            if (winningHands.length > 0) {
              winningHandName = winningHands[0].name;
              winningHandDescr = winningHands[0].descr;
            }

            await awardChips(winnerSeatIds, newPot);
            winnerSeatId = winnerSeatIds[0];
          } else {
            // Single winner (everyone else folded)
            winnerSeatIds = [winnerSeatId];
            await awardChips(winnerSeatIds, newPot);
          }

          // Store winning hand info in hand record
          await supabase
            .from('poker_hands')
            .update({
              winning_hand_name: winningHandName,
              winning_hand_descr: winningHandDescr
            })
            .eq('id', hand_id);
        }

        await supabase
          .from('poker_hands')
          .update({
            pot: newPot,
            turn_seat_no: nextTurnSeatNo,
            street,
            status,
            deck,
            board_cards,
            current_bet: newCurrentBet,
            committed,
            last_aggressor_seat_no: lastAggressorSeatNo,
            updated_at: new Date().toISOString(),
          })
          .eq('id', hand_id);

        return json({
          ok: true,
          next_seat: nextTurnSeatNo,
          street,
          status,
          board_cards,
          winner_seat_id: winnerSeatId,
          winner_seat_ids: winnerSeatIds,
        });
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

        const { data: hand } = await handQuery.single();

        // Always return seats if we know the table, even when no hand exists yet
        const tableForSeats = hand?.table_id ?? table_id;
        let seats: any[] = [];
        if (tableForSeats) {
          const { data: seatRows } = await supabase
            .from('poker_seats')
            .select('id, seat_no, user_id, chips, status')
            .eq('table_id', tableForSeats)
            .order('seat_no');
          seats = seatRows ?? [];
        }

        if (!hand) {
          return json({ error: 'Hand not found', hand: null, hole_cards: undefined, seats }, 200);
        }

        const holeForSeat = seat_id ? (hand.hole_cards ?? {})[seat_id] : undefined;

        return json({
          hand: {
            ...hand,
            hole_cards: undefined,
          },
          hole_cards: holeForSeat,
          seats,
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
