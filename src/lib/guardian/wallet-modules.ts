/**
 * Browser-only loader for the NEAR wallet libraries.
 *
 * The `import.meta.env.SSR` ternary is replaced with a constant at build time, so the server
 * bundle never contains these imports. That matters: the wallet selector's sha256 dependency
 * calls `eval()` at load time, which the Cloudflare Worker forbids, and the bundler would
 * otherwise share its chunk with router code and crash every server-rendered page.
 */
import type { WalletModuleFactory } from "@near-wallet-selector/core";

type WalletLibs = {
  setupWalletSelector: typeof import("@near-wallet-selector/core").setupWalletSelector;
  modules: WalletModuleFactory[];
};
type TransferAction = typeof import("@near-js/transactions").actionCreators.transfer;

const SERVER_ERROR = "NEAR wallet libraries only load in the browser.";

export const loadWalletLibs: () => Promise<WalletLibs> = import.meta.env.SSR
  ? () => Promise.reject(new Error(SERVER_ERROR))
  : async () => {
      // Wallet modules read Node's `global` and `Buffer` at load time; set them first.
      const g = globalThis as unknown as { global?: typeof globalThis; Buffer?: unknown };
      g.global ??= globalThis;
      const { Buffer } = await import("buffer");
      g.Buffer ??= Buffer;

      const [core, mnw, meteor, intear] = await Promise.all([
        import("@near-wallet-selector/core"),
        import("@near-wallet-selector/my-near-wallet"),
        import("@near-wallet-selector/meteor-wallet"),
        import("@near-wallet-selector/intear-wallet"),
      ]);
      return {
        setupWalletSelector: core.setupWalletSelector,
        modules: [mnw.setupMyNearWallet(), meteor.setupMeteorWallet(), intear.setupIntearWallet()],
      };
    };

export const loadTransferAction: () => Promise<TransferAction> = import.meta.env.SSR
  ? () => Promise.reject(new Error(SERVER_ERROR))
  : async () => {
      const { actionCreators } = await import("@near-js/transactions");
      return actionCreators.transfer;
    };

/** Reject if `promise` takes longer than `ms`, so a stalled wallet service can't hang the UI. */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}
