/**
 * Local guardian state: policy, trusted list, agent payment requests, and the security log.
 * Persisted to localStorage for the demo — nothing here is stored or enforced on-chain.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_POLICY,
  allowedDecisions,
  decisionToStatus,
  evaluatePayment,
  round,
  settleInterruptedTransfers,
  spentToday,
  type ChainState,
  type Decision,
  type PaymentRequest,
  type Policy,
  type Verdict,
} from "./policy";
import {
  createRequest,
  createSampleRequests,
  randomTemplate,
  REQUEST_TEMPLATES,
} from "./demo-data";
import { isValidAccountId, normalizeAccountId } from "./near";

const STORAGE_KEY = "archangel:v1";
export const PENDING_TX_KEY = "archangel:pending-tx";

export type LogKind = "decision" | "policy" | "trusted" | "wallet" | "request" | "chain" | "system";

export interface LogEntry {
  id: string;
  at: number;
  kind: LogKind;
  tone: Verdict | "info";
  title: string;
  detail: string;
}

interface PersistedState {
  policy: Policy;
  requests: PaymentRequest[];
  log: LogEntry[];
}

type NewRequest = Pick<PaymentRequest, "agent" | "recipient" | "amountNear" | "purpose">;

interface GuardianContextValue extends PersistedState {
  ready: boolean;
  spentToday: number;
  evaluate: (
    req: Pick<PaymentRequest, "recipient" | "amountNear">,
  ) => ReturnType<typeof evaluatePayment>;
  decide: (id: string, decision: Decision) => { ok: boolean; message: string };
  addRequest: (req: NewRequest) => void;
  simulateIncoming: () => void;
  updateCaps: (perTxCapNear: number, dailyCapNear: number) => void;
  addTrusted: (accountId: string) => { ok: boolean; message: string };
  removeTrusted: (accountId: string) => void;
  setChain: (id: string, chain: ChainState) => void;
  logEvent: (entry: Omit<LogEntry, "id" | "at">) => void;
  resetDemo: () => void;
}

const GuardianContext = createContext<GuardianContextValue | null>(null);

let logCounter = 0;
function logId(): string {
  logCounter += 1;
  return `log_${Date.now().toString(36)}_${logCounter}`;
}

function freshState(now: number, reset = false): PersistedState {
  return {
    policy: { ...DEFAULT_POLICY, trusted: [...DEFAULT_POLICY.trusted] },
    requests: createSampleRequests(now),
    log: [
      {
        id: logId(),
        at: now,
        kind: "system",
        tone: "info",
        title: reset ? "Demo reset" : "Demo guardian initialized",
        detail: `${reset ? "Cleared the previous demo data. " : ""}Loaded ${REQUEST_TEMPLATES.slice(0, 5).length} sample agent payment requests and a local demo policy.`,
      },
    ],
  };
}

function load(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed.policy || !Array.isArray(parsed.requests) || !Array.isArray(parsed.log))
      return null;
    return parsed;
  } catch {
    return null;
  }
}

const EMPTY: PersistedState = { policy: DEFAULT_POLICY, requests: [], log: [] };

export function GuardianProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(EMPTY);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(0);

  // Load persisted state after hydration (localStorage is browser-only).
  useEffect(() => {
    const loaded = load() ?? freshState(Date.now());
    const reconciled = reconcileWalletRedirect(loaded);
    setState({
      ...reconciled,
      requests: settleInterruptedTransfers(reconciled.requests, Date.now()),
    });
    setNow(Date.now());
    setReady(true);
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, ready]);

  const spent = useMemo(() => spentToday(state.requests, now || Date.now()), [state.requests, now]);

  const appendLog = (s: PersistedState, entry: Omit<LogEntry, "id" | "at">): PersistedState => ({
    ...s,
    log: [{ ...entry, id: logId(), at: Date.now() }, ...s.log].slice(0, 300),
  });

  const evaluate = useCallback(
    (req: Pick<PaymentRequest, "recipient" | "amountNear">) =>
      evaluatePayment(req, state.policy, spent),
    [state.policy, spent],
  );

  const decide = useCallback(
    (id: string, decision: Decision) => {
      const req = state.requests.find((r) => r.id === id);
      if (!req || req.status !== "pending")
        return { ok: false, message: "Request is no longer pending." };
      const evaluation = evaluatePayment(req, state.policy, spent);
      if (!allowedDecisions(evaluation.verdict).includes(decision)) {
        return { ok: false, message: "Policy blocks this payment. It can't be approved." };
      }
      const status = decisionToStatus(decision);
      const override = decision === "approve" && evaluation.verdict === "warn";
      const note =
        decision === "block"
          ? evaluation.verdict === "block"
            ? evaluation.reasons.join(" ")
            : "Blocked manually by you."
          : decision === "warn"
            ? `Allowed with a warning flag. ${evaluation.reasons.join(" ")}`
            : override
              ? `Approved by your override. ${evaluation.reasons.join(" ")}`
              : evaluation.reasons.join(" ");
      const at = Date.now();
      setState((s) =>
        appendLog(
          {
            ...s,
            requests: s.requests.map((r) =>
              r.id === id ? { ...r, status, decidedAt: at, decisionNote: note } : r,
            ),
          },
          {
            kind: "decision",
            tone: decision === "approve" ? "allow" : decision === "warn" ? "warn" : "block",
            title: `${status === "approved" ? "Approved" : status === "warned" ? "Allowed with warning" : "Blocked"} · ${round(req.amountNear)} NEAR → ${req.recipient}`,
            detail: `${req.agent}: ${note} (Simulated decision — no funds moved.)`,
          },
        ),
      );
      return { ok: true, message: note };
    },
    [state.requests, state.policy, spent],
  );

  const addRequest = useCallback((req: NewRequest) => {
    const created = createRequest(
      { ...req, recipient: normalizeAccountId(req.recipient), amountNear: round(req.amountNear) },
      Date.now(),
    );
    setState((s) =>
      appendLog(
        { ...s, requests: [created, ...s.requests] },
        {
          kind: "request",
          tone: "info",
          title: `New request from ${created.agent}`,
          detail: `${created.amountNear} NEAR → ${created.recipient}: ${created.purpose}`,
        },
      ),
    );
  }, []);

  const simulateIncoming = useCallback(() => addRequest(randomTemplate()), [addRequest]);

  const updateCaps = useCallback((perTxCapNear: number, dailyCapNear: number) => {
    setState((s) =>
      appendLog(
        { ...s, policy: { ...s.policy, perTxCapNear, dailyCapNear } },
        {
          kind: "policy",
          tone: "info",
          title: "Spending caps updated (local)",
          detail: `Per-transaction ${s.policy.perTxCapNear} → ${perTxCapNear} NEAR · Daily ${s.policy.dailyCapNear} → ${dailyCapNear} NEAR. Saved in this browser only.`,
        },
      ),
    );
  }, []);

  const addTrusted = useCallback(
    (accountId: string) => {
      const id = normalizeAccountId(accountId);
      if (!isValidAccountId(id))
        return { ok: false, message: "That isn't a valid NEAR account ID." };
      if (state.policy.trusted.includes(id)) return { ok: false, message: "Already trusted." };
      setState((s) =>
        appendLog(
          { ...s, policy: { ...s.policy, trusted: [...s.policy.trusted, id] } },
          {
            kind: "trusted",
            tone: "allow",
            title: `Trusted ${id}`,
            detail: "Added to the local trusted list.",
          },
        ),
      );
      return { ok: true, message: `${id} is now trusted.` };
    },
    [state.policy.trusted],
  );

  const removeTrusted = useCallback((accountId: string) => {
    setState((s) =>
      appendLog(
        { ...s, policy: { ...s.policy, trusted: s.policy.trusted.filter((t) => t !== accountId) } },
        {
          kind: "trusted",
          tone: "warn",
          title: `Removed ${accountId}`,
          detail: "Future payments to this account will be flagged as unknown.",
        },
      ),
    );
  }, []);

  const setChain = useCallback((id: string, chain: ChainState) => {
    setState((s) => ({
      ...s,
      requests: s.requests.map((r) => (r.id === id ? { ...r, chain } : r)),
    }));
  }, []);

  const logEvent = useCallback((entry: Omit<LogEntry, "id" | "at">) => {
    setState((s) => appendLog(s, entry));
  }, []);

  const resetDemo = useCallback(() => {
    localStorage.removeItem(PENDING_TX_KEY);
    setState(freshState(Date.now(), true));
  }, []);

  const value: GuardianContextValue = {
    ...state,
    ready,
    spentToday: spent,
    evaluate,
    decide,
    addRequest,
    simulateIncoming,
    updateCaps,
    addTrusted,
    removeTrusted,
    setChain,
    logEvent,
    resetDemo,
  };

  return <GuardianContext.Provider value={value}>{children}</GuardianContext.Provider>;
}

export function useGuardian(): GuardianContextValue {
  const ctx = useContext(GuardianContext);
  if (!ctx) throw new Error("useGuardian must be used inside GuardianProvider");
  return ctx;
}

/**
 * Browser wallets (e.g. MyNearWallet) redirect back with ?transactionHashes=… or ?errorCode=….
 * Record what the wallet reported against the request that started the redirect, then clean the URL.
 * A returned hash means the wallet submitted a transaction — the outcome is shown via the explorer link.
 */
function reconcileWalletRedirect(state: PersistedState): PersistedState {
  const url = new URL(window.location.href);
  const hashes = url.searchParams.get("transactionHashes");
  const errorCode = url.searchParams.get("errorCode");
  const pendingId = localStorage.getItem(PENDING_TX_KEY);
  if (!pendingId || (!hashes && !errorCode)) return state;

  localStorage.removeItem(PENDING_TX_KEY);
  ["transactionHashes", "errorCode", "errorMessage"].forEach((k) => url.searchParams.delete(k));
  window.history.replaceState(null, "", url.toString());

  const at = Date.now();
  const chain: ChainState = hashes
    ? { status: "submitted", txHash: hashes.split(",")[0], at }
    : { status: "wallet_failed", error: decodeURIComponent(errorCode ?? "Wallet error"), at };
  const req = state.requests.find((r) => r.id === pendingId);
  return {
    ...state,
    requests: state.requests.map((r) => (r.id === pendingId ? { ...r, chain } : r)),
    log: [
      {
        id: logId(),
        at,
        kind: "chain",
        tone: hashes ? "info" : "block",
        title: hashes
          ? "Wallet returned a testnet transaction hash"
          : "Wallet did not send the transfer",
        detail: hashes
          ? `For ${req?.recipient ?? "request"}: ${chain.txHash}. Check the explorer for the final status.`
          : `Wallet reported: ${chain.error}`,
      },
      ...state.log,
    ],
  };
}
