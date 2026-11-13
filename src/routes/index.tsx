import { useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Ban, CircleCheck, Clock, FlaskConical, RotateCcw, ShieldAlert } from "lucide-react";
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
import { ShieldMark } from "@/components/archangel/ShieldMark";
import { Panel } from "@/components/archangel/PageHeader";
import { SpendMeter } from "@/components/archangel/SpendMeter";
import { SourceBadge } from "@/components/archangel/badges";
import { WalletDialog, WalletPanel } from "@/components/archangel/WalletPanel";
import { RequestsPanel } from "@/components/archangel/RequestsPanel";
import { PolicyPanel } from "@/components/archangel/PolicyPanel";
import { TrustedPanel } from "@/components/archangel/TrustedPanel";
import { ActivityLog } from "@/components/archangel/ActivityLog";
import { useGuardian } from "@/lib/guardian/store";
import { useWallet } from "@/lib/guardian/wallet";
import { shortAccount } from "@/lib/guardian/near";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ArchAngel Dashboard — Guard your AI agent's NEAR payments" },
      {
        name: "description",
        content:
          "Review AI-agent payment requests, set spending caps and trusted recipients, and connect a NEAR testnet wallet.",
      },
      { property: "og:title", content: "ArchAngel Dashboard — Your AI. Your Wallet. Your Rules." },
      {
        property: "og:description",
        content: "Approve, warn on, or block AI-agent payments before your NEAR wallet signs anything.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
        <Intro />
        <SimulationNotice />
        <Overview />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RequestsPanel />
          </div>
          <div className="space-y-6">
            <PolicyPanel />
            <TrustedPanel />
          </div>
        </div>
        <ActivityLog />
      </main>
      <Footer />
    </div>
  );
}

function TopBar() {
  const { status, accountId } = useWallet();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <ShieldMark className="size-9 shrink-0" />
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold leading-none text-foreground">ArchAngel</p>
            <p className="mt-1 hidden truncate text-[11px] text-muted-foreground sm:block">
              Your AI. Your Wallet. Your Rules.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-mono text-[11px] text-muted-foreground md:inline-flex">
            <span className="size-1.5 rounded-full bg-primary animate-pulse-ring" /> NEAR testnet
          </span>
          {status === "connected" && accountId ? (
            <span
              className="inline-flex max-w-[11rem] items-center gap-1.5 rounded-md border border-success/40 bg-success/10 px-2.5 py-1.5 font-mono text-xs text-success"
              title={accountId}
            >
              <span className="size-1.5 shrink-0 rounded-full bg-success" />
              <span className="truncate">{shortAccount(accountId, 18)}</span>
            </span>
          ) : (
            <Button
              size="sm"
              variant="hero"
              onClick={() => setOpen(true)}
              disabled={status === "loading" || status === "unavailable" || status === "connecting"}
            >
              {status === "connecting" ? "Connecting…" : "Connect wallet"}
            </Button>
          )}
        </div>
      </div>
      <WalletDialog open={open} onOpenChange={setOpen} />
    </header>
  );
}

function Intro() {
  const { resetDemo, ready } = useGuardian();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1.5">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Guardian console</p>
        <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
          Every agent payment, <span className="text-gradient-primary">checked before you sign</span>
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Your AI agents ask; ArchAngel checks each request against your caps and trusted list; you decide.
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="self-start md:self-auto"
        disabled={!ready}
        onClick={() => setConfirm(true)}
      >
        <RotateCcw /> Reset demo
      </Button>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="border-border bg-popover">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset the demo?</AlertDialogTitle>
            <AlertDialogDescription>
              Restores the sample requests, default caps and trusted list, and clears the log in this browser.
              Your wallet stays connected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resetDemo();
                toast.success("Demo reset");
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SimulationNotice() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
      <FlaskConical className="mt-0.5 size-5 shrink-0 text-warning" />
      <div className="space-y-1 text-sm">
        <p className="font-medium text-foreground">Demo mode — decisions are simulated</p>
        <p className="text-muted-foreground">
          Agent requests are sample data, and Approve / Warn / Block only change this browser's records. Your caps
          and trusted list are checked here in the app, not enforced on-chain. Funds move only if you choose
          “Send on testnet” and sign in your own wallet.
        </p>
      </div>
    </div>
  );
}

function Overview() {
  const { requests, policy, spentToday, ready } = useGuardian();
  const pending = requests.filter((r) => r.status === "pending").length;
  const allowed = requests.filter((r) => r.status === "approved" || r.status === "warned").length;
  const blocked = requests.filter((r) => r.status === "blocked").length;

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      <WalletPanel />
      <Panel className="p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Spent today</h2>
          <SourceBadge source="demo" />
        </div>
        <div className="mt-4">
          <SpendMeter spent={ready ? spentToday : 0} cap={policy.dailyCapNear} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Sum of payments you approved or allowed today (simulated). Per-payment cap:{" "}
          <span className="font-mono text-foreground">{policy.perTxCapNear} NEAR</span>.
        </p>
      </Panel>
      <Panel className="p-5 md:col-span-2 xl:col-span-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldAlert className="size-4 text-primary" /> Guardian status
          </h2>
          <SourceBadge source="demo" />
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-3">
          <Stat icon={<Clock className="size-4" />} label="Needs review" value={pending} tone="text-primary" />
          <Stat icon={<CircleCheck className="size-4" />} label="Allowed" value={allowed} tone="text-success" />
          <Stat icon={<Ban className="size-4" />} label="Blocked" value={blocked} tone="text-destructive" />
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          {policy.trusted.length} trusted recipient{policy.trusted.length === 1 ? "" : "s"} · rules: block over caps,
          allow trusted, warn on unknown.
        </p>
      </Panel>
    </div>
  );
}

function Stat({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <dt className={`flex items-center gap-1.5 text-[11px] ${tone}`}>
        {icon}
        <span className="text-muted-foreground">{label}</span>
      </dt>
      <dd className="mt-1 font-mono text-2xl font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-center gap-2">
          <ShieldMark className="size-5" /> ArchAngel · NEAR hackathon MVP
        </p>
        <p>Never share your seed phrase. ArchAngel will never ask for it.</p>
      </div>
    </footer>
  );
}
