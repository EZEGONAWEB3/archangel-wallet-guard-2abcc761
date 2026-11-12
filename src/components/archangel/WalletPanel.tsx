import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, KeyRound, Loader2, LogOut, RefreshCw, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Panel } from "./PageHeader";
import { SourceBadge } from "./badges";
import { useWallet } from "@/lib/guardian/wallet";
import { EXPLORER_ACCOUNT_URL, shortAccount, yoctoToNear } from "@/lib/guardian/near";

/** Picker for the wallets the selector loaded. Sign-in happens inside the chosen wallet. */
export function WalletDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { options, connect, status, initError } = useWallet();
  const [busy, setBusy] = useState<string | null>(null);

  const pick = async (id: string, name: string) => {
    setBusy(id);
    try {
      await connect(id);
      onOpenChange(false);
    } catch (err) {
      toast.error(`${name} didn't connect`, {
        description: err instanceof Error ? err.message : "Sign-in was cancelled.",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-popover sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect a NEAR testnet wallet</DialogTitle>
          <DialogDescription>
            You sign in inside your wallet. ArchAngel only learns your account ID — it never asks for a
            seed phrase or private key.
          </DialogDescription>
        </DialogHeader>
        {status === "unavailable" && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Wallet options failed to load: {initError}
          </p>
        )}
        {status === "loading" && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading wallet options…
          </p>
        )}
        <ul className="space-y-2">
          {options.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                disabled={!o.available || busy !== null}
                onClick={() => void pick(o.id, o.name)}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface-raised p-3 text-left transition-colors hover:border-primary/60 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <img src={o.iconUrl} alt="" className="size-8 rounded-md bg-background p-1" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">{o.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {o.available ? (o.description ?? `${o.type} wallet`) : "Not available in this browser"}
                  </span>
                </span>
                {busy === o.id && <Loader2 className="size-4 animate-spin text-primary" />}
              </button>
            </li>
          ))}
        </ul>
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <KeyRound className="mt-0.5 size-3.5 shrink-0 text-primary" />
          Connecting doesn't add any access key or permission. Every transfer still needs your approval in the
          wallet.
        </p>
      </DialogContent>
    </Dialog>
  );
}

export function WalletPanel() {
  const w = useWallet();
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await w.refreshBalance();
    setRefreshing(false);
  };

  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary">
            <Wallet className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">NEAR wallet</h2>
            <p className="text-xs text-muted-foreground">Testnet</p>
          </div>
        </div>
        <ConnectionPill status={w.status} />
      </div>

      {w.status === "connected" && w.accountId ? (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground">Account{w.walletName ? ` · via ${w.walletName}` : ""}</p>
            <a
              href={`${EXPLORER_ACCOUNT_URL}${w.accountId}`}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 inline-flex max-w-full items-center gap-1.5 font-mono text-sm text-foreground hover:text-primary"
              title={w.accountId}
            >
              <span className="truncate">{shortAccount(w.accountId, 30)}</span>
              <ExternalLink className="size-3.5 shrink-0" />
            </a>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">Balance</p>
              <SourceBadge source="live" />
            </div>
            {w.balanceYocto ? (
              <p className="mt-1 font-mono text-xl font-semibold text-foreground">
                {yoctoToNear(w.balanceYocto)} <span className="text-sm text-muted-foreground">NEAR</span>
              </p>
            ) : w.balanceError ? (
              <p className="mt-1 text-sm text-destructive">Couldn't read balance: {w.balanceError}</p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Reading from testnet…</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="surface" onClick={() => void refresh()} disabled={refreshing}>
              <RefreshCw className={refreshing ? "animate-spin" : ""} /> Refresh
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void w.disconnect()}>
              <LogOut /> Disconnect
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            {w.status === "unavailable"
              ? "Wallet options couldn't load. The demo still works without a wallet."
              : "Not connected. The guardian demo works without a wallet; connect one to see your real testnet balance and optionally send approved payments."}
          </p>
          <Button
            variant="hero"
            onClick={() => setOpen(true)}
            disabled={w.status === "loading" || w.status === "connecting" || w.status === "unavailable"}
          >
            {w.status === "connecting" || w.status === "loading" ? <Loader2 className="animate-spin" /> : <Wallet />}
            {w.status === "connecting" ? "Connecting…" : w.status === "loading" ? "Loading wallets…" : "Connect wallet"}
          </Button>
        </div>
      )}
      <WalletDialog open={open} onOpenChange={setOpen} />
    </Panel>
  );
}

function ConnectionPill({ status }: { status: ReturnType<typeof useWallet>["status"] }) {
  const map = {
    connected: { label: "Connected", dot: "bg-success", text: "text-success" },
    connecting: { label: "Connecting", dot: "bg-warning", text: "text-warning" },
    loading: { label: "Loading", dot: "bg-muted-foreground", text: "text-muted-foreground" },
    disconnected: { label: "Disconnected", dot: "bg-muted-foreground", text: "text-muted-foreground" },
    unavailable: { label: "Unavailable", dot: "bg-destructive", text: "text-destructive" },
  } as const;
  const m = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs ${m.text}`}>
      <span className={`size-1.5 rounded-full ${m.dot}`} /> {m.label}
    </span>
  );
}
