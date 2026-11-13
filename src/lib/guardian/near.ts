/** NEAR helpers that need no network or wallet. */

export const YOCTO_PER_NEAR = 10n ** 24n;
export const NEAR_NETWORK = "testnet" as const;
export const EXPLORER_TX_URL = "https://testnet.nearblocks.io/txns/";
export const EXPLORER_ACCOUNT_URL = "https://testnet.nearblocks.io/address/";

/**
 * NEAR account ID rules: 2–64 chars, lowercase a-z, 0-9, separators - _ . (no leading,
 * trailing, or doubled separators). Implicit accounts are 64 hex chars and match too.
 */
const ACCOUNT_ID_RE = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

export function isValidAccountId(id: string): boolean {
  return id.length >= 2 && id.length <= 64 && ACCOUNT_ID_RE.test(id);
}

export function normalizeAccountId(id: string): string {
  return id.trim().toLowerCase();
}

/** Convert a NEAR decimal amount (e.g. 1.25) to a yoctoNEAR string without float drift. */
export function nearToYocto(amount: number | string): string {
  const str = typeof amount === "number" ? amount.toFixed(6) : amount.trim();
  if (!/^\d+(\.\d+)?$/.test(str)) throw new Error(`Invalid NEAR amount: ${amount}`);
  const [whole = "0", frac = ""] = str.split(".");
  const fracPadded = (frac + "0".repeat(24)).slice(0, 24);
  return (BigInt(whole) * YOCTO_PER_NEAR + BigInt(fracPadded)).toString();
}

/** Format a yoctoNEAR string as NEAR with fixed decimals. */
export function yoctoToNear(yocto: string, decimals = 4): string {
  const value = BigInt(yocto);
  const whole = value / YOCTO_PER_NEAR;
  const frac = (value % YOCTO_PER_NEAR).toString().padStart(24, "0").slice(0, decimals);
  return decimals > 0 ? `${whole.toLocaleString("en-US")}.${frac}` : whole.toLocaleString("en-US");
}

export function formatNear(amount: number, decimals = 2): string {
  return `${amount.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} NEAR`;
}

export function shortAccount(id: string, max = 22): string {
  if (id.length <= max) return id;
  return `${id.slice(0, 10)}…${id.slice(-8)}`;
}

const RPC_URLS = ["https://rpc.testnet.near.org", "https://test.rpc.fastnear.com"];

/** Read an account's liquid balance from public NEAR testnet RPC. Read-only, no keys involved. */
export async function fetchTestnetBalance(accountId: string): Promise<string> {
  let lastError: unknown;
  for (const url of RPC_URLS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        // A stalled RPC node must not leave the balance stuck on "Reading…".
        signal: AbortSignal.timeout(8_000),
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "archangel",
          method: "query",
          params: { request_type: "view_account", finality: "final", account_id: accountId },
        }),
      });
      if (!res.ok) throw new Error(`RPC returned HTTP ${res.status}`);
      const json = (await res.json()) as {
        result?: { amount: string };
        error?: { cause?: { name?: string }; message?: string };
      };
      if (json.result?.amount) return json.result.amount;
      throw new Error(json.error?.cause?.name ?? json.error?.message ?? "RPC error");
    } catch (err) {
      lastError = err;
    }
  }
  const reason = lastError instanceof Error ? lastError.message : "unknown error";
  throw new Error(
    lastError instanceof Error && lastError.name === "TimeoutError"
      ? "NEAR testnet RPC timed out"
      : `NEAR testnet RPC unavailable (${reason})`,
  );
}
