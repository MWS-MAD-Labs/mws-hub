import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5175,
    // Dev proxies the same prefixes nginx proxies in production, so both
    // run on one origin. Without this the session cookie (SameSite=Strict)
    // would behave differently here than in production - exactly the class
    // of bug that only shows up after deploy.
    proxy: {
      "/auth": { target: "http://localhost:4001", changeOrigin: true },
      "/apps": { target: "http://localhost:4001", changeOrigin: true },
      "/.well-known": { target: "http://localhost:4001", changeOrigin: true },
    },
  },
});
