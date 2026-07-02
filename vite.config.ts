import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Self-contained CSP injected into the production build only (the dev server needs
// eval/HMR, which the policy would block). Everything is first-party — no CDNs.
const CSP =
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline'; " +
  "style-src 'self' 'unsafe-inline'; " +
  "font-src 'self'; " +
  "img-src 'self' data:; " +
  "connect-src 'self';";

function injectCspOnBuild(): Plugin {
  return {
    name: "inject-csp-on-build",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace(
        "</title>",
        `</title>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}">`,
      );
    },
  };
}

// GitHub Pages serves a custom 404 for unknown paths. Copying the built index.html
// to 404.html lets client-side routes resolve to the SPA.
function spaFallback(): Plugin {
  return {
    name: "spa-404-fallback",
    closeBundle() {
      const dist = resolve(__dirname, "dist");
      const index = resolve(dist, "index.html");
      if (existsSync(index)) {
        copyFileSync(index, resolve(dist, "404.html"));
      }
    },
  };
}

export default defineConfig({
  base: "/",
  plugins: [react(), injectCspOnBuild(), spaFallback()],
});
