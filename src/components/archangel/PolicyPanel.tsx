import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "./PageHeader";
import { SourceBadge } from "./badges";
import { useGuardian } from "@/lib/guardian/store";
import { sanitizeCap } from "@/lib/guardian/policy";

export function PolicyPanel() {
  const { policy, updateCaps, ready } = useGuardian();
  const [perTx, setPerTx] = useState(String(policy.perTxCapNear));
  const [daily, setDaily] = useState(String(policy.dailyCapNear));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPerTx(String(policy.perTxCapNear));
    setDaily(String(policy.dailyCapNear));
  }, [policy.perTxCapNear, policy.dailyCapNear]);

  const dirty = perTx !== String(policy.perTxCapNear) || daily !== String(policy.dailyCapNear);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const p = sanitizeCap(Number(perTx));
    const d = sanitizeCap(Number(daily));
    if (p === null || d === null) {
      setError("Caps must be numbers greater than 0 NEAR.");
      return;
    }
    setError(null);
    updateCaps(p, d);
    toast.success("Spending caps saved", {
      description: "Stored in this browser only — not on-chain.",
    });
  };

  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <SlidersHorizontal className="size-4 text-primary" /> Spending caps
        </h2>
        <SourceBadge source="local" />
      </div>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cap-tx" className="text-xs text-muted-foreground">
              Per payment (NEAR)
            </Label>
            <Input
              id="cap-tx"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={perTx}
              disabled={!ready}
              onChange={(e) => setPerTx(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cap-daily" className="text-xs text-muted-foreground">
              Per day (NEAR)
            </Label>
            <Input
              id="cap-daily"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={daily}
              disabled={!ready}
              onChange={(e) => setDaily(e.target.value)}
              className="font-mono"
            />
          </div>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">
          Payments above either cap are blocked and can't be approved. These limits are checked in
          this app before your wallet is asked to sign — they are not enforced on-chain.
        </p>
        <Button type="submit" size="sm" disabled={!dirty || !ready}>
          Save caps
        </Button>
      </form>
    </Panel>
  );
}
