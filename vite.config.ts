// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    environments: {
      client: {
        build: {
          rolldownOptions: {
            output: {
              // Keep the NEAR wallet/SDK packages in one browser chunk. Split automatically, their
              // chunks import each other in a cycle and a base class is undefined at load time
              // ("Class extends value undefined"), so wallet options never appear in production.
              codeSplitting: {
                groups: [
                  {
                    name: "near-wallet",
                    // Don't drag shared helpers (tslib etc.) in, or the page would load this chunk
                    // up front, before the Buffer polyfill is in place.
                    includeDependenciesRecursively: false,
                    test: /node_modules[\\/](@near-wallet-selector|@near-js|@meteorwallet|near-api-js|borsh)[\\/]/,
                  },
                ],
              },
            },
          },
        },
      },
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
