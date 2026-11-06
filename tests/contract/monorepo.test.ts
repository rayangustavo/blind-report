import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { scanText } from "../../guardrails/patterns.mjs";

type Manifest = {
  name?: string;
  private?: boolean;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  workspaces?: string[];
};

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Dependências de terceiros revisadas e permitidas no monorepo. */
const VETTED_THIRD_PARTY = new Set([
  "@arkiv-network/sdk",
  "@noble/hashes",
  "@vitest/coverage-v8",
  "@worldcoin/idkit-core",
  "esbuild",
  "fast-check",
  "libsodium-wrappers",
  "tsx",
  "typescript",
  "viem",
  "vitest",
]);

/** Pacotes de trabalho previstos no monorepo (podem ainda não existir nesta branch). */
const KNOWN_WORKSPACES = new Set([
  "@blind-report/core",
  "@blind-report/crypto",
  "@blind-report/network-policy",
  "@blind-report/ens-client",
  "@blind-report/arkiv-store",
  "@blind-report/worldid-gate",
  "@blind-report/source-client",
  "@blind-report/newsroom-client",
]);

/** Grafo exato de dependências de runtime dos pacotes da camada base. */
const EXPECTED_RUNTIME_DEPS: Record<string, string[]> = {
  "@blind-report/core": [],
  "@blind-report/crypto": ["@blind-report/core", "@noble/hashes", "libsodium-wrappers"],
  "@blind-report/network-policy": [],
  "@blind-report/ens-client": ["@blind-report/core", "viem"],
};

const SCREEN_FOLDERS = new Set(["web-source", "web-newsroom"]);
const BROWSER_AUTOMATION = /playwright|puppeteer|webdriver|selenium|cypress|testcafe|nightmare|chromedriver|geckodriver/i;

type Workspace = { folder: string; file: string; manifest: Manifest };

function workspaceManifests(): Workspace[] {
  const workspaces: Workspace[] = [];
  for (const group of ["packages", "apps"]) {
    const dir = join(ROOT, group);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const file = join(dir, entry.name, "package.json");
      if (!existsSync(file)) continue;
      workspaces.push({ folder: entry.name, file, manifest: JSON.parse(readFileSync(file, "utf8")) as Manifest });
    }
  }
  return workspaces;
}

function runtimeDeps(manifest: Manifest): string[] {
  return [
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
    ...Object.keys(manifest.optionalDependencies ?? {}),
  ].sort();
}

const rootFile = join(ROOT, "package.json");
const rootManifest = JSON.parse(readFileSync(rootFile, "utf8")) as Manifest;
const workspaces = workspaceManifests();
const workspaceNames = new Set(workspaces.map(({ manifest }) => manifest.name));

describe("monorepo contract", () => {
  it("declares every workspace with a Blind Report package name", () => {
    expect(workspaces.length).toBeGreaterThan(0);
    expect(rootManifest.workspaces).toEqual(expect.arrayContaining(["packages/*", "apps/*"]));
    for (const { folder, file, manifest } of workspaces) {
      expect(manifest.name, file).toBe(`@blind-report/${folder}`);
      expect(manifest.private, file).toBe(true);
    }
  });

  it("contains no anonymity network dependency or configuration", () => {
    const files = [rootFile, ...workspaces.map(({ file }) => file)];
    for (const file of files) {
      expect(scanText(readFileSync(file, "utf8")), file).toEqual([]);
    }
  });

  it("keeps runtime dependencies inside the reviewed graph", () => {
    for (const { folder, manifest } of workspaces) {
      const deps = runtimeDeps(manifest);
      for (const dep of deps) {
        if (dep.startsWith("@blind-report/")) {
          expect(
            workspaceNames.has(dep) || KNOWN_WORKSPACES.has(dep),
            `${folder} depends on unknown workspace ${dep}`,
          ).toBe(true);
        } else {
          expect(VETTED_THIRD_PARTY.has(dep), `${folder} depends on unvetted package ${dep}`).toBe(true);
        }
      }

      const expected = EXPECTED_RUNTIME_DEPS[manifest.name ?? ""];
      if (expected) expect(deps, `${folder} runtime dependencies`).toEqual([...expected].sort());
    }
  });

  it("keeps development dependencies vetted as well", () => {
    for (const { folder, manifest } of workspaces) {
      const devDeps = Object.keys(manifest.devDependencies ?? {});
      for (const dep of devDeps) {
        const allowed = dep.startsWith("@types/") || VETTED_THIRD_PARTY.has(dep) || dep.startsWith("@blind-report/");
        expect(allowed, `${folder} has unvetted devDependency ${dep}`).toBe(true);
      }
    }
  });

  it("lets screens depend only on the client SDKs", () => {
    for (const { folder, manifest } of workspaces) {
      if (!SCREEN_FOLDERS.has(folder)) continue;
      for (const dep of runtimeDeps(manifest).filter((name) => name.startsWith("@blind-report/"))) {
        expect(dep.endsWith("-client"), `${folder} must not depend on ${dep}`).toBe(true);
      }
    }
  });

  it("requires no automated browser in scripts or dependencies", () => {
    const files = [rootFile, ...workspaces.map(({ file }) => file)];
    for (const file of files) {
      const manifest = JSON.parse(readFileSync(file, "utf8")) as Manifest;
      for (const [name, command] of Object.entries(manifest.scripts ?? {})) {
        expect(command, `${file}:${name} launches a browser`).not.toMatch(BROWSER_AUTOMATION);
      }
      const deps = [
        ...Object.keys(manifest.dependencies ?? {}),
        ...Object.keys(manifest.devDependencies ?? {}),
        ...Object.keys(manifest.peerDependencies ?? {}),
        ...Object.keys(manifest.optionalDependencies ?? {}),
      ];
      for (const dep of deps) expect(dep, `${file} requires ${dep}`).not.toMatch(BROWSER_AUTOMATION);
    }
  });
});
