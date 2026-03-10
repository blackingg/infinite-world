import glsl from "vite-plugin-glsl";
import { defineConfig } from "vite";
import path from "path";

const dirname = path.resolve();

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./sources/Game"),
    },
  },
  plugins: [glsl({ watch: true })],
  server: {
    host: true,
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["three"],
          utils: [
            "gl-matrix",
            "lil-gui",
            "simplex-noise",
            "seedrandom",
            "stats.js",
            "events",
          ],
        },
      },
    },
  },
});
