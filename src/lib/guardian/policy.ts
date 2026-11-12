/**
 * ArchAngel policy engine. Pure functions — runs in the browser only. This is a local,
 * advisory guard that runs before a wallet is asked to sign; it is NOT enforced on-chain.
 */
import { isValidAccountId, normalizeAccountId } from "./near";

export type Verdict = "allow" | "warn" | "block";
export type Decision = "approve" | "warn" | "block";
export type RequestStatus = "pending" | "approved" | "warned" | "blocked";

export interface Policy {
  perTxCapNear: number;
  dailyCapNear: number;
  trusted: string[];
}

export interface ChainState {
  status: "awaiting_wallet" | "wallet_success" | "wallet_failed" | "submitted";
  txHash?: string | undefined;
  error?: string | undefined;
  at: number;
}

export interface PaymentRequest {
  id: string;
  agent: string;
  recipient: string;
  amountNear: number;
  purpose: string;
  createdAt: number;
  status: RequestStatus;
  decidedAt?: number;
  decisionNote?: string;
  chain?: ChainState;
}

export interface Evaluation {
  verdict: Verdict;
  reasons: string[];
}

const EPSILON = 1e-9;

export const DEFAULT_POLICY: Policy = {
  perTxCapNear: 5,
  dailyCapNear: 20,
  trusted: ["openrouter-billing.testnet", "data-feeds.testnet", "archangel-ops.testnet"],
};

export function isTrusted(recipient: string, policy: Policy): boolean {
  const id = normalizeAccountId(recipient);
  return policy.trusted.some((t) => normalizeAccountId(t) === id);
}

/**
 * Policy rules, in priority order:
 * 1. Invalid amount or account ID → block
 * 2. Above per-transaction cap → block
 * 3. Would push today's spend above the daily cap → block
 * 4. Recipient not on the trusted list → warn
 * 5. Trusted recipient within limits → allow
 */
export function evaluatePayment(
  req: Pick<PaymentRequest, "recipient" | "amountNear">,
  policy: Policy,
  spentTodayNear: number,
): Evaluation {
  const reasons: string[] = [];
  const amount = req.amountNear;

  if (!Number.isFinite(amount) || amount <= 0) {
    return { verdict: "block", reasons: ["Amount must be greater than 0 NEAR."] };
  }
  if (!isValidAccountId(normalizeAccountId(req.recipient))) {
    return { verdict: "block", reasons: [`"${req.recipient}" is not a valid NEAR account ID.`] };
  }

  if (amount > policy.perTxCapNear + EPSILON) {
    reasons.push(`${amount} NEAR exceeds the per-transaction cap of ${policy.perTxCapNear} NEAR.`);
  }
  const projected = round(spentTodayNear + amount);
  if (projected > policy.dailyCapNear + EPSILON) {
    reasons.push(
      `Would bring today's spend to ${projected} NEAR, over the daily cap of ${policy.dailyCapNear} NEAR.`,
    );
  }
  if (reasons.length > 0) return { verdict: "block", reasons };

  if (!isTrusted(req.recipient, policy)) {
    return {
      verdict: "warn",
      reasons: [`${req.recipient} is not on your trusted list. Check before approving.`],
    };
  }
  return { verdict: "allow", reasons: ["Trusted recipient, within per-transaction and daily caps."] };
}

/** Which manual decisions the user may take for a given verdict. Block verdicts cannot be approved. */
export function allowedDecisions(verdict: Verdict): Decision[] {
  if (verdict === "block") return ["block"];
  return ["approve", "warn", "block"];
}

export function decisionToStatus(decision: Decision): RequestStatus {
  return decision === "approve" ? "approved" : decision === "warn" ? "warned" : "blocked";
}

function startOfLocalDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Simulated spend today: approved + warned (allowed-with-warning) requests decided today. */
export function spentToday(requests: PaymentRequest[], now: number): number {
  const dayStart = startOfLocalDay(now);
  return round(
    requests
      .filter(
        (r) =>
          (r.status === "approved" || r.status === "warned") && (r.decidedAt ?? 0) >= dayStart,
      )
      .reduce((sum, r) => sum + r.amountNear, 0),
  );
}

export function round(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

export function sanitizeCap(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0 || value > 1_000_000) return null;
  return round(value);
}
