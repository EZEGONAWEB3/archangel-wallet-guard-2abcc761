import { formatNear } from "@/lib/guardian/near";
import { cn } from "@/lib/utils";

export function SpendMeter({ spent, cap }: { spent: number; cap: number }) {
  const pct = cap > 0 ? Math.min(100, (spent / cap) * 100) : 0;
  const tone = pct >= 90 ? "bg-destructive" : pct >= 65 ? "bg-warning" : "bg-gradient-primary";
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-2xl font-semibold text-foreground">
          {formatNear(spent)}
        </span>
        <span className="text-xs text-muted-foreground">of {formatNear(cap)} daily cap</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Daily spending used"
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500", tone)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {formatNear(Math.max(0, cap - spent))} left today · {Math.round(pct)}% used
      </p>
    </div>
  );
}
