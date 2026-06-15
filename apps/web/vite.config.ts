import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Alias the engine to its TypeScript source so Vite transforms it as project code
// (rather than trying to pre-bundle a workspace package). Vite resolves the engine's
// internal ".js" imports to their ".ts" files.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@ff/engine": fileURLToPath(new URL("../../packages/engine/src/index.ts", import.meta.url)),
    },
  },
  server: {
    host: true, // expose on LAN so the host phone can reach the display during dev
  },
});
