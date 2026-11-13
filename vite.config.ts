// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { createRequire } from "node:module";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

/**
 * NEAR wallet deps call `require("buffer")`. In the production browser build Vite swaps that
 * Node built-in for an empty stub, so `Buffer.from` is undefined and wallets never load.
 * Resolve it to the installed `buffer` npm polyfill instead (browser build only).
 */
function browserBufferPolyfill(): Plugin {
  const bufferPath = createRequire(import.meta.url).resolve("buffer/");
  return {
    name: "archangel:browser-buffer-polyfill",
    enforce: "pre",
    // applyToEnvironment: (env) => env.name === "client",
    resolveId(id, importer) {
      if (/buffer/.test(id)) console.log("[bufdbg]", this.environment?.name, id, importer?.slice(-60));
      return id === "buffer" || id === "buffer/" ? bufferPath : null;
    },
  };
}

export default defineConfig({
  plugins: [browserBufferPolyfill()],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
