import { defineConfig } from "vite";
import { resolve } from "node:path";

// Multi-page build: plain HTML/CSS/JS, no framework — every page is a
// real static file, listed here so Vite's build includes all four.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        admin: resolve(__dirname, "admin.html"),
        adminLogin: resolve(__dirname, "admin-login.html"),
        generate: resolve(__dirname, "generate.html")
      }
    }
  }
});
