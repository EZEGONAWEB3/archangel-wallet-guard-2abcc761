import type { PaymentRequest } from "./policy";

type Template = Omit<PaymentRequest, "id" | "createdAt" | "status">;

/** Sample agent payment requests. Recipients are illustrative testnet-style IDs. */
export const REQUEST_TEMPLATES: Template[] = [
  {
    agent: "Research Agent",
    recipient: "openrouter-billing.testnet",
    amountNear: 1.2,
    purpose: "Top up model inference credits for today's market summary.",
  },
  {
    agent: "Trading Copilot",
    recipient: "fast-yield-airdrop.testnet",
    amountNear: 3.5,
    purpose: "Claim fee for a 'guaranteed 40% APY' airdrop found in a Telegram channel.",
  },
  {
    agent: "Shopping Agent",
    recipient: "data-feeds.testnet",
    amountNear: 12,
    purpose: "Annual premium price-feed subscription, paid upfront.",
  },
  {
    agent: "Research Agent",
    recipient: "data-feeds.testnet",
    amountNear: 0.8,
    purpose: "Pay-per-call oracle query for NEAR/USD reference price.",
  },
  {
    agent: "Ops Agent",
    recipient: "gpu-rental.testnet",
    amountNear: 4.75,
    purpose: "Rent 2 GPU-hours to fine-tune the support classifier.",
  },
  {
    agent: "Support Agent",
    recipient: "archangel-ops.testnet",
    amountNear: 0.25,
    purpose: "Refund a customer's duplicate subscription charge.",
  },
  {
    agent: "Trading Copilot",
    recipient: "dex-router-v2.testnet",
    amountNear: 18,
    purpose: "Swap NEAR to USDC ahead of predicted volatility.",
  },
  {
    agent: "Shopping Agent",
    recipient: "merch-store.testnet",
    amountNear: 2.1,
    purpose: "Order hackathon team T-shirts (4 units).",
  },
];

let counter = 0;
function makeId(now: number): string {
  counter += 1;
  return `req_${now.toString(36)}_${counter}`;
}

export function createSampleRequests(now: number): PaymentRequest[] {
  return REQUEST_TEMPLATES.slice(0, 5).map((t, i) => ({
    ...t,
    id: makeId(now + i),
    createdAt: now - (5 - i) * 7 * 60_000,
    status: "pending" as const,
  }));
}

export function createRequest(template: Template, now: number): PaymentRequest {
  return { ...template, id: makeId(now), createdAt: now, status: "pending" };
}

export function randomTemplate(): Template {
  return REQUEST_TEMPLATES[Math.floor(Math.random() * REQUEST_TEMPLATES.length)];
}

export const DEMO_BALANCE_NEAR = 125;
