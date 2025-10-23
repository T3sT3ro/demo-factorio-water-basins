import { defineConfig } from "npm:vite@^5.0.0";

export default defineConfig({
  root: ".",
  server: {
    port: 8000,
    host: true,
    open: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    rollupOptions: {
      input: {
        main: "./index.html",
      },
    },
  },
  esbuild: {
    target: "es2022",
  },
  // Handle TypeScript files
  resolve: {
    extensions: [".ts", ".js", ".json"],
  },
});
