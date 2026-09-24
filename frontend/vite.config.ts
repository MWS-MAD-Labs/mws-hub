import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
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
        theme_color: "#101827",
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
        navigateFallbackDenylist: [
          /^\/auth/,
          /^\/apps/,
          /^\/admin\/dashboard-data$/,
          /^\/admin\/api/,
          /^\/\.well-known/,
          /^\/env\.js$/,
        ],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              [
                "/auth",
                "/apps",
                "/admin/dashboard-data",
                "/admin/api",
                "/.well-known",
                "/env.js",
              ].some((prefix) => url.pathname.startsWith(prefix)),
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
    // Dev proxies the same prefixes nginx proxies in production, so both
    // run on one origin. Without this the session cookie (SameSite=Strict)
    // would behave differently here than in production - exactly the class
    // of bug that only shows up after deploy.
    proxy: {
      "/auth": { target: "http://localhost:4001", changeOrigin: true },
      "/apps": { target: "http://localhost:4001", changeOrigin: true },
      "/admin/dashboard-data": { target: "http://localhost:4001", changeOrigin: true },
      "/admin/api": { target: "http://localhost:4001", changeOrigin: true },
      "/.well-known": { target: "http://localhost:4001", changeOrigin: true },
    },
  },
});
