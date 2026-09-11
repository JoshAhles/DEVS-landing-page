import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import partytown from "@astrojs/partytown";

export default defineConfig({
  site: "https://begindevs.com",
  output: "static",
  build: { inlineStylesheets: "always" },
  integrations: [
    sitemap({ filter: (page) => !page.includes("/og") }),
    partytown({ config: { forward: ["dataLayer.push", "gtag"] } }),
  ],
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/three")) return "three";
          },
        },
      },
    },
  },
});
