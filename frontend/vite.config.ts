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
      // Not sw.js: Cloudflare kept an old copy of /sw.js for hours. A new name is always fetched from the server.
      filename: "hub-sw.js",
      // The plugin disables its service worker during `vite dev` by default.
      // Enable it so localhost can satisfy Chrome's PWA installability checks
      // and emit `beforeinstallprompt` for the custom Install App button.
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
        theme_color: "#f8fafc",
        background_color: "#f8fafc",
        categories: ["education", "productivity"],
        // "any" and "maskable" are separate files on purpose: the rounded
        // "any" icon gets cropped badly when a launcher applies its own mask,
        // so the maskable ones are full-bleed with the logo inside the 80%
        // safe zone. PNGs cover launchers that don't render SVG icons.
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/pwa-maskable-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/pwa-maskable-512x512.png",
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
    // Dev proxies the same prefixes nginx proxies in production, so both
    // run on one origin. Without this the session cookie (SameSite=Strict)
    // would behave differently here than in production - exactly the class
    // of bug that only shows up after deploy.
    proxy: {
      "/auth": { target: API_TARGET, changeOrigin: true },
      "/apps": { target: API_TARGET, changeOrigin: true },
      "/sso": { target: API_TARGET, changeOrigin: true },
      "/admin/dashboard-data": { target: API_TARGET, changeOrigin: true },
      "/admin/api": { target: API_TARGET, changeOrigin: true },
      "/.well-known": { target: API_TARGET, changeOrigin: true },
    },
  },
});
