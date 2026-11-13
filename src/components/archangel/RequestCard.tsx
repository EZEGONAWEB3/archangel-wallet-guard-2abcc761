import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Ban, Bot, CircleCheck, ExternalLink, Loader2, Send, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge, VerdictBadge } from "./badges";
import { useGuardian } from "@/lib/guardian/store";
import { useWallet } from "@/lib/guardian/wallet";
import { allowedDecisions, type Decision, type PaymentRequest } from "@/lib/guardian/policy";
import { EXPLORER_TX_URL, formatNear } from "@/lib/guardian/near";
import { cn } from "@/lib/utils";

export function RequestCard({ req }: { req: PaymentRequest }) {
  const { evaluate, decide } = useGuardian();
  const pending = req.status === "pending";
  const evaluation = pending ? evaluate(req) : null;
  const allowed = evaluation ? allowedDecisions(evaluation.verdict) : [];

  const act = (d: Decision) => {
    const res = decide(req.id, d);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    const label = d === "approve" ? "Approved" : d === "warn" ? "Allowed with warning" : "Blocked";
    toast(`${label} · ${formatNear(req.amountNear)}`, {
      description: "Simulated decision — no funds moved.",
    });
  };

  const accent =
    evaluation?.verdict === "block" || req.status === "blocked"
      ? "before:bg-destructive"
      : evaluation?.verdict === "warn" || req.status === "warned"
        ? "before:bg-warning"
        : "before:bg-success";

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-lg border border-border bg-surface p-4 pl-5 animate-rise",
        "before:absolute before:inset-y-0 before:left-0 before:w-1",
        accent,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Bot className="size-3.5 text-primary" />
            <span className="font-medium text-foreground">{req.agent}</span>
            <span aria-hidden>·</span>
            <span>{formatDistanceToNow(req.createdAt, { addSuffix: true })}</span>
          </p>
          <p className="text-sm text-foreground">{req.purpose}</p>
          <p className="truncate font-mono text-xs text-muted-foreground" title={req.recipient}>
            → {req.recipient}
          </p>
        </div>
        <div className="flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-end">
          <span className="font-mono text-lg font-semibold text-foreground">
            {formatNear(req.amountNear)}
          </span>
          {evaluation ? (
            <VerdictBadge verdict={evaluation.verdict} />
          ) : (
            <StatusBadge status={req.status} />
          )}
        </div>
      </div>

      {evaluation && (
        <>
          <p
            className={cn(
              "mt-3 rounded-md px-3 py-2 text-xs",
              evaluation.verdict === "block"
                ? "bg-destructive/10 text-destructive"
                : evaluation.verdict === "warn"
                  ? "bg-warning/10 text-warning"
                  : "bg-success/10 text-success",
            )}
          >
            {evaluation.reasons.join(" ")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="approve"
              disabled={!allowed.includes("approve")}
              onClick={() => act("approve")}
              title={
                allowed.includes("approve") ? "Approve this payment" : "Policy blocks this payment"
              }
            >
              <CircleCheck /> Approve
            </Button>
            <Button
              size="sm"
              variant="warn"
              disabled={!allowed.includes("warn")}
              onClick={() => act("warn")}
              title="Allow it, but flag it in the log for follow-up"
            >
              <TriangleAlert /> Warn
            </Button>
            <Button
              size="sm"
              variant="block"
              onClick={() => act("block")}
              title="Refuse this payment"
            >
              <Ban /> Block
            </Button>
          </div>
          {evaluation.verdict === "block" && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Over a cap, so it can only be blocked.
            </p>
          )}
        </>
      )}

      {!pending && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {req.decisionNote && <p className="text-xs text-muted-foreground">{req.decisionNote}</p>}
          {(req.status === "approved" || req.status === "warned") && <ChainSection req={req} />}
        </div>
      )}
    </article>
  );
}

/** Optional real testnet transfer for an approved request. Shows only what the wallet reported. */
function ChainSection({ req }: { req: PaymentRequest }) {
  const { status, accountId, sendTransfer } = useWallet();
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const chain = req.chain;

  const send = async () => {
    setConfirm(false);
    setSending(true);
    try {
      await sendTransfer(req);
    } catch (err) {
      toast.error("Wallet didn't send the transfer", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSending(false);
    }
  };

  const txLink = chain?.txHash ? (
    <a
      href={`${EXPLORER_TX_URL}${chain.txHash}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
    >
      {chain.txHash.slice(0, 10)}…{chain.txHash.slice(-6)} <ExternalLink className="size-3" />
    </a>
  ) : null;

  if (chain?.status === "wallet_success")
    return (
      <p className="text-xs text-success">Wallet reported a successful testnet transfer {txLink}</p>
    );
  if (chain?.status === "submitted")
    return (
      <p className="text-xs text-primary-glow">
        Wallet returned a testnet transaction hash {txLink} — check the explorer for the final
        status.
      </p>
    );
  if (chain?.status === "awaiting_wallet" || sending)
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Waiting for your wallet…
      </p>
    );

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground">
        {chain?.status === "wallet_failed" ? (
          <span className="text-destructive">Not sent: {chain.error}</span>
        ) : status === "connected" ? (
          "Simulated only — no funds moved."
        ) : (
          "Simulated only — no funds moved. Connect a wallet to send it on testnet."
        )}
      </p>
      {status === "connected" && accountId && (
        <>
          <Button size="sm" variant="surface" onClick={() => setConfirm(true)}>
            <Send />{" "}
            {chain?.status === "wallet_failed" ? "Try again on testnet" : "Send on testnet"}
          </Button>
          <AlertDialog open={confirm} onOpenChange={setConfirm}>
            <AlertDialogContent className="border-border bg-popover">
              <AlertDialogHeader>
                <AlertDialogTitle>Send a real testnet transfer?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      Your wallet will ask you to sign a transfer of{" "}
                      <span className="font-mono text-foreground">
                        {formatNear(req.amountNear)}
                      </span>{" "}
                      from <span className="font-mono text-foreground">{accountId}</span> to{" "}
                      <span className="font-mono text-foreground">{req.recipient}</span> on NEAR
                      testnet.
                    </p>
                    <p>
                      ArchAngel's policy check ran here in the app — it isn't enforced on-chain.
                      Only your wallet signature can move funds. If the recipient account doesn't
                      exist on testnet, the transfer will fail.
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => void send()}>
                  Open wallet to sign
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
