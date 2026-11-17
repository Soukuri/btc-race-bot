// Dip buyer (mean reversion) for the cbBTC 1-minute bars race, long only.
//
// The pool is thin and many bars are flat, and a round trip costs about
// 12 bps of fees and slippage plus price impact, so chasing strength buys
// local tops. This bot does the opposite: it buys a real dip once the fall
// stops, and sells into the recovery.
//   - Entry (flat): the 120-bar momentum is at or below -40 bps (a real dip)
//     while the 10-bar momentum has turned up by at least +10 bps. Stake is
//     80% of equity; a round trip's impact stays near 12 bps.
//   - Exit (holding, whole position): take profit at +140 bps of value
//     against cost, a trailing stop 90 bps under the best close since entry,
//     a hard stop at -130 bps, or 300 bars held.
//   - After an exit the bot waits 45 bars before entering again, so one
//     falling market cannot churn it through fees.
// Indicators run on every bar, warm-up included, in float64 on closes only:
// the same bars give the same orders on every run.

import { runBars, type Bar, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const DIP_BARS = 120;
const DIP_BPS = -40;
const TURN_BARS = 10;
const TURN_BPS = 10;
const STAKE_BPS = 8000;
const STOP_BPS = -130;
const TAKE_BPS = 140;
const TRAIL_BPS = 90;
const TRAIL_MIN_BARS = 5;
const MAX_HOLD_BARS = 300;
const COOLDOWN_BARS = 45;
const BUY_SLIPPAGE_BPS = 120;
const SELL_SLIPPAGE_BPS = 250;

interface Tracker {
  closes: number[];
  peakClose: number;
  heldBars: number;
  cooldown: number;
}

const trackers = new Map<string, Tracker>();

function tracker(symbol: string): Tracker {
  let t = trackers.get(symbol);
  if (t === undefined) {
    t = { closes: [], peakClose: 0, heldBars: 0, cooldown: 0 };
    trackers.set(symbol, t);
  }
  return t;
}

await runBars({
  onBatch(state: BarsState, batch) {
    const fresh = new Set<string>();
    for (const bar of batch.bars) {
      const t = tracker(bar.symbol);
      t.closes.push(Number(bar.c));
      if (t.closes.length > 512) t.closes.shift();
      fresh.add(bar.symbol);
    }
    if (state.warmingUp) return [];

    const orders: (BuyInput | SellInput)[] = [];
    const minNotional = BigInt(state.hello.fees.min_notional_quote_units);

    for (const { symbol } of state.hello.symbols) {
      if (!fresh.has(symbol)) continue;
      const t = tracker(symbol);
      const close = state.close(symbol);
      if (close === null) continue;
      const held = state.positions.get(symbol);
      const c = Number(close);

      if (held !== undefined) {
        t.heldBars += 1;
        if (c > t.peakClose) t.peakClose = c;
        const value = state.value(symbol, held.qty);
        const pnlBps = held.cost > 0n ? Number(((value - held.cost) * 10000n) / held.cost) : 0;
        const trailing = t.heldBars >= TRAIL_MIN_BARS && t.peakClose > 0 && c <= t.peakClose * (1 - TRAIL_BPS / 10000);
        if (pnlBps <= STOP_BPS || pnlBps >= TAKE_BPS || trailing || t.heldBars >= MAX_HOLD_BARS) {
          orders.push({ side: 'sell', symbol, qty: held.qty, max_slippage_bps: SELL_SLIPPAGE_BPS });
          t.cooldown = COOLDOWN_BARS;
          t.heldBars = 0;
          t.peakClose = 0;
        }
        continue;
      }

      if (t.cooldown > 0) { t.cooldown -= 1; continue; }
      const n = t.closes.length;
      if (n <= DIP_BARS) continue;
      const momLong = (t.closes[n - 1] / t.closes[n - 1 - DIP_BARS] - 1) * 10000;
      const momShort = (t.closes[n - 1] / t.closes[n - 1 - TURN_BARS] - 1) * 10000;
      if (momLong <= DIP_BPS && momShort >= TURN_BPS) {
        let notional = (state.equity * BigInt(STAKE_BPS)) / 10000n;
        if (notional > state.cash) notional = state.cash;
        const room = state.weightRoom(symbol);
        if (notional > room) notional = room;
        if (notional >= minNotional * 2n) {
          orders.push({ side: 'buy', symbol, notional_quote_units: notional, max_slippage_bps: BUY_SLIPPAGE_BPS });
          t.peakClose = c;
          t.heldBars = 0;
        }
      }
    }
    return orders;
  },
});
