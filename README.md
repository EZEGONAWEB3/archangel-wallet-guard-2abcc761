# ArchAngel — Your AI. Your Wallet. Your Rules.

ArchAngel is a NEAR hackathon MVP that sits between your AI agents and your NEAR wallet. Agents
ask to pay; ArchAngel checks each request against your spending caps and trusted recipients; you
approve, warn on, or block it before any wallet is asked to sign.

> **Status: demo / testnet.** Guardian decisions are simulated in the browser. Caps and the trusted
> list are **not enforced on-chain**. Funds move only if you press **Send on testnet** on an approved
> request and sign the transfer in your own wallet.

## Setup

```sh
bun install      # or npm install
bun run dev      # http://localhost:8080
bun run test     # policy engine + routing tests (vitest)
bun run lint
bun run build
```

No environment variables or secrets are needed. The app talks only to public NEAR testnet RPC
(`rpc.testnet.near.org`, fallback `test.rpc.fastnear.com`) and to the wallet you choose.

## Features

- **Dashboard** — wallet status, account, live testnet balance, spent-today meter, review counts.
- **Agent payment requests** — sample requests, "Simulate incoming", and "New request" to play the agent.
  Each request shows the policy verdict, its reasons, and Approve / Warn / Block.
- **Spending caps** — per-payment and per-day caps (NEAR). Saved in this browser.
- **Trusted recipients** — add/remove NEAR account IDs (validated). Saved in this browser.
- **Security activity log** — timestamped entries with reasons, filterable by type.
- **Reset demo** — restores sample requests, default caps (5 / 20 NEAR) and trusted list, and clears the log.

## Policy rules (`src/lib/guardian/policy.ts`)

In priority order:

1. Invalid amount or account ID → **block**
2. Above the per-payment cap → **block**
3. Would push today's spend above the daily cap → **block**
4. Recipient not trusted → **warn**
5. Trusted recipient within limits → **allow**

A blocked verdict can only be blocked — Approve and Warn are disabled. "Spent today" counts
approved and allowed-with-warning requests decided since local midnight.

## Architecture

```text
src/routes/index.tsx            Dashboard page (TanStack Start route)
src/routes/__root.tsx           Providers: GuardianProvider → WalletProvider, toaster
src/components/archangel/       Panels: Wallet, Requests, RequestCard, Policy, Trusted, ActivityLog
src/lib/guardian/policy.ts      Pure policy engine (tested in policy.test.ts)
src/lib/guardian/store.tsx      Guardian state, persisted to localStorage, security log
src/lib/guardian/wallet.tsx     NEAR Wallet Selector (testnet), balance, optional transfer
src/lib/guardian/near.ts        Account ID validation, NEAR/yocto conversion, RPC balance read
src/lib/guardian/demo-data.ts   Sample agent requests
```

Stack: TanStack Start (React 19), TypeScript, Tailwind CSS v4, shadcn/ui, `@near-wallet-selector`
(MyNearWallet, Meteor, Intear), `@near-js/transactions`.

## NEAR testnet integration status

| Piece | Status |
| --- | --- |
| Wallet connect / disconnect (testnet) | Implemented via Wallet Selector. Sign-in happens in the wallet; no access key is requested. |
| Account balance | Live read from public testnet RPC (read-only). |
| Optional transfer of an approved request | Implemented: your wallet is asked to sign a plain NEAR transfer. Only what the wallet returns is recorded (hash + reported outcome). Not yet verified end-to-end with a funded account. |
| On-chain policy enforcement | **Not implemented.** No smart contract; limits live in the browser. |
| Real AI agents | **Not connected.** Requests are sample data or entered by you. |

## Simulated vs on-chain

| Action | What actually happens |
| --- | --- |
| Approve / Warn / Block | Updates this browser's records and log. No funds move. |
| Edit caps / trusted list | Saved in `localStorage` only. |
| Send on testnet | Your wallet opens; a real testnet transfer happens only if you sign it. If the wallet doesn't answer (page closed), it's recorded as not sent. |

ArchAngel never asks for, sees, or stores seed phrases or private keys.
