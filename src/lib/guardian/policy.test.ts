import { describe, expect, it } from "vitest";
import {
  allowedDecisions,
  evaluatePayment,
  spentToday,
  type PaymentRequest,
  type Policy,
} from "./policy";
import { isValidAccountId, nearToYocto, yoctoToNear } from "./near";

const policy: Policy = { perTxCapNear: 5, dailyCapNear: 20, trusted: ["data-feeds.testnet"] };

describe("policy engine", () => {
  it("blocks a payment above the per-transaction cap", () => {
    const r = evaluatePayment({ recipient: "data-feeds.testnet", amountNear: 5.01 }, policy, 0);
    expect(r.verdict).toBe("block");
  });

  it("blocks a payment that would exceed the daily cap", () => {
    const r = evaluatePayment({ recipient: "data-feeds.testnet", amountNear: 4 }, policy, 17);
    expect(r.verdict).toBe("block");
  });

  it("allows a trusted recipient exactly at both caps", () => {
    const r = evaluatePayment({ recipient: "data-feeds.testnet", amountNear: 5 }, policy, 15);
    expect(r.verdict).toBe("allow");
  });

  it("warns on an unknown recipient within limits", () => {
    const r = evaluatePayment({ recipient: "stranger.testnet", amountNear: 1 }, policy, 0);
    expect(r.verdict).toBe("warn");
  });

  it("blocks an unknown recipient above caps (block beats warn)", () => {
    const r = evaluatePayment({ recipient: "stranger.testnet", amountNear: 9 }, policy, 0);
    expect(r.verdict).toBe("block");
  });

  it("blocks invalid account IDs and non-positive amounts", () => {
    expect(evaluatePayment({ recipient: "Bad..ID", amountNear: 1 }, policy, 0).verdict).toBe("block");
    expect(evaluatePayment({ recipient: "data-feeds.testnet", amountNear: 0 }, policy, 0).verdict).toBe(
      "block",
    );
  });

  it("does not let the user approve a blocked payment", () => {
    expect(allowedDecisions("block")).toEqual(["block"]);
    expect(allowedDecisions("warn")).toContain("approve");
  });

  it("counts only approved and warned payments decided today toward spend", () => {
    const now = new Date(2026, 10, 11, 12).getTime();
    const yesterday = now - 24 * 3600_000;
    const base = { agent: "a", recipient: "x.testnet", purpose: "p", createdAt: now };
    const reqs: PaymentRequest[] = [
      { ...base, id: "1", amountNear: 2, status: "approved", decidedAt: now },
      { ...base, id: "2", amountNear: 3, status: "warned", decidedAt: now },
      { ...base, id: "3", amountNear: 7, status: "blocked", decidedAt: now },
      { ...base, id: "4", amountNear: 4, status: "approved", decidedAt: yesterday },
      { ...base, id: "5", amountNear: 1, status: "pending" },
    ];
    expect(spentToday(reqs, now)).toBe(5);
  });
});

describe("near helpers", () => {
  it("validates account IDs", () => {
    expect(isValidAccountId("alice.testnet")).toBe(true);
    expect(isValidAccountId("a")).toBe(false);
    expect(isValidAccountId("Alice.testnet")).toBe(false);
    expect(isValidAccountId("alice..testnet")).toBe(false);
  });

  it("converts NEAR to yocto without float drift", () => {
    expect(nearToYocto(1.2)).toBe("1200000000000000000000000");
    expect(nearToYocto("0.25")).toBe("250000000000000000000000");
    expect(yoctoToNear("875826169599589518560305522944", 2)).toBe("875,826.16");
  });
});
