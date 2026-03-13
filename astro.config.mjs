import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://begindevs.com",
  output: "static",
  vite: {
    plugins: [tailwindcss()],
  },
});
