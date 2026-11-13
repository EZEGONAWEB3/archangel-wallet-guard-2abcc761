/**
 * NEAR wallet connection via @near-wallet-selector (testnet). Loaded only in the browser.
 * ArchAngel never asks for, sees, or stores seed phrases or private keys: sign-in and any
 * signing happen inside the user's wallet.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { WalletSelector } from "@near-wallet-selector/core";
import { fetchTestnetBalance, nearToYocto, NEAR_NETWORK } from "./near";
import { PENDING_TX_KEY, useGuardian } from "./store";
import type { PaymentRequest } from "./policy";

export type WalletStatus = "loading" | "disconnected" | "connecting" | "connected" | "unavailable";

export interface WalletOption {
  id: string;
  name: string;
  iconUrl: string;
  description: string | null;
  type: string;
  available: boolean;
}

interface WalletContextValue {
  status: WalletStatus;
  accountId: string | null;
  walletName: string | null;
  balanceYocto: string | null;
  balanceError: string | null;
  options: WalletOption[];
  initError: string | null;
  connect: (walletId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  sendTransfer: (req: PaymentRequest) => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { logEvent, setChain } = useGuardian();
  const selectorRef = useRef<WalletSelector | null>(null);
  const [status, setStatus] = useState<WalletStatus>("loading");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [balanceYocto, setBalance] = useState<string | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [options, setOptions] = useState<WalletOption[]>([]);
  const [initError, setInitError] = useState<string | null>(null);

  const loadBalance = useCallback(async (id: string) => {
    setBalanceError(null);
    try {
      setBalance(await fetchTestnetBalance(id));
    } catch (err) {
      setBalance(null);
      setBalanceError(err instanceof Error ? err.message : "Balance unavailable");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        // Wallet modules expect Node's Buffer global in the browser.
        const { Buffer } = await import("buffer");
        const g = globalThis as unknown as { Buffer?: typeof Buffer };
        g.Buffer ??= Buffer;

        const [{ setupWalletSelector }, { setupMyNearWallet }, { setupMeteorWallet }, { setupIntearWallet }] =
          await Promise.all([
            import("@near-wallet-selector/core"),
            import("@near-wallet-selector/my-near-wallet"),
            import("@near-wallet-selector/meteor-wallet"),
            import("@near-wallet-selector/intear-wallet"),
          ]);

        const selector = await setupWalletSelector({
          network: NEAR_NETWORK,
          modules: [setupMyNearWallet(), setupMeteorWallet(), setupIntearWallet()],
        });
        if (cancelled) return;
        selectorRef.current = selector;

        const apply = (state: ReturnType<typeof selector.store.getState>) => {
          setOptions(
            state.modules.map((m) => ({
              id: m.id,
              name: m.metadata.name,
              iconUrl: m.metadata.iconUrl,
              description: m.metadata.description,
              type: m.type,
              available: m.metadata.available,
            })),
          );
          const active = state.accounts.find((a) => a.active) ?? state.accounts[0];
          const mod = state.modules.find((m) => m.id === state.selectedWalletId);
          setWalletName(mod?.metadata.name ?? null);
          if (active) {
            setAccountId(active.accountId);
            setStatus("connected");
          } else {
            setAccountId(null);
            setBalance(null);
            setStatus((s) => (s === "connecting" ? s : "disconnected"));
          }
        };
        apply(selector.store.getState());
        const sub = selector.store.observable.subscribe(apply);
        unsubscribe = () => sub.unsubscribe();
      } catch (err) {
        if (cancelled) return;
        console.error("[ArchAngel] Wallet selector failed to load", err);
        setInitError(err instanceof Error ? err.message : "Wallet selector failed to load");
        setStatus("unavailable");
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (accountId) void loadBalance(accountId);
  }, [accountId, loadBalance]);

  const connect = useCallback(
    async (walletId: string) => {
      const selector = selectorRef.current;
      if (!selector) return;
      setStatus("connecting");
      try {
        const wallet = await selector.wallet(walletId);
        // No contractId: ArchAngel asks for no function-call access key, only the account ID.
        const accounts = await (wallet.signIn as (p: object) => Promise<{ accountId: string }[]>)({});
        if (accounts?.[0]) {
          logEvent({
            kind: "wallet",
            tone: "allow",
            title: `Wallet connected: ${accounts[0].accountId}`,
            detail: `Connected via ${wallet.metadata.name} on NEAR ${NEAR_NETWORK}. No keys were shared with ArchAngel.`,
          });
        }
      } catch (err) {
        setStatus(selector.isSignedIn() ? "connected" : "disconnected");
        logEvent({
          kind: "wallet",
          tone: "warn",
          title: "Wallet connection cancelled",
          detail: err instanceof Error ? err.message : "The wallet did not complete sign-in.",
        });
        throw err;
      }
    },
    [logEvent],
  );

  const disconnect = useCallback(async () => {
    const selector = selectorRef.current;
    if (!selector) return;
    const id = accountId;
    try {
      const wallet = await selector.wallet();
      await wallet.signOut();
    } finally {
      setAccountId(null);
      setBalance(null);
      setStatus("disconnected");
      logEvent({
        kind: "wallet",
        tone: "info",
        title: "Wallet disconnected",
        detail: id ? `${id} signed out of ArchAngel.` : "Signed out.",
      });
    }
  }, [accountId, logEvent]);

  const refreshBalance = useCallback(async () => {
    if (accountId) await loadBalance(accountId);
  }, [accountId, loadBalance]);

  /**
   * Ask the connected wallet to sign a real testnet NEAR transfer for an already-approved request.
   * Only what the wallet returns is recorded; nothing is marked as sent otherwise.
   */
  const sendTransfer = useCallback(
    async (req: PaymentRequest) => {
      const selector = selectorRef.current;
      if (!selector || !accountId) throw new Error("Connect a wallet first.");
      if (req.status !== "approved" && req.status !== "warned") {
        throw new Error("Only approved requests can be sent to your wallet.");
      }
      const { actionCreators } = await import("@near-js/transactions");
      setChain(req.id, { status: "awaiting_wallet", at: Date.now() });
      localStorage.setItem(PENDING_TX_KEY, req.id);
      logEvent({
        kind: "chain",
        tone: "info",
        title: `Asked wallet to sign ${req.amountNear} NEAR → ${req.recipient}`,
        detail: "Waiting for you to confirm or reject in your wallet.",
      });
      try {
        const wallet = await selector.wallet();
        const outcome = await wallet.signAndSendTransaction({
          receiverId: req.recipient,
          actions: [actionCreators.transfer(BigInt(nearToYocto(req.amountNear)))],
        });
        localStorage.removeItem(PENDING_TX_KEY);
        const hash = outcome?.transaction?.hash ?? outcome?.transaction_outcome?.id;
        const st = outcome?.status;
        const success = typeof st === "object" && st !== null && "SuccessValue" in st;
        setChain(req.id, {
          status: success ? "wallet_success" : "wallet_failed",
          txHash: hash,
          error: success ? undefined : "Transaction outcome did not report success.",
          at: Date.now(),
        });
        logEvent({
          kind: "chain",
          tone: success ? "allow" : "block",
          title: success ? "Testnet transfer reported successful" : "Testnet transfer failed",
          detail: hash ? `Transaction ${hash} (as reported by the wallet / RPC outcome).` : "No hash returned.",
        });
        void loadBalance(accountId);
      } catch (err) {
        localStorage.removeItem(PENDING_TX_KEY);
        const message = err instanceof Error ? err.message : "Wallet rejected or failed.";
        setChain(req.id, { status: "wallet_failed", error: message, at: Date.now() });
        logEvent({ kind: "chain", tone: "block", title: "Wallet did not send the transfer", detail: message });
        throw err;
      }
    },
    [accountId, logEvent, setChain, loadBalance],
  );

  return (
    <WalletContext.Provider
      value={{
        status,
        accountId,
        walletName,
        balanceYocto,
        balanceError,
        options,
        initError,
        connect,
        disconnect,
        refreshBalance,
        sendTransfer,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}
