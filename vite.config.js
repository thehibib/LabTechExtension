import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist", // output folder Chrome will use
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup/index.html"), // popup entry point
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
});
