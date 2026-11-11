import { Badge } from "@/components/ui/badge";
import type { RequestStatus, Verdict } from "@/lib/guardian/policy";
import { Ban, CircleCheck, Clock, TriangleAlert } from "lucide-react";

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  if (verdict === "allow")
    return (
      <Badge variant="allow" className="gap-1">
        <CircleCheck className="size-3" /> Policy: allow
      </Badge>
    );
  if (verdict === "warn")
    return (
      <Badge variant="warn" className="gap-1">
        <TriangleAlert className="size-3" /> Policy: warn
      </Badge>
    );
  return (
    <Badge variant="block" className="gap-1">
      <Ban className="size-3" /> Policy: block
    </Badge>
  );
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  const map = {
    pending: { v: "pending", label: "Awaiting review", Icon: Clock },
    approved: { v: "allow", label: "Approved (simulated)", Icon: CircleCheck },
    warned: { v: "warn", label: "Allowed w/ warning (simulated)", Icon: TriangleAlert },
    blocked: { v: "block", label: "Blocked", Icon: Ban },
  } as const;
  const { v, label, Icon } = map[status];
  return (
    <Badge variant={v} className="gap-1">
      <Icon className="size-3" /> {label}
    </Badge>
  );
}

/** Labels that say where a value comes from: demo data, this browser, or live NEAR testnet. */
export function SourceBadge({ source }: { source: "demo" | "local" | "live" }) {
  const label = source === "demo" ? "Demo · mock" : source === "local" ? "Local only" : "Live testnet";
  return <Badge variant={source}>{label}</Badge>;
}
