import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "public/index.html",
  "public/styles.css",
  "public/app.js",
  "public/_headers",
  "public/assets/london-map.webp",
  "wrangler.jsonc"
];

await Promise.all(required.map((path) => access(resolve(root, path))));

const html = await readFile(resolve(root, "public/index.html"), "utf8");
const css = await readFile(resolve(root, "public/styles.css"), "utf8");
const headers = await readFile(resolve(root, "public/_headers"), "utf8");
const wrangler = JSON.parse(await readFile(resolve(root, "wrangler.jsonc"), "utf8"));
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));

const assertions = [
  [html.includes("Phase 0 prototype"), "sample-data warning is present"],
  [html.includes('./styles.css'), "stylesheet reference is present"],
  [html.includes('./app.js'), "script reference is present"],
  [css.includes('./assets/london-map.webp'), "map asset reference is present"],
  [headers.includes("frame-ancestors") && headers.includes("https://sites.google.com"), "Google Sites frame policy is present"],
  [!headers.includes("X-Frame-Options"), "obsolete X-Frame-Options is absent"],
  [wrangler.name === "london-now", "Wrangler name matches the Cloudflare Worker"],
  [wrangler.workers_dev === true, "workers.dev route is explicit"],
  [wrangler.preview_urls === true, "preview URLs are explicit"],
  [packageJson.devDependencies?.wrangler === "4.129.0", "Wrangler version is pinned"]
];

const failures = assertions.filter(([passed]) => !passed);
if (failures.length) {
  failures.forEach(([, label]) => console.error(`FAIL: ${label}`));
  process.exit(1);
}

assertions.forEach(([, label]) => console.log(`PASS: ${label}`));
console.log("Phase 0 package validation passed.");
