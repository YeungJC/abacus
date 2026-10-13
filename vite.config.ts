import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// One self-contained HTML file, so the build can be published as a claude.ai artifact.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: { chunkSizeWarningLimit: 2000 },
});
