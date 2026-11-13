import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Ban, CircleCheck, Info, ScrollText, TriangleAlert } from "lucide-react";
import { Panel } from "./PageHeader";
import { SourceBadge } from "./badges";
import { useGuardian, type LogEntry, type LogKind } from "@/lib/guardian/store";
import { cn } from "@/lib/utils";

const FILTERS: { id: "all" | LogKind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "decision", label: "Decisions" },
  { id: "request", label: "Requests" },
  { id: "policy", label: "Policy" },
  { id: "trusted", label: "Trusted" },
  { id: "wallet", label: "Wallet" },
  { id: "chain", label: "Testnet" },
];

export function ActivityLog() {
  const { log, ready } = useGuardian();
  const [filter, setFilter] = useState<"all" | LogKind>("all");
  const shown = useMemo(
    () => (filter === "all" ? log : log.filter((l) => l.kind === filter)),
    [log, filter],
  );

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ScrollText className="size-4 text-primary" /> Security activity log
          <span className="font-mono text-xs font-normal text-muted-foreground">
            ({log.length})
          </span>
        </h2>
        <SourceBadge source="local" />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Filter log">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors",
              filter === f.id
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <ol className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
        {!ready && <li className="text-sm text-muted-foreground">Loading log…</li>}
        {ready && shown.length === 0 && (
          <li className="text-sm text-muted-foreground">Nothing logged here yet.</li>
        )}
        {shown.map((entry) => (
          <LogRow key={entry.id} entry={entry} />
        ))}
      </ol>
    </Panel>
  );
}

function LogRow({ entry }: { entry: LogEntry }) {
  const tone = {
    allow: { Icon: CircleCheck, cls: "text-success bg-success/10" },
    warn: { Icon: TriangleAlert, cls: "text-warning bg-warning/10" },
    block: { Icon: Ban, cls: "text-destructive bg-destructive/10" },
    info: { Icon: Info, cls: "text-primary bg-primary/10" },
  }[entry.tone];
  return (
    <li className="flex gap-3 rounded-lg border border-border bg-surface p-3 animate-rise">
      <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-md", tone.cls)}>
        <tone.Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className="break-words text-sm font-medium text-foreground">{entry.title}</p>
          <time
            dateTime={new Date(entry.at).toISOString()}
            className="shrink-0 font-mono text-[11px] text-muted-foreground"
          >
            {format(entry.at, "MMM d · HH:mm:ss")}
          </time>
        </div>
        <p className="mt-0.5 break-words text-xs text-muted-foreground">{entry.detail}</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
          {entry.kind}
        </p>
      </div>
    </li>
  );
}
