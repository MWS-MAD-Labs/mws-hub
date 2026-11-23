import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { NAVIGATION_DENYLIST, NETWORK_ONLY_PREFIXES } from "./pwa-routes";

// The Hub backend. One place, so the proxy cannot point at another app.
const API_TARGET = process.env.VITE_API_PROXY_TARGET || "http://localhost:4001";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      filename: "hub-sw.js",
      devOptions: {
        enabled: true,
        type: "module",
        navigateFallback: "index.html",
      },
      manifest: {
        // Stable app identity: without it Chrome derives the id from
        // start_url, so changing start_url would register a different app.
        id: "/",
        name: "MWS Hub | App Launcher",
        short_name: "MWS Hub",
        description: "Millennia World School app launcher and support hub.",
        start_url: "/support-hub",
        scope: "/",
        display: "standalone",
        orientation: "portrait-primary",
        theme_color: "#fcfafb",
        background_color: "#fcfafb",
        categories: ["education", "productivity"],
        icons: [
          {
            src: "/mws-hub-v2-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/mws-hub-v2-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/mws-hub-v2-maskable-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/mws-hub-v2-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
        globIgnores: ["**/env.js"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: NAVIGATION_DENYLIST,
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              NETWORK_ONLY_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)),
            handler: "NetworkOnly",
            method: "GET",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5175,
    // A taken port stops the start. Moving to another port would put the Hub where another app is expected.
    strictPort: true,
    cors: false,
    proxy: {
      "/auth": { target: API_TARGET, changeOrigin: true },
      "/apps": { target: API_TARGET, changeOrigin: true },
      "/sso": { target: API_TARGET, changeOrigin: true },
      "/api": { target: API_TARGET, changeOrigin: true },
      "/admin/dashboard-data": { target: API_TARGET, changeOrigin: true },
      "/admin/api": { target: API_TARGET, changeOrigin: true },
      "/.well-known": { target: API_TARGET, changeOrigin: true },
    },
  },
});
