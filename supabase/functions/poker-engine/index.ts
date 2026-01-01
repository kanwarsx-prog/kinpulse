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

type CommittedMap = Record<
  string,
  {
    amount: number;
    folded?: boolean;
  }
>;

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

type EvalResult = {
  rank: number[];
  best: string[];
};

const valueMap: Record<string, number> = {
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

const parseCard = (c: string) => ({ v: valueMap[c[0]], s: c[1], raw: c });

const isStraight = (values: number[]) => {
  const uniq = Array.from(new Set(values)).sort((a, b) => b - a);
  // wheel
  if (uniq.includes(14)) uniq.push(1);
  let run = 1;
  for (let i = 1; i < uniq.length; i++) {
    if (uniq[i - 1] - uniq[i] === 1) {
      run += 1;
      if (run >= 5) return uniq[i - 4];
    } else {
      run = 1;
    }
  }
  return null;
};

const evalFive = (cards: string[]): EvalResult => {
  const parsed = cards.map(parseCard);
  const values = parsed.map((c) => c.v).sort((a, b) => b - a);
  const suits = parsed.map((c) => c.s);
  const counts: Record<number, number> = {};
  values.forEach((v) => (counts[v] = (counts[v] ?? 0) + 1));
  const byCount = Object.entries(counts)
    .map(([v, cnt]) => ({ v: Number(v), cnt }))
    .sort((a, b) => b.cnt - a.cnt || b.v - a.v);

  const flushSuit = ['h', 'd', 'c', 's'].find((s) => suits.filter((x) => x === s).length === 5);
  const straightHigh = isStraight(values);
  const isFlush = !!flushSuit;
  const isStraightFlush = isFlush && straightHigh !== null;

  let rank: number[];
  if (isStraightFlush) {
    rank = [8, straightHigh!];
  } else if (byCount[0].cnt === 4) {
    const quad = byCount[0].v;
    const kicker = byCount.find((x) => x.v !== quad)!.v;
    rank = [7, quad, kicker];
  } else if (byCount[0].cnt === 3 && byCount[1]?.cnt === 2) {
    rank = [6, byCount[0].v, byCount[1].v];
  } else if (isFlush) {
    rank = [5, ...values];
  } else if (straightHigh !== null) {
    rank = [4, straightHigh];
  } else if (byCount[0].cnt === 3) {
    const kickers = byCount.filter((x) => x.cnt === 1).map((x) => x.v).sort((a, b) => b - a);
    rank = [3, byCount[0].v, ...kickers];
  } else if (byCount[0].cnt === 2 && byCount[1]?.cnt === 2) {
    const pairHigh = Math.max(byCount[0].v, byCount[1].v);
    const pairLow = Math.min(byCount[0].v, byCount[1].v);
    const kicker = byCount.find((x) => x.cnt === 1)?.v ?? 0;
    rank = [2, pairHigh, pairLow, kicker];
  } else if (byCount[0].cnt === 2) {
    const kickers = byCount.filter((x) => x.cnt === 1).map((x) => x.v).sort((a, b) => b - a);
    rank = [1, byCount[0].v, ...kickers];
  } else {
    rank = [0, ...values];
  }

  return { rank, best: cards };
};

const compareRank = (a: number[], b: number[]) => {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
};

const bestHand = (allCards: string[]): EvalResult => {
  // choose best 5 of up to 7 cards
  let best: EvalResult | null = null;
  const n = allCards.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        for (let l = k + 1; l < n; l++) {
          for (let m = l + 1; m < n; m++) {
            const subset = [allCards[i], allCards[j], allCards[k], allCards[l], allCards[m]];
            const evald = evalFive(subset);
            if (!best || compareRank(evald.rank, best.rank) > 0) best = evald;
          }
        }
      }
    }
  }
  return best ?? { rank: [0], best: allCards.slice(0, 5) };
};

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
        if (hErr || !hand) return json({ error: 'Hand not found' }, 404);

        const { data: seat, error: sErr } = await supabase
          .from('poker_seats')
          .select('seat_no, chips')
          .eq('id', seat_id)
          .single();
        if (sErr || !seat) return json({ error: 'Seat not found' }, 404);

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
        let street = hand.street;
        let status = hand.status;
        let board_cards = hand.board_cards ?? [];
        let deck = hand.deck ?? [];
        let pot = (hand.pot ?? 0) + spend;
        let winnerSeatId: string | undefined;
        let winnerSeatIds: string[] = [];
        let nextTurnSeatNo = hand.turn_seat_no;

        // if only one player left, award pot
        if (activeRemaining.length <= 1) {
          winnerSeatId = activeRemaining[0]?.id;
          status = 'complete';
          street = 'done';
        } else {
          // check if all active matched current bet (or are all-in)
          const matched = activeRemaining.every((s) => {
            const entryS = committed[s.id] || { amount: 0 };
            const seatChip = s.chips ?? 0;
            const target = newCurrentBet;
            return entryS.amount >= target || seatChip === 0 || entryS.folded;
          });

          const ordered = activeSeats.filter((s) => !(committed[s.id]?.folded));
          const currentIdxRaw = ordered.findIndex((s) => s.seat_no === hand.turn_seat_no);
          const currentIdx = currentIdxRaw >= 0 ? currentIdxRaw : 0;
          const nextSeat = ordered[(currentIdx + 1) % ordered.length];
          nextTurnSeatNo = nextSeat?.seat_no ?? hand.turn_seat_no;

          if (matched) {
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
          if (!winnerSeatId) {
            // showdown: evaluate best hand among surviving non-folded seats
            const survivors = activeSeats.filter((s) => !(committed[s.id]?.folded));
            const board = board_cards ?? [];
            let bestRank: number[] | null = null;
            for (const s of survivors) {
              const hole = (hand.hole_cards ?? {})[s.id] ?? [];
              const evald = bestHand([...board, ...hole]);
              const cmp = bestRank ? compareRank(evald.rank, bestRank) : 1;
              if (!bestRank || cmp > 0) {
                bestRank = evald.rank;
                winnerSeatIds = [s.id];
              } else if (cmp === 0) {
                winnerSeatIds.push(s.id);
              }
            }
            await awardChips(winnerSeatIds, pot);
            winnerSeatId = winnerSeatIds[0];
          } else {
            winnerSeatIds = [winnerSeatId];
            await awardChips(winnerSeatIds, pot);
          }
          pot = 0;
        }

        await supabase
          .from('poker_hands')
          .update({
            pot,
            turn_seat_no: nextTurnSeatNo,
            street,
            status,
            deck,
            board_cards,
            current_bet: newCurrentBet,
            committed,
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
