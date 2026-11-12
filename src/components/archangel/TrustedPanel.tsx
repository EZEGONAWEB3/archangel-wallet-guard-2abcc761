import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Plus, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "./PageHeader";
import { SourceBadge } from "./badges";
import { useGuardian } from "@/lib/guardian/store";

export function TrustedPanel() {
  const { policy, addTrusted, removeTrusted, ready } = useGuardian();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const res = addTrusted(value);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setError(null);
    setValue("");
    toast.success(res.message);
  };

  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ShieldCheck className="size-4 text-primary" /> Trusted recipients
        </h2>
        <SourceBadge source="local" />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Payments to these accounts are allowed within your caps. Anyone else gets a warning.
      </p>
      <form onSubmit={submit} className="mt-4 flex gap-2">
        <Input
          aria-label="NEAR account ID to trust"
          placeholder="name.testnet"
          value={value}
          disabled={!ready}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          className="font-mono"
        />
        <Button type="submit" size="icon" variant="surface" aria-label="Add trusted recipient" disabled={!value.trim()}>
          <Plus />
        </Button>
      </form>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      <ul className="mt-4 space-y-1.5">
        {policy.trusted.length === 0 && (
          <li className="text-xs text-muted-foreground">No trusted recipients — every payment will be flagged.</li>
        )}
        {policy.trusted.map((t) => (
          <li
            key={t}
            className="group flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2"
          >
            <span className="truncate font-mono text-xs text-foreground" title={t}>
              {t}
            </span>
            <button
              type="button"
              onClick={() => removeTrusted(t)}
              aria-label={`Remove ${t}`}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
