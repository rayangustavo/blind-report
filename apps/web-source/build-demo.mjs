// Build da DEMONSTRAÇÃO local (backend simulado), sem os pacotes de integração quebrados.
import { build } from "esbuild";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "demo-dist");
const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; " +
  "connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

await mkdir(outDir, { recursive: true });
await build({
  entryPoints: [join(here, "demo/main.ts")],
  alias: { "@blind-report/source-client": join(here, "demo/source-client-shim.ts") },
  bundle: true,
  format: "esm",
  target: "es2022",
  outfile: join(outDir, "app.js"),
  minify: true,
  sourcemap: false,
  legalComments: "none",
  logLevel: "info",
});
const html = (await readFile(join(here, "index.html"), "utf8")).replace("__CSP__", CSP);
await writeFile(join(outDir, "index.html"), html);
await copyFile(join(here, "style.css"), join(outDir, "style.css"));
console.log(`demo gerado em ${outDir}`);
