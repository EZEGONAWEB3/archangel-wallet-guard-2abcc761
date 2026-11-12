import { useState } from "react";
import { toast } from "sonner";
import { Inbox, Plus, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "./PageHeader";
import { SourceBadge } from "./badges";
import { RequestCard } from "./RequestCard";
import { NewRequestDialog } from "./NewRequestDialog";
import { useGuardian } from "@/lib/guardian/store";
import { cn } from "@/lib/utils";

export function RequestsPanel() {
  const { requests, simulateIncoming, ready } = useGuardian();
  const [tab, setTab] = useState<"pending" | "decided">("pending");
  const [open, setOpen] = useState(false);
  const pending = requests.filter((r) => r.status === "pending");
  const decided = requests.filter((r) => r.status !== "pending");
  const list = tab === "pending" ? pending : decided;

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Inbox className="size-4 text-primary" /> Agent payment requests
          </h2>
          <SourceBadge source="demo" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="surface"
            disabled={!ready}
            onClick={() => {
              simulateIncoming();
              setTab("pending");
              toast.info("A demo agent sent a new payment request");
            }}
          >
            <Radio /> Simulate incoming
          </Button>
          <Button size="sm" disabled={!ready} onClick={() => setOpen(true)}>
            <Plus /> New request
          </Button>
        </div>
      </div>

      <div className="mt-4 inline-flex rounded-lg border border-border bg-surface p-1" role="tablist">
        {(
          [
            ["pending", `Needs review (${pending.length})`],
            ["decided", `Decided (${decided.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {!ready && <p className="text-sm text-muted-foreground">Loading requests…</p>}
        {ready && list.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-foreground">
              {tab === "pending" ? "Queue clear — no payments waiting." : "No decisions yet."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Use “Simulate incoming” to have a demo agent ask for a payment.
            </p>
          </div>
        )}
        {list.map((r) => (
          <RequestCard key={r.id} req={r} />
        ))}
      </div>
      <NewRequestDialog open={open} onOpenChange={setOpen} />
    </Panel>
  );
}
