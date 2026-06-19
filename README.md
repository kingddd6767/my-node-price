# My Node's Price

A Bitcoin price calculator that fetches the BTC/USD price directly from a personal Bitcoin node running [UTXOracle](https://utxo.live/). No exchange APIs, no trusted third parties — the price is derived entirely on-chain.

🌐 **Live at [nodeprice.me](https://nodeprice.me)**

[![Edit with Shakespeare](https://shakespeare.diy/badge.svg)](https://shakespeare.diy/clone?url=nostr%3A%2F%2Fnpub14vr3mcc5t6cxpr03xpv0f2lt9k94qnq9mm2phqw4k0jqzp97m83qycsplz%2Fgit.shakespeare.diy%2Futxoracle-btc-calculator)

---

## Features

- **On-chain price** — BTC/USD price derived from a 144-block rolling average (~24 hours) on a personal Bitcoin node, not an exchange
- **Sats or BTC** — toggle between satoshis and BTC as your input unit; sats is the default
- **Bidirectional** — type fiat to get BTC/sats, or type BTC/sats to get fiat
- **Any currency** — long-press the currency label to unlock a custom currency picker (KES, EUR, GBP, etc.) using fiat rates from open.er-api.com
- **Contextual price badge** — in sats mode shows "1 USD = 1,543 sats"; flips to "1 sat = KES 8.23" for weaker currencies
- **Share button** — generates a shareable URL with your currency, mode, and fiat amount pre-filled; BTC recalculates fresh from the live price when opened
- **Offline-friendly** — last known price is cached in localStorage; shows an amber warning if the node is unreachable
- **Quick presets** — one-tap buttons for $1, $5, $10, $25, $50, $100, $500, $1k

---

## How it works

The price comes from [UTXOracle](https://utxo.live/), which analyses UTXO spending patterns on the Bitcoin blockchain to derive a consensus price — no API keys, no exchange data, no censorship. The node endpoint is:

```
https://nutmix.note-teeth.ts.net/latest.json
```

The price is a **144-block rolling average** (roughly 24 hours of Bitcoin blocks), which smooths out short-term volatility while staying fully grounded in on-chain data.

---

## Tech stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [TailwindCSS 4](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
- [TanStack Query](https://tanstack.com/query)
- [Nostrify](https://nostrify.dev/) (Nostr protocol)
- Deployed on [Cloudflare Workers](https://workers.cloudflare.com/)

---

## Running locally

```bash
git clone https://github.com/kingddd6767/my-node-price.git
cd my-node-price
npm install
npm run dev
```

---

## License

[CC0 1.0 Universal](./LICENSE) — Public Domain. Do whatever you want with it.

---

## Issues & feedback

Open an issue on [GitHub](https://github.com/kingddd6767/my-node-price/issues) or find the project on Nostr.
