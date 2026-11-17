// Build: src/js/*.js → assets/js/app.min.js, src/scss → assets/css/style.css
// Usage: npm run build
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";

// Chapters + notes: assets/data/chapters.json, sample PDFs, and the PDF reader (see tools/notes.cjs)
execSync("node tools/notes.cjs", { stdio: "inherit" });

// Libraries are served from this site (no CDN): if a CDN is blocked or down, the site still works.
// Versions are pinned in package.json.
for (const [from, to] of [
  ["node_modules/three/build/three.module.min.js", "assets/vendor/three/three.module.min.js"],
  ["node_modules/gsap/dist/gsap.min.js", "assets/vendor/gsap/gsap.min.js"],
  ["node_modules/gsap/dist/ScrollTrigger.min.js", "assets/vendor/gsap/ScrollTrigger.min.js"],
  ["node_modules/lenis/dist/lenis.min.js", "assets/vendor/lenis/lenis.min.js"],
]) {
  mkdirSync(to.slice(0, to.lastIndexOf("/")), { recursive: true });
  writeFileSync(to, readFileSync(from));
}

mkdirSync("assets/js", { recursive: true });
mkdirSync("assets/css", { recursive: true });

// JS: the parts share one scope, so they're joined in filename order inside a single async wrapper
const parts = readdirSync("src/js").filter((f) => f.endsWith(".js")).sort();
const joined = "(async () => {\n" + parts.map((f) => `// ── ${f}\n` + readFileSync(`src/js/${f}`, "utf8")).join("\n") + "})();\n";
const min = execSync("npx --yes esbuild@0.24.0 --minify --target=es2020 --loader=js --legal-comments=none", { input: joined, maxBuffer: 1 << 26 });
writeFileSync("assets/js/app.min.js", min);
console.log(`js   ${parts.length} parts → assets/js/app.min.js (${(joined.length / 1024).toFixed(0)} KB → ${(min.length / 1024).toFixed(0)} KB)`);

// CSS
execSync("npx --yes sass@1.99.0 src/scss/style.scss assets/css/style.css --style=compressed --no-source-map", { stdio: "inherit" });
console.log(`css  → assets/css/style.css (${(readFileSync("assets/css/style.css").length / 1024).toFixed(0)} KB)`);
