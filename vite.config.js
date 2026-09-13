import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Multi-page build: mostly plain HTML/CSS/JS, with one React island
// (src/supporters/) mounted into admin.html's Supporters tab — see that
// folder's README for why just that one page. The React plugin only
// affects files under src/; every other page is untouched by it.
export default defineConfig({
  plugins: [react()],
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
