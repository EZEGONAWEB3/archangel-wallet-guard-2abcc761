// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
import { createRequire } from "node:module";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

/**
 * NEAR wallet-selector dependencies use Node's buffer and events modules.
 * Resolve both to their browser-compatible npm shims in the client build;
 * otherwise production bundlers can replace Node built-ins with empty stubs.
 */
function browserWalletPolyfills(): Plugin {
  const require = createRequire(import.meta.url);
  const bufferPath = require.resolve("buffer/");
  const eventsPath = require.resolve("events/");
  return {
    name: "archangel:browser-wallet-polyfills",
    enforce: "pre",
    applyToEnvironment: (env) => env.name === "client",
    resolveId(id) {
      if (id === "buffer" || id === "node:buffer" || id === "buffer/") return bufferPath;
      if (id === "events" || id === "node:events" || id === "events/") return eventsPath;
      return null;
    },
  };
}

export default defineConfig({
  plugins: [browserWalletPolyfills()],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
  },
});
