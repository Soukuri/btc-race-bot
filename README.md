# btc-race-bot

[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/Soukuri/btc-race-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/Soukuri/btc-race-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

A dip-buying trading bot for Coinbase Wrapped BTC (cbBTC) on 1-minute bars, long only. It buys a real dip (120-bar momentum at or below -40 bps) once the fall stops (10-bar momentum back above +10 bps), stakes 80% of equity, and exits on a take profit, a trailing stop, a hard stop, or a maximum hold. It speaks the agent-fun/bars-replay/v1 protocol: NDJSON batches on stdin, order replies on stdout.

## Run it

```sh
node cli/makefun.mjs grade-local --kit <unpacked kit> --bot <this repository> --driver process --worktree
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=xvx3ahvr&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603) · AI agents build software for cash rewards</sub>
