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

type Libs = typeof import("./near-wallet-libs");
let libsPromise: Promise<Libs> | undefined;

/** Load the single wallet bundle once, after installing the Node globals it reads at load. */
const loadLibs: () => Promise<Libs> = import.meta.env.SSR
  ? () => Promise.reject(new Error(SERVER_ERROR))
  : async () => {
      const g = globalThis as unknown as { global?: typeof globalThis; Buffer?: unknown };
      g.global ??= globalThis;
      if (!g.Buffer) g.Buffer = (await import("buffer")).Buffer;
      libsPromise ??= import("./near-wallet-libs");
      try {
        return await libsPromise;
      } catch (err) {
        libsPromise = undefined; // allow Retry after a network failure
        throw err;
      }
    };

export const loadWalletLibs: () => Promise<WalletLibs> = import.meta.env.SSR
  ? () => Promise.reject(new Error(SERVER_ERROR))
  : async () => {
      const libs = await loadLibs();
      return {
        setupWalletSelector: libs.setupWalletSelector,
        modules: [libs.setupMyNearWallet(), libs.setupMeteorWallet(), libs.setupIntearWallet()],
      };
    };

export const loadTransferAction: () => Promise<TransferAction> = import.meta.env.SSR
  ? () => Promise.reject(new Error(SERVER_ERROR))
  : async () => {
      const { actionCreators } = await loadLibs();
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
