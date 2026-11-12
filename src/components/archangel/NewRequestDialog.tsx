import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VerdictBadge } from "./badges";
import { useGuardian } from "@/lib/guardian/store";
import { isValidAccountId, normalizeAccountId } from "@/lib/guardian/near";

/** Lets you play the AI agent: submit a payment request and watch the guardian evaluate it. */
export function NewRequestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { addRequest, evaluate } = useGuardian();
  const [agent, setAgent] = useState("My Agent");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");

  const amountNum = Number(amount);
  const recipientId = normalizeAccountId(recipient);
  const valid =
    agent.trim().length > 0 &&
    purpose.trim().length > 0 &&
    isValidAccountId(recipientId) &&
    Number.isFinite(amountNum) &&
    amountNum > 0;
  const preview = recipient && amount ? evaluate({ recipient: recipientId, amountNear: amountNum }) : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    addRequest({ agent: agent.trim(), recipient: recipientId, amountNear: amountNum, purpose: purpose.trim() });
    toast.info("Payment request queued for review");
    setRecipient("");
    setAmount("");
    setPurpose("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-popover sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New agent payment request</DialogTitle>
          <DialogDescription>
            Play the AI agent. The request lands in your review queue — nothing is sent anywhere.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nr-agent">Agent name</Label>
              <Input id="nr-agent" value={agent} onChange={(e) => setAgent(e.target.value)} maxLength={40} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nr-amount">Amount (NEAR)</Label>
              <Input
                id="nr-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="font-mono"
                placeholder="1.5"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nr-recipient">Recipient account</Label>
            <Input
              id="nr-recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="font-mono"
              placeholder="service.testnet"
            />
            {recipient && !isValidAccountId(recipientId) && (
              <p className="text-xs text-destructive">That isn't a valid NEAR account ID.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nr-purpose">Purpose</Label>
            <Textarea
              id="nr-purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="What the agent says this payment is for"
            />
          </div>
          {preview && (
            <div className="rounded-lg border border-border bg-surface p-3">
              <VerdictBadge verdict={preview.verdict} />
              <p className="mt-1.5 text-xs text-muted-foreground">{preview.reasons.join(" ")}</p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid}>
              Queue for review
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
