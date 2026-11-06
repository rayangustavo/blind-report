import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { scanText } from "../../guardrails/patterns.mjs";

const ROOT = resolve(import.meta.dirname, "../..");

type Pkg = { name?: string; dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

function workspacePackages(root: string): { dir: string; pkg: Pkg }[] {
  const out: { dir: string; pkg: Pkg }[] = [];
  for (const group of ["packages", "apps"]) {
    const base = join(root, group);
    if (!existsSync(base)) continue;
    for (const name of readdirSync(base)) {
      const file = join(base, name, "package.json");
      if (existsSync(file)) out.push({ dir: `${group}/${name}`, pkg: JSON.parse(readFileSync(file, "utf8")) as Pkg });
    }
  }
  return out;
}

/** Nomes de dependências (de todos os package.json) que o guardrail reconhece como rede de anonimato. */
function forbiddenDependencies(root: string): string[] {
  const files = [join(root, "package.json"), ...workspacePackages(root).map((p) => join(root, p.dir, "package.json"))];
  const hits: string[] = [];
  for (const file of files) {
    const pkg = JSON.parse(readFileSync(file, "utf8")) as Pkg;
    const names = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];
    for (const n of names) if (scanText(n).length > 0) hits.push(`${file}: ${n}`);
  }
  return hits;
}

describe("RNF-05 guardrail de dependências", () => {
  it("nenhum_package_json_do_monorepo_tem_pacote_de_rede_de_anonimato", () => {
    expect(forbiddenDependencies(ROOT)).toEqual([]);
  });

  it("detecta_um_pacote_proibido_quando_ele_aparece", () => {
    const dir = mkdtempSync(join(tmpdir(), "sw-"));
    mkdirSync(join(dir, "packages/x"), { recursive: true });
    // O nome é montado em partes para o próprio teste não disparar o guardrail do repositório.
    const forbidden = "to" + "r-js";
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "r" }));
    writeFileSync(join(dir, "packages/x/package.json"), JSON.stringify({ name: "x", dependencies: { [forbidden]: "1.0.0" } }));
    expect(forbiddenDependencies(dir)).toHaveLength(1);
  });
});

describe("regras de dependência entre pacotes", () => {
  // Quem pode depender de quem (docs/03-componentes.md §3). Nenhuma seta volta.
  const allowed: Record<string, string[]> = {
    "@blind-report/core": [],
    "@blind-report/crypto": ["@blind-report/core"],
    "@blind-report/network-policy": ["@blind-report/core"],
    "@blind-report/ens-client": ["@blind-report/core", "@blind-report/network-policy"],
    "@blind-report/arkiv-store": ["@blind-report/core", "@blind-report/network-policy"],
    "@blind-report/worldid-gate": ["@blind-report/core", "@blind-report/network-policy"],
    "@blind-report/source-client": ["@blind-report/core", "@blind-report/crypto", "@blind-report/ens-client", "@blind-report/network-policy"],
    "@blind-report/newsroom-client": ["@blind-report/core", "@blind-report/crypto", "@blind-report/ens-client", "@blind-report/arkiv-store", "@blind-report/network-policy"],
    "@blind-report/relayer": ["@blind-report/core", "@blind-report/crypto", "@blind-report/ens-client", "@blind-report/arkiv-store", "@blind-report/worldid-gate", "@blind-report/network-policy"],
    // A tela é a raiz de composição: liga ENS e Arkiv reais ao cliente; a lógica fica no source-client.
    "@blind-report/web-source": ["@blind-report/source-client", "@blind-report/core", "@blind-report/ens-client", "@blind-report/arkiv-store", "@blind-report/network-policy"],
    "@blind-report/web-newsroom": ["@blind-report/newsroom-client", "@blind-report/core", "@blind-report/ens-client", "@blind-report/arkiv-store", "@blind-report/network-policy"],
  };

  it("cada_pacote_so_depende_do_que_a_regra_permite", () => {
    for (const { dir, pkg } of workspacePackages(ROOT)) {
      const name = pkg.name ?? dir;
      const internal = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).filter((d) => d.startsWith("@blind-report/"));
      expect(allowed[name], `pacote sem regra: ${name}`).toBeDefined();
      for (const dep of internal) expect(allowed[name], `${name} não pode depender de ${dep}`).toContain(dep);
    }
  });

  it("core_e_crypto_nao_dependem_de_pacotes_de_rede", () => {
    for (const name of ["@blind-report/core", "@blind-report/crypto"]) {
      expect(allowed[name]).not.toContain("@blind-report/network-policy");
    }
  });
});

describe("script ci", () => {
  it("executa_as_etapas_na_ordem_e_comeca_pelo_guardrail", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { scripts: Record<string, string> };
    const steps = pkg.scripts.ci!.split("&&").map((s) => s.trim());
    expect(steps[0]).toBe("npm run guardrails");
    const idx = (s: string) => steps.indexOf(s);
    expect(idx("npm run guardrails")).toBeLessThan(idx("npm run typecheck"));
    expect(idx("npm run typecheck")).toBeLessThan(idx("npm run test:coverage"));
  });

  it("os_scripts_nao_usam_navegador_automatizado", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { scripts: Record<string, string>; devDependencies: Record<string, string> };
    const all = JSON.stringify(pkg).toLowerCase();
    for (const banned of ["playwright", "puppeteer", "selenium"]) expect(all).not.toContain(banned);
  });
});
