// Demo local da interface da fonte, com backend SIMULADO.
// O `main` do repositório está com APIs divergentes entre pacotes e não compila;
// esta entrada exercita a UI/controller reais com respostas falsas em memória.
import { toBase64Url } from "@blind-report/core";
import { SourceError } from "@blind-report/source-client";
import { cancellable, createSourceController, type SourceState } from "../src/controller.ts";
import { download, h, readFileBytes, readFileText } from "../src/dom.ts";
import { setupScrolly } from "./motion.ts";

type Tab = "enviar" | "respostas" | "verificar";
type Route = "inicio" | "seguranca" | "denunciar" | "respostas" | "verificar";
type IconName = "shield" | "lock" | "key" | "eyeOff" | "github" | "check" | "download" | "fingerprint" | "cube" | "pin";

const ROUTES: Route[] = ["inicio", "seguranca", "denunciar", "respostas", "verificar"];
function parseRoute(): Route {
  const raw = window.location.hash.replace(/^#\/?/, "").toLowerCase();
  return (ROUTES as string[]).includes(raw) ? (raw as Route) : "inicio";
}
const routeHref = (route: Route) => (route === "inicio" ? "#/" : `#/${route}`);

type Region = { lat: number; lon: number };
const REGIONS: Record<string, Record<string, Region>> = {
  Brasil: {
    "São Paulo": { lat: -23.55, lon: -46.63 },
    "Rio de Janeiro": { lat: -22.91, lon: -43.17 },
    Brasília: { lat: -15.79, lon: -47.88 },
    Recife: { lat: -8.05, lon: -34.88 },
    "Porto Alegre": { lat: -30.03, lon: -51.23 },
  },
  Portugal: { Lisboa: { lat: 38.72, lon: -9.14 }, Porto: { lat: 41.15, lon: -8.61 } },
  "Estados Unidos": {
    Washington: { lat: 38.9, lon: -77.03 },
    "Nova York": { lat: 40.71, lon: -74.0 },
    "Los Angeles": { lat: 34.05, lon: -118.24 },
  },
  "Reino Unido": { Londres: { lat: 51.51, lon: -0.13 }, Manchester: { lat: 53.48, lon: -2.24 } },
  Argentina: { "Buenos Aires": { lat: -34.6, lon: -58.38 }, Córdoba: { lat: -31.42, lon: -64.18 } },
  México: { "Cidade do México": { lat: 19.43, lon: -99.13 }, Monterrey: { lat: 25.69, lon: -100.32 } },
  Angola: { Luanda: { lat: -8.84, lon: 13.23 } },
  Moçambique: { Maputo: { lat: -25.97, lon: 32.57 } },
  Alemanha: { Berlim: { lat: 52.52, lon: 13.4 }, Munique: { lat: 48.14, lon: 11.58 } },
  França: { Paris: { lat: 48.86, lon: 2.35 }, Marselha: { lat: 43.3, lon: 5.37 } },
  Índia: { "Nova Délhi": { lat: 28.61, lon: 77.21 }, Mumbai: { lat: 19.08, lon: 72.88 } },
  Japão: { Tóquio: { lat: 35.68, lon: 139.69 }, Osaka: { lat: 34.69, lon: 135.5 } },
  "África do Sul": { Joanesburgo: { lat: -26.2, lon: 28.05 }, "Cidade do Cabo": { lat: -33.92, lon: 18.42 } },
};
let regionCountry = "Brasil";
let regionCity = "São Paulo";
const currentRegion = (): Region => REGIONS[regionCountry]?.[regionCity] ?? REGIONS.Brasil["São Paulo"];

const SVG_NS = "http://www.w3.org/2000/svg";
const bytes = (n: number) => Uint8Array.from({ length: n }, (_, i) => (i * 7 + 11) % 256);
const NEWSROOM = {
  name: "investiga.eth",
  version: 3,
  pubkeyVersion: 3,
  publicKey: toBase64Url(bytes(32)),
  policy: {
    categories: ["corrupção", "meio ambiente", "saúde", "política"],
    maxBytes: 50_000,
    attachments: true,
    epoch: "monthly" as const,
  },
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function svgEl(tag: string, attrs: Record<string, string> = {}, ...children: (SVGElement | string)[]): SVGElement {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k === "className" ? "class" : k, v);
  for (const c of children) el.append(c);
  return el;
}

function icon(name: IconName): SVGElement {
  const stroke = { fill: "none", stroke: "currentColor", "stroke-width": "1.7", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", focusable: "false", viewBox: "0 0 24 24" };
  if (name === "shield") {
    return svgEl("svg", stroke, svgEl("path", { d: "M12 3 20 6v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z" }), svgEl("path", { d: "m9 12 2 2 4-4" }));
  }
  if (name === "lock") {
    return svgEl("svg", stroke, svgEl("rect", { x: "4", y: "10", width: "16", height: "10", rx: "2.5" }), svgEl("path", { d: "M8 10V7a4 4 0 0 1 8 0v3" }));
  }
  if (name === "key") {
    return svgEl("svg", stroke, svgEl("circle", { cx: "15", cy: "9", r: "4" }), svgEl("path", { d: "m12 12-8 8" }), svgEl("path", { d: "m5 15 2 2" }));
  }
  if (name === "eyeOff") {
    return svgEl(
      "svg",
      stroke,
      svgEl("path", { d: "M3 3l18 18" }),
      svgEl("path", { d: "M10.6 5.2A10 10 0 0 1 12 5c5 0 9 4.5 9 7a11 11 0 0 1-2.2 3.3" }),
      svgEl("path", { d: "M6.3 6.8C4.2 8.2 3 10.1 3 12c0 2.5 4 7 9 7 1.7 0 3.3-.5 4.6-1.3" }),
      svgEl("path", { d: "M9.9 9.9a3 3 0 0 0 4.2 4.2" }),
    );
  }
  if (name === "check") {
    return svgEl("svg", stroke, svgEl("path", { d: "m4.5 12.5 5 5 10-11" }));
  }
  if (name === "download") {
    return svgEl("svg", stroke, svgEl("path", { d: "M12 4v11" }), svgEl("path", { d: "m7 10 5 5 5-5" }), svgEl("path", { d: "M5 20h14" }));
  }
  if (name === "pin") {
    return svgEl(
      "svg",
      stroke,
      svgEl("path", { d: "M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" }),
      svgEl("circle", { cx: "12", cy: "10", r: "2.5" }),
    );
  }
  if (name === "fingerprint") {
    return svgEl(
      "svg",
      stroke,
      svgEl("path", { d: "M5 12a7 7 0 0 1 14 0v2" }),
      svgEl("path", { d: "M8 14a4 4 0 0 1 8 0v3" }),
      svgEl("path", { d: "M11 16a1 1 0 0 1 2 0v3" }),
      svgEl("path", { d: "M5 16v2" }),
      svgEl("path", { d: "M8 18v2" }),
    );
  }
  if (name === "cube") {
    return svgEl(
      "svg",
      stroke,
      svgEl("path", { d: "m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" }),
      svgEl("path", { d: "m4 7.5 8 4.5 8-4.5" }),
      svgEl("path", { d: "M12 12v9" }),
    );
  }
  return svgEl(
    "svg",
    { viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": "true", focusable: "false" },
    svgEl("path", {
      d: "M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.1 1.7 1.1 1 1.7 2.6 1.2 3.2.9.1-.7.4-1.2.7-1.5-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5Z",
    }),
  );
}

function logoMark(): SVGElement {
  return svgEl(
    "svg",
    { className: "logo-mark", viewBox: "0 0 48 48", fill: "none", "aria-hidden": "true", focusable: "false" },
    svgEl("path", { d: "M24 4 41 10v11.5C41 33 33.8 41 24 45 14.2 41 7 33 7 21.5V10L24 4Z", stroke: "currentColor", "stroke-width": "2.6", "stroke-linejoin": "round" }),
    svgEl("path", { d: "M13 24c3.2-4.6 7-6.9 11-6.9s7.8 2.3 11 6.9c-3.2 4.6-7 6.9-11 6.9s-7.8-2.3-11-6.9Z", stroke: "currentColor", "stroke-width": "2.4" }),
    svgEl("circle", { cx: "24", cy: "24", r: "4.2", fill: "currentColor" }),
  );
}

const SPECTER_BODY =
  "M33 4C18.6 4 7 15.6 7 30v32.3c0 2.6 3 4 5 2.3l5.6-4.6 5.6 4.6c1.5 1.2 3.7 1.2 5.2 0l5.6-4.6 5.6 4.6c1.5 1.2 3.7 1.2 5.2 0l5.6-4.6 5.6 4.6c2 1.7 5 .3 5-2.3V30C59 15.6 47.4 4 33 4Z";
let specterSeq = 0;

function specter(className = "specter"): SVGElement {
  const id = `specter-${++specterSeq}`;
  return svgEl(
    "svg",
    { className, viewBox: "0 0 66 74", fill: "none", "aria-hidden": "true", focusable: "false" },
    svgEl(
      "defs",
      {},
      svgEl(
        "linearGradient",
        { id: `${id}-g`, x1: "10", y1: "8", x2: "58", y2: "68", gradientUnits: "userSpaceOnUse" },
        svgEl("stop", { offset: "0", "stop-color": "#a9c2ff" }),
        svgEl("stop", { offset: "0.45", "stop-color": "#8b8dff" }),
        svgEl("stop", { offset: "1", "stop-color": "#c77bff" }),
      ),
      svgEl(
        "radialGradient",
        { id: `${id}-hl`, cx: "0.34", cy: "0.22", r: "0.55" },
        svgEl("stop", { offset: "0", "stop-color": "rgba(255,255,255,0.75)" }),
        svgEl("stop", { offset: "1", "stop-color": "rgba(255,255,255,0)" }),
      ),
    ),
    svgEl("path", { d: SPECTER_BODY, fill: `url(#${id}-g)` }),
    svgEl("path", { d: SPECTER_BODY, fill: `url(#${id}-hl)`, opacity: "0.7" }),
    svgEl(
      "g",
      { className: "specter-eyes" },
      svgEl("ellipse", { cx: "25", cy: "31", rx: "2.7", ry: "4.3", fill: "#07101f" }),
      svgEl("ellipse", { cx: "41", cy: "31", rx: "2.7", ry: "4.3", fill: "#07101f" }),
    ),
    svgEl("path", { d: "M29 41.5c2.3 2.2 5.7 2.2 8 0", stroke: "rgba(7,16,31,0.72)", "stroke-width": "1.8", "stroke-linecap": "round" }),
    svgEl("ellipse", { cx: "18", cy: "38", rx: "3.4", ry: "2", fill: "rgba(255,140,210,0.28)" }),
    svgEl("ellipse", { cx: "48", cy: "38", rx: "3.4", ry: "2", fill: "rgba(255,140,210,0.28)" }),
  );
}

function instruments(initialCount: number): HTMLElement {
  const r = currentRegion();
  const countLabel = `${initialCount} ${initialCount === 1 ? "caractere" : "caracteres"} · só neste aparelho`;
  return h(
    "aside",
    { className: "desk-side", "aria-label": "Instrumentos locais" },
    h(
      "div",
      { className: "instrument", "data-reveal": "" },
      h(
        "header",
        { className: "instrument-head" },
        h("span", { className: "instrument-icon" }, icon("key")),
        h("div", {}, h("strong", {}, "Teclado local"), h("span", {}, "cada tecla é processada aqui")),
        h("span", { className: "instrument-tag" }, "local"),
      ),
      h("canvas", { className: "keyboard-field", "aria-hidden": "true" }),
      h("div", { className: "instrument-foot" }, h("span", { className: "pulse-dot", "aria-hidden": "true" }), h("span", { className: "keyboard-count" }, countLabel)),
    ),
    h(
      "div",
      { className: "instrument", "data-reveal": "" },
      h(
        "header",
        { className: "instrument-head" },
        h("span", { className: "instrument-icon" }, icon("pin")),
        h("div", {}, h("strong", {}, "Região do relato"), h("span", {}, "contexto, não identidade")),
        h("span", { className: "instrument-tag accent" }, "pin"),
      ),
      h("canvas", {
        className: "region-field",
        "data-lat": String(r.lat),
        "data-lon": String(r.lon),
        "aria-hidden": "true",
      }),
      h(
        "div",
        { className: "region-meta" },
        h("div", {}, h("strong", { className: "region-name" }, `${regionCountry} · ${regionCity}`), h("span", { className: "region-coords" }, `${r.lat.toFixed(2)}°, ${r.lon.toFixed(2)}°`)),
        h("span", { className: "region-note" }, "ponto arredondado"),
      ),
    ),
    h(
      "div",
      { className: "instrument instrument-mini", "data-reveal": "" },
      h("div", { className: "mini-row" }, icon("lock"), h("span", {}, "0 bytes saíram deste aparelho")),
      h("div", { className: "mini-row" }, icon("eyeOff"), h("span", {}, "Nenhum IP registrado")),
      h("div", { className: "mini-row" }, icon("key"), h("span", {}, "Chave de leitura só no recibo")),
    ),
  );
}

function receiptLinks(): HTMLElement {
  return h(
    "section",
    { className: "receipt-links", "data-reveal": "" },
    h(
      "div",
      { className: "receipt-links-copy" },
      h("span", { className: "eyebrow" }, h("span", { className: "eyebrow-dot", "aria-hidden": "true" }), "Já denunciou?"),
      h("h2", {}, "Seu recibo abre a conversa."),
      h("p", { className: "muted" }, "Respostas e verificação usam apenas o arquivo que está com você. Nós não guardamos uma cópia."),
    ),
    h(
      "div",
      { className: "receipt-links-actions" },
      h("a", { className: "btn ghost", href: "#/respostas" }, icon("key"), "Abrir respostas"),
      h("a", { className: "btn ghost", href: "#/verificar" }, icon("shield"), "Verificar documento"),
    ),
  );
}

function makeMockClient() {
  let submissions = 0;
  const vary = (n: number) => {
    const seed = submissions * 47 + 13;
    return Uint8Array.from({ length: n }, (_, i) => (i * 7 + seed) % 256);
  };
  return {
    async lookupNewsroom(name: string) {
      await sleep(450);
      if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/.test(name)) {
        throw new SourceError("invalid_newsroom", "Use o nome da redação no formato nome.eth, em minúsculas.");
      }
      return { ...NEWSROOM, name };
    },
    async submit({ newsroom, category, text, attachment }: { newsroom: string; category: string; text: string; attachment?: { name: string } }) {
      await sleep(1_600);
      if (!text.trim() && !attachment) throw new SourceError("invalid_size", "A denúncia está vazia.");
      submissions += 1;
      return {
        receipt: {
          newsroom,
          key: "br_" + toBase64Url(vary(18)),
          contentHash:
            "sha256:" +
            Array.from(vary(32), (b) => b.toString(16).padStart(2, "0")).join(""),
          salt: bytes(16),
          mailboxPriv: bytes(32),
          mailboxPub: bytes(32),
          category,
        },
        parts: 1,
      };
    },
    async readReplies(_receipt: unknown) {
      await sleep(500);
      return {
        replies: [
          {
            text: "Recebemos sua denúncia. Um jornalista vai analisar e pode responder por aqui em até 5 dias úteis.",
            createdAtBlock: 8_765_432n,
            author: NEWSROOM.name,
          },
        ],
        ignored: 0,
      };
    },
    async verifyDocument({ envelope }: { envelope: Uint8Array }) {
      await sleep(600);
      if (envelope.length === 0) throw new SourceError("invalid_envelope", "Arquivo vazio ou inválido.");
      return { hashMatches: true, found: true, createdAtBlock: 8_765_432n };
    },
    proveAuthorship() {
      return true;
    },
  };
}

const STEPS = ["Redação", "Relato", "Prova", "Recibo"];
const STEP_ORDER = ["newsroom", "compose", "proof", "receipt"];

function ambient(): HTMLElement {
  return h(
    "div",
    { className: "ambient", "aria-hidden": "true" },
    h("div", { className: "grid" }),
    h("div", { className: "aurora" }),
    h("span", { className: "orb orb-a" }),
    h("span", { className: "orb orb-b" }),
    h("span", { className: "orb orb-c" }),
    h("span", { className: "cursor-glow" }),
  );
}

function stepper(step: SourceState["step"]): HTMLElement {
  const index = STEP_ORDER.indexOf(step);
  return h(
    "ol",
    { className: "stepper", "aria-label": "Etapas do envio" },
    ...STEPS.map((label, i) =>
      h(
        "li",
        { className: i < index ? "done" : i === index ? "active" : undefined, "aria-current": i === index ? "step" : undefined },
        h("span", { className: "step-node", "aria-hidden": "true" }, i < index ? "✓" : String(i + 1).padStart(2, "0")),
        h("span", { className: "step-label" }, label),
      ),
    ),
  );
}

function field(label: string, id: string, control: HTMLElement): HTMLElement {
  return h("div", { className: "field" }, h("label", { htmlFor: id }, label), control);
}

function panelHead(badge: string, title: string, note?: string): HTMLElement {
  return h(
    "header",
    { className: "panel-head" },
    h("div", {}, h("h2", {}, title), note ? h("p", { className: "muted" }, note) : null),
    h("span", { className: "step-badge" }, badge),
  );
}

function panelMeta(text: string): HTMLElement {
  return h("p", { className: "panel-meta" }, icon("lock"), h("span", {}, text));
}

async function start() {
  const root = document.getElementById("app")!;
  document.body.prepend(ambient());
  let route: Route = parseRoute();
  let pendingFocus = false;
  let tab: Tab = route === "respostas" ? "respostas" : route === "verificar" ? "verificar" : "enviar";
  let lastCategory = "corrupção";
  let draftText = "";
  let draftCategory = "";

  const client = makeMockClient() as unknown as ReturnType<typeof import("@blind-report/source-client").createSourceClient>;
  const proof = cancellable(async () => {
    throw new SourceError("proof_denied", "prova indisponível no demo");
  });
  const controller = createSourceController(client);

  const err = (s: SourceState) => (s.error ? h("p", { className: "error", role: "alert" }, s.error.message) : null);

  function viewSend(s: SourceState): Node {
    if (s.step === "newsroom") {
      const name = h("input", { type: "text", id: "nr", placeholder: "investiga.eth", autocomplete: "off" }) as HTMLInputElement;
      name.value = (document.getElementById("nr") as HTMLInputElement | null)?.value ?? "investiga.eth";
      return h(
        "section",
        { className: "panel" },
        panelHead("01 / 04", "Para qual redação?", "Confira o nome com a redação por outro canal. Qualquer pessoa pode criar um nome."),
        stepper(s.step),
        err(s),
        field("Nome da redação (ENS)", "nr", name),
        h(
          "div",
          { className: "actions" },
          h("button", { className: "btn primary", onclick: () => controller.lookup(name.value), disabled: s.busy }, s.busy ? "Buscando…" : "Buscar redação", h("span", { className: "btn-arrow", "aria-hidden": "true" }, "→")),
        ),
        panelMeta("Conexão anônima · nenhum IP registrado"),
      );
    }

    if (s.step === "compose" && s.newsroom) {
      const n = s.newsroom;
      const cat = h("select", { id: "cat" }, ...n.categories.map((c) => h("option", { value: c }, c))) as HTMLSelectElement;
      if (draftCategory && n.categories.includes(draftCategory)) cat.value = draftCategory;
      cat.addEventListener("change", () => {
        draftCategory = cat.value;
      });
      const text = h("textarea", { id: "txt", placeholder: "Descreva o que você sabe, com o máximo de detalhes verificáveis que puder." }) as HTMLTextAreaElement;
      text.value = draftText;
      text.addEventListener("input", () => {
        draftText = text.value;
      });
      const file = h("input", { type: "file", id: "file" }) as HTMLInputElement;

      if (!REGIONS[regionCountry]?.[regionCity]) {
        regionCountry = "Brasil";
        regionCity = "São Paulo";
      }
      const country = h("select", { id: "reg-country" }, ...Object.keys(REGIONS).map((c) => h("option", { value: c }, c))) as HTMLSelectElement;
      country.value = regionCountry;
      const cityOf = (name: string) => Object.keys(REGIONS[name] ?? REGIONS.Brasil);
      const city = h("select", { id: "reg-city" }, ...cityOf(regionCountry).map((c) => h("option", { value: c }, c))) as HTMLSelectElement;
      city.value = regionCity;
      const emitRegion = () => {
        const place = currentRegion();
        window.dispatchEvent(new CustomEvent("br:region", { detail: { country: regionCountry, city: regionCity, lat: place.lat, lon: place.lon } }));
      };
      country.addEventListener("change", () => {
        regionCountry = country.value;
        const cities = cityOf(regionCountry);
        if (!cities.includes(regionCity)) regionCity = cities[0];
        city.replaceChildren(...cities.map((c) => h("option", { value: c }, c)));
        city.value = regionCity;
        emitRegion();
      });
      city.addEventListener("change", () => {
        regionCity = city.value;
        emitRegion();
      });
      return h(
        "section",
        { className: "panel" },
        panelHead("02 / 04", "Componha sua denúncia"),
        stepper(s.step),
        h("div", { className: "target" }, h("span", { className: "target-dot", "aria-hidden": "true" }), h("strong", {}, n.name), h("span", { className: "muted" }, `chave v${n.version}`)),
        h("p", { className: "muted" }, `Aceita: ${n.categories.join(", ")} · até ${n.maxBytes.toLocaleString("pt-BR")} bytes · anexos: ${n.attachments ? "sim" : "não"} · 1 envio por mês`),
        err(s),
        field("Categoria", "cat", cat),
        field("Texto", "txt", text),
        h(
          "div",
          { className: "region-fields" },
          h(
            "div",
            { className: "region-fields-head" },
            h("span", { className: "region-fields-title" }, icon("pin"), "Onde acontece?"),
            h("span", { className: "region-optional" }, "opcional"),
          ),
          h("div", { className: "region-selects" }, field("País", "reg-country", country), field("Cidade", "reg-city", city)),
          h("p", { className: "hint region-hint-inline" }, icon("shield"), h("span", {}, "O ponto no mapa é arredondado e não identifica endereço. Serve só para dar contexto.")),
        ),
        n.attachments ? field("Anexo (opcional)", "file", file) : null,
        h("p", { className: "hint" }, icon("lock"), h("span", {}, "Seu texto é cifrado neste aparelho antes de sair. Só a redação consegue abri-lo.")),
        h(
          "div",
          { className: "actions" },
          h(
            "button",
            {
              className: "btn primary",
              onclick: async () => {
                const f = file.files?.[0];
                lastCategory = cat.value;
                draftCategory = cat.value;
                draftText = text.value;
                const attachment = f ? { name: f.name, data: await readFileBytes(f) } : undefined;
                await controller.submit({ category: cat.value, text: text.value, attachment });
              },
            },
            "Continuar",
            h("span", { className: "btn-arrow", "aria-hidden": "true" }, "→"),
          ),
        ),
        panelMeta("Cifrado neste aparelho antes de sair · ninguém no caminho consegue ler"),
      );
    }

    if (s.step === "proof") {
      const assurance = ["Prova gerada neste aparelho", "Nullifier único por denúncia", "Nenhum dado pessoal revelado"];
      return h(
        "section",
        { className: "panel" },
        panelHead("03 / 04", "Prove que você é humano", "Isso não revela quem você é."),
        stepper(s.step),
        h(
          "div",
          { className: "proof-stage" },
          h(
            "div",
            { className: "scan", "aria-hidden": "true" },
            h("span", { className: "scan-ring" }),
            h("span", { className: "scan-ring scan-ring-b" }),
            h("span", { className: "scan-ring scan-ring-c" }),
            h("span", { className: "proof-orb" }, icon("shield")),
          ),
          h(
            "div",
            { className: "proof-copy" },
            h("span", { className: "proof-kicker" }, "World ID · proof of personhood"),
            s.proofLink
              ? h("p", { className: "link" }, "Abra no World App: ", h("a", { href: s.proofLink, rel: "noreferrer noopener" }, s.proofLink))
              : h("p", { className: "status-line status-line-left" }, h("span", { className: "spinner", "aria-hidden": "true" }), "Simulando prova World ID…"),
            h("p", { className: "muted", role: "status" }, "Aguardando a confirmação. Nada será enviado à redação antes disso."),
            h(
              "ul",
              { className: "assurance" },
              ...assurance.map((item) => h("li", {}, h("span", { className: "assurance-check", "aria-hidden": "true" }, icon("check")), item)),
            ),
          ),
        ),
        h(
          "div",
          { className: "actions" },
          h("button", { className: "btn ghost", onclick: () => proof.cancel() }, "Cancelar"),
        ),
        panelMeta("Prova de conhecimento zero · nenhum dado pessoal é revelado"),
      );
    }

    draftText = "";
    draftCategory = "";
    let receipt: Record<string, unknown> | null = null;
    try {
      receipt = JSON.parse(s.receiptText ?? "");
    } catch {
      receipt = null;
    }
    const key = typeof receipt?.key === "string" ? receipt.key.replace(/^br[_-]/, "") : "";
    const contentHash = typeof receipt?.contentHash === "string" ? receipt.contentHash : "";
    const protocol = key ? `BR-${key.slice(0, 4).toUpperCase()}-${key.slice(-4).toUpperCase()}` : "BR-LOCAL";
    const shortHash = contentHash.length > 18 ? `${contentHash.slice(0, 15)}…${contentHash.slice(-4)}` : contentHash || "sha256:local";
    const ticketCell = (label: string, value: string, mono = false) =>
      h(
        "div",
        { className: "ticket-cell" },
        h("span", {}, label),
        mono ? h("code", {}, value) : h("strong", {}, value),
      );

    return h(
      "section",
      { className: "panel" },
      panelHead("04 / 04", "Denúncia enviada", "Um recibo foi gerado neste aparelho. Ele não é armazenado em nenhum servidor."),
      stepper(s.step),
      h(
        "div",
        { className: "success-head" },
        h("div", { className: "success-mark", "aria-hidden": "true" }, h("span", { className: "proof-orb success" }, icon("check"))),
        h(
          "div",
          { className: "success-copy" },
          h("h3", {}, "Envelope selado e entregue"),
          h("p", { className: "muted" }, "Sua denúncia já está com a redação. O recibo abaixo é a única cópia da chave de leitura."),
        ),
      ),
      h(
        "div",
        { className: "ticket" },
        h(
          "div",
          { className: "ticket-head" },
          h("span", { className: "ticket-brand" }, icon("shield"), "Recibo de custódia"),
          h("span", { className: "ticket-chip" }, "LOCAL · NÃO ENVIADO"),
        ),
        h(
          "div",
          { className: "ticket-grid" },
          ticketCell("Redação", s.newsroom?.name ?? String(receipt?.newsroom ?? "investiga.eth")),
          ticketCell("Categoria", lastCategory),
          ticketCell("Protocolo", protocol, true),
          ticketCell("Hash do conteúdo", shortHash, true),
        ),
        h("div", { className: "ticket-perf", "aria-hidden": "true" }),
        h(
          "p",
          { className: "ticket-note" },
          icon("key"),
          "A chave privada de leitura está dentro deste recibo. Sem ele, não é possível ler respostas nem provar autoria.",
        ),
        h(
          "div",
          { className: "actions ticket-actions" },
          h("button", { className: "btn primary", onclick: () => download("recibo-blind-report.json", s.receiptText!) }, icon("download"), "Baixar recibo"),
          h(
            "button",
            {
              className: "btn ghost",
              onclick: (ev: Event) => {
                const btn = ev.currentTarget as HTMLButtonElement;
                void navigator.clipboard?.writeText(s.receiptText!);
                const previous = btn.textContent;
                btn.textContent = "Copiado!";
                btn.classList.add("is-copied");
                setTimeout(() => {
                  btn.textContent = previous;
                  btn.classList.remove("is-copied");
                }, 1600);
              },
            },
            "Copiar",
          ),
        ),
      ),
      h(
        "label",
        { className: "check" },
        h("input", { type: "checkbox", checked: s.receiptSaved, onchange: () => controller.confirmReceiptSaved() }),
        h("span", {}, "Já guardei o recibo"),
      ),
      h("div", { className: "actions" }, h("button", { className: "btn ghost", onclick: () => controller.finish(), disabled: !s.receiptSaved }, "Concluir")),
      panelMeta("Recibo só neste aparelho · não guardamos cópia"),
    );
  }

  function viewReplies(s: SourceState): Node {
    const box = h("textarea", { id: "rc", placeholder: "Cole aqui o conteúdo do recibo (JSON)." }) as HTMLTextAreaElement;
    const pick = h("input", { type: "file", id: "rcf", accept: ".json" }) as HTMLInputElement;
    pick.addEventListener("change", async () => {
      const f = pick.files?.[0];
      if (f) await controller.loadReplies(await readFileText(f));
    });
    return h(
      "section",
      { className: "panel" },
      panelHead("RESPOSTAS", "Abra as respostas da redação", "Só quem tem o recibo consegue ler. Nem nós temos uma cópia."),
      err(s),
      field("Recibo (arquivo)", "rcf", pick),
      field("ou cole o recibo", "rc", box),
      h("div", { className: "actions" }, h("button", { className: "btn primary", onclick: () => controller.loadReplies(box.value) }, "Ver respostas", h("span", { className: "btn-arrow", "aria-hidden": "true" }, "→"))),
      s.ignoredReplies ? h("p", { className: "warn", role: "status" }, `${s.ignoredReplies} resposta(s) ignorada(s): não foi possível confirmar que vieram da redação.`) : null,
      s.replies
        ? s.replies.length === 0
          ? h("p", { className: "muted" }, "Nenhuma resposta ainda.")
          : h(
              "ul",
              { className: "replies" },
              ...s.replies.map((r) =>
                h(
                  "li",
                  {},
                  h("span", { className: "reply-author" }, r.author),
                  h("p", {}, r.text),
                  h("span", { className: "muted" }, `bloco ${r.createdAtBlock}`),
                ),
              ),
            )
        : null,
      panelMeta("Endereçamento privado por mailbox · só o recibo abre a conversa"),
    );
  }

  function viewVerify(s: SourceState): Node {
    const nr = h("input", { type: "text", id: "vnr", placeholder: "investiga.eth" }) as HTMLInputElement;
    nr.value = "investiga.eth";
    const file = h("input", { type: "file", id: "vf" }) as HTMLInputElement;
    const receipt = h("textarea", { id: "vrc", placeholder: "Recibo (para provar autoria)" }) as HTMLTextAreaElement;
    const text = h("textarea", { id: "vtx", placeholder: "Texto original" }) as HTMLTextAreaElement;
    const out = h("p", {});
    const v = s.verification;
    return h(
      "section",
      { className: "panel" },
      panelHead("VERIFICAÇÃO", "Confira antes de publicar", "Verifique se o envelope existe e se o hash confere, sem expor a fonte."),
      err(s),
      field("Redação", "vnr", nr),
      field("Arquivo (envelope)", "vf", file),
      h(
        "div",
        { className: "actions" },
        h(
          "button",
          {
            className: "btn primary",
            onclick: async () => {
              const f = file.files?.[0];
              if (f) await controller.verify({ newsroom: nr.value.trim(), envelope: await readFileBytes(f) });
            },
          },
          "Verificar integridade",
          h("span", { className: "btn-arrow", "aria-hidden": "true" }, "→"),
        ),
      ),
      v
        ? h(
            "div",
            { className: v.hashMatches && v.found ? "result ok" : "result error" },
            h("span", { className: "result-dot", "aria-hidden": "true" }),
            `${v.hashMatches ? "O hash confere" : "O hash não confere"} · ${v.found ? `existe no Arkiv desde o bloco ${v.createdAtBlock}` : "não encontrado no Arkiv"}`,
          )
        : null,
      h("div", { className: "divider" }),
      h("h3", {}, "Provar autoria"),
      field("Recibo", "vrc", receipt),
      field("Texto original", "vtx", text),
      h(
        "div",
        { className: "actions" },
        h(
          "button",
          {
            className: "btn ghost",
            onclick: () => {
              out.className = "result ok";
              out.textContent = "Você é quem enviou. (simulado)";
            },
          },
          "Provar autoria",
        ),
      ),
      out,
      panelMeta("Verificação pública e auditável · a fonte permanece anônima"),
    );
  }

  type HeroContent = { eyebrow: string; title: string; lede: string; compact?: boolean; chips?: string[] };
  function heroFor(s: SourceState): HeroContent {
    if (tab === "respostas") {
      return { eyebrow: "Respostas", title: "Conversa protegida", lede: "Leia o que a redação respondeu usando apenas o recibo que está com você.", compact: true };
    }
    if (tab === "verificar") {
      return { eyebrow: "Verificação", title: "Confira antes de publicar", lede: "Prove que um documento existe, veio da redação certa e não foi alterado.", compact: true };
    }
    if (s.step === "compose") {
      return { eyebrow: "Passo 2 · Relato", title: "Escreva. Nós ciframos.", lede: "O texto é cifrado neste aparelho antes de sair. Nem o servidor de envio consegue ler.", compact: true };
    }
    if (s.step === "proof") {
      return { eyebrow: "Passo 3 · Humanidade", title: "Prove sem se identificar.", lede: "A prova de humanidade impede spam sem revelar quem você é.", compact: true };
    }
    if (s.step === "receipt") {
      return { eyebrow: "Passo 4 · Recibo", title: "O recibo é só seu.", lede: "Guarde-o. Ele é a chave para respostas, autoria e verificação.", compact: true };
    }
    return {
      eyebrow: "Canal seguro de denúncia",
      title: "Fale sem deixar rastro",
      lede: "Envie relatos e documentos a redações investigativas com criptografia de ponta a ponta, prova de humanidade e nenhum registro de IP.",
      chips: ["Criptografia E2E", "World ID", "Armazenamento imutável"],
    };
  }

  function hero(hc: HeroContent): HTMLElement {
    const landing = !hc.compact;
    return h(
      "section",
      { className: hc.compact ? "hero compact" : "hero" },
      h("span", { className: "eyebrow" }, h("span", { className: "eyebrow-dot", "aria-hidden": "true" }), hc.eyebrow),
      h("h1", {}, hc.title),
      h("p", { className: "lede" }, hc.lede),
      hc.chips ? h("div", { className: "chips" }, ...hc.chips.map((c) => h("span", { className: "chip" }, c))) : null,
      landing
        ? h(
            "div",
            { className: "hero-actions" },
            h(
              "button",
              {
                className: "btn primary lg",
                onclick: () => {
                  const input = document.querySelector<HTMLInputElement>("#nr");
                  document.querySelector(".panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
                  setTimeout(() => input?.focus({ preventScroll: true }), 420);
                },
              },
              "Iniciar denúncia",
              h("span", { className: "btn-arrow", "aria-hidden": "true" }, "→"),
            ),
            h(
              "button",
              { className: "btn ghost lg", onclick: () => document.querySelector("#como-funciona")?.scrollIntoView({ behavior: "smooth", block: "start" }) },
              "Como funciona",
            ),
          )
        : null,
    );
  }

  function scrollToId(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function wordsHeading(text: string, accentWords: string[] = []): HTMLElement {
    const children: (HTMLElement | string)[] = [];
    let index = 0;
    const words = text.split(" ");
    words.forEach((word, i) => {
      const clean = word.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
      const span = h("span", { className: accentWords.includes(clean) ? "w accent" : "w" }, word);
      span.style.setProperty("--i", String(index++));
      children.push(span);
      if (i < words.length - 1) children.push(" ");
    });
    return h("h2", { className: "split-reveal", "data-reveal": "" }, ...children);
  }

  function heroLanding(): HTMLElement {
    const assurance = [
      { icon: "shield" as IconName, label: "Sem cadastro" },
      { icon: "eyeOff" as IconName, label: "Sem registro de IP" },
      { icon: "key" as IconName, label: "Chave só com você" },
    ];
    return h(
      "section",
      { className: "hero immersive", id: "inicio", "data-chapter": "inicio" },
      h("div", { className: "hero-glow", "aria-hidden": "true" }),
      h(
        "div",
        { className: "hero-inner" },
        h(
          "div",
          { className: "hero-copy" },
          h("span", { className: "eyebrow", "data-reveal": "" }, h("span", { className: "eyebrow-dot", "aria-hidden": "true" }), "Canal seguro de denúncia"),
          h("h1", { "data-reveal": "" }, "Fale sem", h("br"), h("span", { className: "grad" }, "deixar rastro")),
          h(
            "p",
            { className: "lede", "data-reveal": "" },
            "Envie relatos e documentos a redações investigativas. Criptografia de ponta a ponta, prova de humanidade e nenhum registro de quem você é.",
          ),
          h(
            "div",
            { className: "hero-actions", "data-reveal": "" },
            h(
              "a",
              {
                className: "btn primary lg",
                href: routeHref("denunciar"),
                onclick: () => {
                  pendingFocus = true;
                },
              },
              "Enviar uma denúncia",
              h("span", { className: "btn-arrow", "aria-hidden": "true" }, "→"),
            ),
            h("button", { className: "btn ghost lg", onclick: () => scrollToId("processo") }, "Ver como funciona"),
          ),
          h(
            "ul",
            { className: "hero-assurance", "data-reveal": "" },
            ...assurance.map((item) => h("li", {}, h("span", { className: "assurance-icon" }, icon(item.icon)), item.label)),
          ),
        ),
        h(
          "div",
          { className: "hero-visual" },
          h("canvas", { className: "hero-field", "aria-hidden": "true" }),
          h("span", { className: "orbit orbit-a", "aria-hidden": "true" }),
          h("span", { className: "orbit orbit-b", "aria-hidden": "true" }),
          h("div", { className: "field-badge" }, h("span", { className: "pulse-dot", "aria-hidden": "true" }), "sessão anônima ativa"),
          h(
            "div",
            { className: "field-chip chip-a" },
            h("span", { className: "field-chip-icon" }, icon("fingerprint")),
            h("div", {}, h("strong", {}, "ZK"), h("span", {}, "humano, não identificado")),
          ),
          h(
            "div",
            { className: "field-chip chip-b" },
            h("span", { className: "field-chip-icon" }, icon("lock")),
            h("div", {}, h("strong", {}, "E2E"), h("span", {}, "selado no aparelho")),
          ),
        ),
      ),
      h(
        "div",
        { className: "hero-foot" },
        protocols(),
        h(
          "button",
          { className: "scroll-explore", onclick: () => scrollToId("manifesto") },
          h("span", {}, "Role para explorar"),
          h("span", { className: "scroll-mouse", "aria-hidden": "true" }, h("i")),
        ),
      ),
    );
  }

  function manifesto(): HTMLElement {
    const stats = [
      { value: "0", label: "dados pessoais pedidos" },
      { value: "100%", label: "cifrado antes de sair" },
      { value: "1", label: "cópia da chave: com você" },
    ];
    const words = ["medo", "represália", "vigilância", "censura", "silêncio", "esquecimento"];
    const marquee = h(
      "div",
      { className: "marquee-track", "aria-hidden": "true" },
      ...[...words, ...words].map((word) => h("span", {}, word, h("i", {}, "✦"))),
    );
    return h(
      "section",
      { className: "manifesto", id: "manifesto", "data-chapter": "manifesto" },
      h("div", { className: "chapter-eyebrow", "data-reveal": "" }, h("span", {}, "01"), "O silêncio"),
      wordsHeading("A verdade quase nunca chega sozinha.", ["sozinha"]),
      h(
        "div",
        { className: "manifesto-grid" },
        h(
          "p",
          { className: "manifesto-lede", "data-reveal": "" },
          "Quem denuncia arrisca o emprego, a reputação e a segurança. Por isso, a maioria das histórias que importam nunca chega a ser contada. O Blind Report foi desenhado para que o medo não seja o preço da verdade.",
        ),
        h(
          "div",
          { className: "manifesto-stats" },
          ...stats.map((stat) => h("div", { className: "manifesto-stat", "data-reveal": "" }, h("strong", {}, stat.value), h("span", {}, stat.label))),
        ),
      ),
      h("div", { className: "marquee", "aria-hidden": "true" }, marquee),
    );
  }

  const PROCESS_STEPS: { icon: IconName; title: string; text: string; points: string[] }[] = [
    {
      icon: "eyeOff",
      title: "Escolha a redação",
      text: "O nome ENSv2 é resolvido no seu aparelho. Nenhum servidor intermediário fica sabendo para quem você está escrevendo.",
      points: ["Resolução local do nome", "Chave da redação conferida"],
    },
    {
      icon: "lock",
      title: "Escreva e sele",
      text: "O relato e os anexos são cifrados antes de tocar a rede. Nem o nó de envio, nem o Armazenamento, nem nós conseguimos abrir.",
      points: ["Libsodium no aparelho", "Um envelope selado, sem metadados"],
    },
    {
      icon: "fingerprint",
      title: "Prove que é humano",
      text: "Uma prova de conhecimento zero bloqueia spam sem dizer quem você é. Um nullifier único por redação, por época.",
      points: ["World ID · proof of personhood", "Zero dados pessoais revelados"],
    },
    {
      icon: "cube",
      title: "Guarde o recibo",
      text: "A custódia é registrada no Arkiv e transferida para a redação. O recibo na sua mão abre respostas, autoria e verificação.",
      points: ["Trilha imutável no Arkiv", "Recibo é a única cópia da chave"],
    },
  ];

  function processSection(): HTMLElement {
    return h(
      "section",
      { className: "process", id: "processo", "data-chapter": "processo" },
      h(
        "header",
        { className: "section-head process-head", "data-reveal": "" },
        h("span", { className: "eyebrow" }, h("span", { className: "eyebrow-dot", "aria-hidden": "true" }), "02 · O caminho"),
        h("h2", {}, "Quatro passos.", h("br"), h("span", { className: "grad" }, "Nenhuma pista.")),
        h("p", { className: "muted" }, "Do primeiro clique ao recibo, cada etapa acontece no seu aparelho ou em um registro público — nunca em uma caixa-preta."),
      ),
      h(
        "div",
        { className: "process-shell" },
        h(
          "div",
          { className: "process-stage", "data-reveal": "" },
          h("canvas", { className: "morph-field", "aria-hidden": "true" }),
          h(
            "div",
            { className: "process-hud" },
            h("span", { className: "process-count" }, "01 / 04"),
            h("span", { className: "process-tag" }, "fluxo local · cifrado"),
          ),
          h("div", { className: "process-progress", "aria-hidden": "true" }, h("span")),
          h("div", { className: "process-stage-note" }, icon("shield"), "Nada legível sai deste aparelho."),
        ),
        h(
          "div",
          { className: "process-steps" },
          ...PROCESS_STEPS.map((step, i) =>
            h(
              "article",
              { className: i === 0 ? "process-step is-active" : "process-step", "data-process-step": "" },
              h("span", { className: "process-num" }, String(i + 1).padStart(2, "0")),
              h("span", { className: "process-step-icon" }, icon(step.icon)),
              h("h3", {}, step.title),
              h("p", {}, step.text),
              h("ul", { className: "process-list" }, ...step.points.map((point) => h("li", {}, icon("check"), point))),
            ),
          ),
        ),
      ),
    );
  }

  function bentoCard(opts: { icon: IconName; tag: string; title: string; text: string; span: string; visual: HTMLElement; index: number }): HTMLElement {
    const card = h(
      "article",
      { className: `bento-card ${opts.span}`, "data-reveal": "" },
      h("div", { className: "bento-top" }, h("span", { className: "bento-icon" }, icon(opts.icon)), h("span", { className: "bento-tag" }, opts.tag)),
      h("h3", {}, opts.title),
      h("p", {}, opts.text),
      opts.visual,
    );
    card.style.setProperty("--i", String(opts.index));
    return card;
  }

  function architecture(): HTMLElement {
    return h(
      "section",
      { className: "architecture", id: "arquitetura", "data-chapter": "arquitetura" },
      h(
        "header",
        { className: "section-head", "data-reveal": "" },
        h("span", { className: "eyebrow" }, h("span", { className: "eyebrow-dot", "aria-hidden": "true" }), "03 · Arquitetura"),
        h("h2", {}, "Segurança não é promessa.", h("br"), h("span", { className: "grad" }, "É arquitetura.")),
        h("p", { className: "muted" }, "Quatro camadas independentes protegem a fonte e garantem que a redação receba exatamente o que foi enviado."),
      ),
      h("div", { className: "console-wrap", "data-reveal": "" }, consolePreview()),
      h(
        "div",
        { className: "bento" },
        bentoCard({
          icon: "lock",
          tag: "Libsodium",
          title: "Cifra de ponta a ponta",
          text: "O relato é selado com a chave pública da redação no seu aparelho. Nem o servidor de envio consegue ler.",
          span: "span-7",
          index: 0,
          visual: h(
            "div",
            { className: "cipher-panel", "aria-hidden": "true" },
            h("div", { className: "cipher-side" }, h("span", { className: "cipher-label" }, "no seu aparelho"), h("code", { className: "cipher-raw" }, "repasse de verbas…")),
            h("span", { className: "cipher-arrow" }, "→"),
            h("div", { className: "cipher-side cipher-side-out" }, h("span", { className: "cipher-label" }, "na rede"), h("code", { className: "cipher-out" }, "x9f4a·c2e1·77b0")),
          ),
        }),
        bentoCard({
          icon: "eyeOff",
          tag: "Rede restrita",
          title: "Nenhum rastro de rede",
          text: "Política de rede fechada: sem trackers, sem analytics, sem chamadas externas escondidas. Só o necessário para entregar o envelope.",
          span: "span-5",
          index: 1,
          visual: h(
            "div",
            { className: "zero-panel", "aria-hidden": "true" },
            h("span", { className: "zero-ring" }),
            h("span", { className: "zero-ring zero-ring-b" }),
            h("strong", {}, "0"),
            h("span", {}, "chamadas externas"),
          ),
        }),
        bentoCard({
          icon: "fingerprint",
          tag: "World ID",
          title: "Humano, não identificado",
          text: "Uma prova de humanidade por época e por redação. Suficiente para impedir spam, incapaz de revelar quem você é.",
          span: "span-5",
          index: 2,
          visual: h(
            "div",
            { className: "rings-panel", "aria-hidden": "true" },
            h("span", { className: "rings-core" }, icon("fingerprint")),
            h("span", { className: "rings-arc rings-arc-a" }),
            h("span", { className: "rings-arc rings-arc-b" }),
            h("span", { className: "rings-arc rings-arc-c" }),
          ),
        }),
        bentoCard({
          icon: "cube",
          tag: "Arkiv",
          title: "Custódia imutável",
          text: "A denúncia é registrada no Arkiv e a custódia é transferida para a redação — com uma trilha pública e verificável.",
          span: "span-7",
          index: 3,
          visual: h(
            "div",
            { className: "blocks-panel", "aria-hidden": "true" },
            h("span", { className: "block-node" }, "ENV"),
            h("i", { className: "block-link" }),
            h("span", { className: "block-node is-accent" }, "ARK"),
            h("i", { className: "block-link" }),
            h("span", { className: "block-node is-ok" }, "REDAÇÃO"),
            h("code", {}, "custody ✓ imutável"),
          ),
        }),
      ),
    );
  }

  function creed(): HTMLElement {
    return h(
      "section",
      { className: "creed", id: "compromisso", "data-chapter": "compromisso" },
      h(
        "div",
        { className: "creed-seal", "aria-hidden": "true" },
        h("span", { className: "seal-ring" }),
        h("span", { className: "seal-ring seal-ring-b" }),
        h("span", { className: "seal-core" }, icon("shield")),
      ),
      h(
        "div",
        { className: "creed-inner" },
        h("span", { className: "creed-kicker", "data-reveal": "" }, "04 · O compromisso"),
        h("p", { className: "creed-line", "data-reveal": "" }, "O anonimato protege ", h("em", {}, "a fonte")),
        h("p", { className: "creed-line creed-line-2", "data-reveal": "" }, "A arquitetura protege ", h("em", {}, "a verdade")),
        h(
          "div",
          { className: "creed-actions", "data-reveal": "" },
          h(
            "a",
            { className: "btn primary xl", href: routeHref("denunciar") },
            "Enviar uma denúncia",
            h("span", { className: "btn-arrow", "aria-hidden": "true" }, "→"),
          ),
          h("span", { className: "creed-note" }, "Menos de 2 minutos. Sem cadastro, sem e-mail, sem IP."),
        ),
      ),
    );
  }

  function securityTeaser(): HTMLElement {
    const layers: { icon: IconName; name: string; detail: string; status: string }[] = [
      { icon: "lock", name: "Libsodium", detail: "cifra no seu aparelho", status: "local" },
      { icon: "eyeOff", name: "Rede restrita", detail: "nenhuma chamada externa", status: "fechada" },
      { icon: "fingerprint", name: "World ID", detail: "humano sem identidade", status: "anônima" },
      { icon: "cube", name: "Arkiv", detail: "custódia imutável", status: "pública" },
    ];
    return h(
      "section",
      { className: "teaser", id: "por-dentro", "data-chapter": "arquitetura" },
      h(
        "div",
        { className: "teaser-copy", "data-reveal": "" },
        h("span", { className: "chapter-eyebrow" }, h("span", {}, "03"), "Por dentro"),
        h("h2", {}, "Quatro camadas.", h("br"), h("span", { className: "grad" }, "Nenhum atalho.")),
        h(
          "p",
          { className: "muted" },
          "Cada proteção existe por um motivo concreto — e pode ser auditada. O caminho entre você e a redação não passa por uma caixa-preta.",
        ),
        h("a", { className: "btn ghost", href: routeHref("seguranca") }, "Explorar a arquitetura", h("span", { className: "btn-arrow", "aria-hidden": "true" }, "→")),
      ),
      h(
        "div",
        { className: "layer-stack", "data-reveal": "" },
        h(
          "header",
          { className: "layer-head" },
          h("span", { className: "console-dots", "aria-hidden": "true" }, h("i"), h("i"), h("i")),
          h("span", { className: "layer-head-title" }, "sistema blind report"),
          h("span", { className: "layer-head-status" }, h("span", { className: "pulse-dot", "aria-hidden": "true" }), "4 camadas ativas"),
        ),
        ...layers.map((layer, i) =>
          h(
            "div",
            { className: "layer-row" },
            h("span", { className: "layer-index" }, String(i + 1).padStart(2, "0")),
            h("span", { className: "layer-icon" }, icon(layer.icon)),
            h("div", { className: "layer-info" }, h("strong", {}, layer.name), h("span", {}, layer.detail)),
            h("span", { className: "layer-status" }, layer.status),
          ),
        ),
      ),
    );
  }

  function securityChapterNav(): HTMLElement {
    const chapters: [string, string, string][] = [
      ["inicio", "Abertura", "seguranca-top"],
      ["arquitetura", "Camadas", "arquitetura"],
      ["manifesto", "Arkiv", "arkiv"],
      ["processo", "Rastro", "rastro"],
      ["compromisso", "Pronto", "cta-pronto"],
    ];
    return h(
      "aside",
      { className: "chapter-nav", "aria-label": "Seções de segurança" },
      ...chapters.map(([id, label, target]) =>
        h(
          "button",
          { className: "chapter-link", "data-chapter-link": id, "aria-label": label, onclick: () => scrollToId(target) },
          h("span", { className: "chapter-dot", "aria-hidden": "true" }),
          h("span", { className: "chapter-label" }, label),
        ),
      ),
    );
  }

  function securityHero(): HTMLElement {
    return h(
      "section",
      { className: "sec-hero", id: "seguranca-top", "data-chapter": "inicio" },
      h(
        "div",
        { className: "sec-hero-copy" },
        h("span", { className: "eyebrow", "data-reveal": "" }, h("span", { className: "eyebrow-dot", "aria-hidden": "true" }), "Segurança · por dentro"),
        h("h1", { "data-reveal": "" }, "O rastro termina", h("br"), h("span", { className: "grad" }, "no seu aparelho.")),
        h(
          "p",
          { className: "lede", "data-reveal": "" },
          "Nenhum tracker, analytics ou identificador. Quatro camadas independentes cuidam do caminho entre você e a redação — e cada uma pode ser auditada.",
        ),
        h(
          "div",
          { className: "hero-actions", "data-reveal": "" },
          h("button", { className: "btn primary lg", onclick: () => scrollToId("arquitetura") }, "Ver as camadas", h("span", { className: "btn-arrow", "aria-hidden": "true" }, "→")),
          h("a", { className: "btn ghost lg", href: routeHref("denunciar") }, "Testar o canal"),
        ),
        h(
          "ul",
          { className: "hero-assurance", "data-reveal": "" },
          h("li", {}, h("span", { className: "assurance-icon" }, icon("eyeOff")), "Sem trackers"),
          h("li", {}, h("span", { className: "assurance-icon" }, icon("shield")), "Sem analytics"),
          h("li", {}, h("span", { className: "assurance-icon" }, icon("key")), "Sem IP"),
        ),
      ),
      h(
        "div",
        { className: "sec-art", "aria-hidden": "true" },
        h("span", { className: "mesh-blob mesh-a" }),
        h("span", { className: "mesh-blob mesh-b" }),
        h("span", { className: "mesh-blob mesh-c" }),
        h(
          "div",
          { className: "specter-stage" },
          h("span", { className: "specter-orbit specter-orbit-a" }),
          h("span", { className: "specter-orbit specter-orbit-b" }),
          h("span", { className: "specter-orbit specter-orbit-c" }),
          specter("specter specter-hero"),
          h("span", { className: "specter-chip specter-chip-a" }, "sem identidade"),
          h("span", { className: "specter-chip specter-chip-b" }, "sem IP"),
          h("span", { className: "specter-chip specter-chip-c" }, "sem rastro"),
        ),
      ),
    );
  }

  function latticeSection(): HTMLElement {
    const points = ["Trilha pública e auditável", "Sem metadados da fonte", "Verificação por hash"];
    return h(
      "section",
      { className: "lattice", id: "arkiv", "data-chapter": "manifesto" },
      h(
        "div",
        { className: "lattice-visual", "data-reveal": "" },
        h("canvas", { className: "lattice-field", "aria-hidden": "true" }),
        h(
          "div",
          { className: "lattice-hud" },
          h("span", { className: "lattice-tag" }, h("span", { className: "pulse-dot", "aria-hidden": "true" }), "arkiv · rede pública"),
          h("code", {}, "bloco 8.765.432"),
        ),
        h("span", { className: "lattice-caption" }, "cada nó é uma entrada imutável"),
      ),
      h(
        "div",
        { className: "lattice-copy" },
        h("span", { className: "chapter-eyebrow", "data-reveal": "" }, h("span", {}, "04"), "Arkiv"),
        h("h2", { "data-reveal": "" }, "Um registro que ninguém ", h("span", { className: "grad" }, "reescreve.")),
        h(
          "p",
          { "data-reveal": "" },
          "Cada envelope vira uma entrada imutável no Arkiv. A custódia é transferida para a redação com prova pública — sem expor quem enviou.",
        ),
        h(
          "ul",
          { className: "lattice-points", "data-reveal": "" },
          ...points.map((point) => h("li", {}, icon("check"), point)),
        ),
        h(
          "div",
          { className: "lattice-stats", "data-reveal": "" },
          h("div", {}, h("strong", {}, "∞"), h("span", {}, "histórico preservado")),
          h("div", {}, h("strong", {}, "0"), h("span", {}, "metadados da fonte")),
        ),
      ),
    );
  }

  function blockedNetwork(): SVGElement {
    const cx = 190;
    const cy = 150;
    const R = 112;
    const items = ["analytics", "tracker", "CDN", "ads", "telemetria", "fontes"];
    const children: (SVGElement | string)[] = [];
    items.forEach((label, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 3;
      const x = cx + Math.cos(a) * R;
      const y = cy + Math.sin(a) * R * 0.82;
      const mx = cx + Math.cos(a) * R * 0.56;
      const my = cy + Math.sin(a) * R * 0.46;
      children.push(svgEl("line", { x1: String(cx), y1: String(cy), x2: String(x), y2: String(y), stroke: "rgba(150, 175, 255, 0.16)", "stroke-width": "1", "stroke-dasharray": "3 7" }));
      children.push(svgEl("path", { d: `M${mx - 5} ${my - 5} L${mx + 5} ${my + 5} M${mx + 5} ${my - 5} L${mx - 5} ${my + 5}`, stroke: "rgba(255, 120, 150, 0.7)", "stroke-width": "1.5", "stroke-linecap": "round" }));
      children.push(svgEl("circle", { cx: String(x), cy: String(y), r: "16", className: "net-node", fill: "rgba(255, 255, 255, 0.025)", stroke: "rgba(150, 175, 255, 0.22)" }));
      children.push(svgEl("text", { x: String(x), y: String(y + 33), "text-anchor": "middle", className: "net-label" }, label));
    });
    children.push(svgEl("circle", { cx: String(cx), cy: String(cy), r: "36", className: "net-core", fill: "rgba(122, 162, 255, 0.09)", stroke: "rgba(150, 180, 255, 0.38)" }));
    children.push(svgEl("circle", { cx: String(cx), cy: String(cy), r: "48", fill: "none", stroke: "rgba(150, 180, 255, 0.12)", "stroke-dasharray": "2 6" }));
    children.push(svgEl("text", { x: String(cx), y: String(cy + 4), "text-anchor": "middle", className: "net-core-label" }, "você"));
    return svgEl("svg", { className: "blocked-net", viewBox: "0 0 380 300", "aria-hidden": "true" }, ...children);
  }

  function noTraceSection(): HTMLElement {
    const blocked = ["Analytics · bloqueado", "Trackers · bloqueados", "Fontes e pixels externos · bloqueados", "Cookies · nenhum"];
    return h(
      "section",
      { className: "no-trace", id: "rastro", "data-chapter": "processo" },
      h(
        "div",
        { className: "no-trace-copy" },
        h("span", { className: "chapter-eyebrow", "data-reveal": "" }, h("span", {}, "05"), "Sem rastro"),
        h("h2", { "data-reveal": "" }, "A rede não sabe ", h("span", { className: "grad" }, "quem você é.")),
        h(
          "p",
          { "data-reveal": "" },
          "Política de rede fechada: nenhuma chamada externa, nenhum pixel de rastreamento, nenhum identificador. O único vestígio é um fantasma.",
        ),
        h(
          "ul",
          { className: "blocked-list", "data-reveal": "" },
          ...blocked.map((item) => h("li", {}, h("span", { className: "blocked-x", "aria-hidden": "true" }, "✕"), item)),
        ),
        h("p", { className: "no-trace-note", "data-reveal": "" }, h("span", { className: "pulse-dot", "aria-hidden": "true" }), "0 chamadas externas nesta sessão"),
      ),
      h("div", { className: "no-trace-art", "data-reveal": "" }, blockedNetwork()),
    );
  }

  function securityCta(): HTMLElement {
    return h(
      "section",
      { className: "cta-band", id: "cta-pronto", "data-chapter": "compromisso" },
      h("span", { className: "cta-band-glow", "aria-hidden": "true" }),
      h("span", { className: "eyebrow", "data-reveal": "" }, h("span", { className: "eyebrow-dot", "aria-hidden": "true" }), "Pronto para falar"),
      h("h2", { "data-reveal": "" }, "A sua história não precisa de ", h("span", { className: "grad" }, "coragem extra.")),
      h("p", { className: "muted", "data-reveal": "" }, "Só precisa de um canal que não entregue você junto."),
      h(
        "div",
        { className: "cta-band-actions", "data-reveal": "" },
        h("a", { className: "btn primary xl", href: routeHref("denunciar") }, "Enviar uma denúncia", h("span", { className: "btn-arrow", "aria-hidden": "true" }, "→")),
        h("a", { className: "btn ghost xl", href: routeHref("inicio") }, "Voltar ao início"),
      ),
    );
  }

  function denunciaHero(s: SourceState): HTMLElement {
    const copy =
      s.step === "compose"
        ? { eyebrow: "Passo 2 · Relato", lead: "Escreva.", accent: "Nós ciframos." , lede: "O texto é cifrado neste aparelho antes de sair. Use o teclado ao lado para acompanhar: cada tecla fica aqui." }
        : s.step === "proof"
          ? { eyebrow: "Passo 3 · Humanidade", lead: "Prove sem se", accent: "identificar.", lede: "A prova de humanidade impede spam sem revelar quem você é." }
          : s.step === "receipt"
            ? { eyebrow: "Passo 4 · Recibo", lead: "O recibo é", accent: "só seu.", lede: "Guarde-o. Ele é a chave para respostas, autoria e verificação." }
            : { eyebrow: "Canal seguro · 4 passos", lead: "Comece pela", accent: "redação certa.", lede: "Escolha para quem falar, escreva o que sabe e receba um recibo. O resto do caminho é criptografia." };
    return h(
      "section",
      { className: "page-hero", "data-chapter": "inicio" },
      h(
        "div",
        { className: "page-hero-copy" },
        h("span", { className: "eyebrow", "data-reveal": "" }, h("span", { className: "eyebrow-dot", "aria-hidden": "true" }), copy.eyebrow),
        h("h1", { "data-reveal": "" }, copy.lead, " ", h("span", { className: "grad" }, copy.accent)),
        h("p", { className: "lede", "data-reveal": "" }, copy.lede),
        h(
          "ul",
          { className: "hero-assurance compact", "data-reveal": "" },
          h("li", {}, h("span", { className: "assurance-icon" }, icon("shield")), "Sem cadastro"),
          h("li", {}, h("span", { className: "assurance-icon" }, icon("eyeOff")), "Sem IP"),
          h("li", {}, h("span", { className: "assurance-icon" }, icon("key")), "Recibo local"),
        ),
      ),
      h(
        "div",
        { className: "page-hero-art", "aria-hidden": "true" },
        h(
          "div",
          { className: "specter-stage mini" },
          h("span", { className: "specter-orbit specter-orbit-b" }),
          h("span", { className: "specter-orbit specter-orbit-c" }),
          specter("specter specter-mini"),
        ),
        h("span", { className: "field-badge" }, h("span", { className: "pulse-dot", "aria-hidden": "true" }), "sessão anônima ativa"),
      ),
    );
  }

  function reportSubnav(current: Route): HTMLElement {
    const items: [Route, string, IconName][] = [
      ["denunciar", "Denunciar", "lock"],
      ["respostas", "Respostas", "key"],
      ["verificar", "Verificar", "shield"],
    ];
    return h(
      "nav",
      { className: "report-subnav", "aria-label": "Fluxo da fonte" },
      ...items.map(([id, label, ic]) =>
        h("a", { className: id === current ? "report-subnav-link is-active" : "report-subnav-link", href: routeHref(id), "aria-current": id === current ? "page" : undefined }, icon(ic), label),
      ),
    );
  }

  function consolePreview(): HTMLElement {
    const nodes: { icon: IconName; label: string; sub: string; cls: string }[] = [
      { icon: "eyeOff", label: "Você", sub: "dispositivo local", cls: "" },
      { icon: "lock", label: "Cifra", sub: "libsodium", cls: "is-accent" },
      { icon: "cube", label: "Arkiv", sub: "custódia imutável", cls: "" },
      { icon: "shield", label: "Redação", sub: "investiga.eth", cls: "is-ok" },
    ];
    const flow: HTMLElement[] = [];
    nodes.forEach((node, i) => {
      if (i > 0) flow.push(h("span", { className: `flow-link flow-link-${i}`, "aria-hidden": "true" }, h("i", { className: `packet packet-${i}` })));
      flow.push(
        h(
          "article",
          { className: `flow-node ${node.cls}` },
          h("span", { className: "flow-icon", "aria-hidden": "true" }, node.label === "Você" ? specter("flow-specter") : icon(node.icon)),
          h("strong", {}, node.label),
          h("small", {}, node.sub),
        ),
      );
    });
    const stat = (value: string, label: string) => h("div", { className: "console-stat" }, h("strong", {}, value), h("span", {}, label));
    return h(
      "section",
      { className: "console", "aria-label": "Ilustração do trajeto de uma denúncia cifrada" },
      h(
        "div",
        { className: "console-bar" },
        h("span", { className: "console-dots", "aria-hidden": "true" }, h("i"), h("i"), h("i")),
        h("span", { className: "console-title" }, "sessão anônima"),
        h("span", { className: "console-live" }, h("span", { className: "pulse-dot", "aria-hidden": "true" }), "cifrado ponta a ponta"),
      ),
      h("div", { className: "console-flow" }, ...flow),
      h(
        "div",
        { className: "console-foot" },
        stat("0", "IPs registrados"),
        stat("100%", "criptografia E2E"),
        stat("ZK", "prova de humanidade"),
        h("code", { className: "console-scope" }, "scope=investiga.eth · v3"),
      ),
    );
  }

  function protocols(): HTMLElement {
    const items = ["ENSv2", "Arkiv", "World ID", "Libsodium"];
    return h(
      "div",
      { className: "protocols", "aria-label": "Tecnologias sobre as quais o Blind Report é construído" },
      h("span", { className: "protocols-label" }, "Construído sobre"),
      h("span", { className: "protocols-list" }, ...items.map((item) => h("span", { className: "protocol-item" }, item))),
    );
  }

  function scrollProgress(): HTMLElement {
    return h("div", { className: "scroll-progress", "aria-hidden": "true" }, h("span"));
  }

  function chapterNav(): HTMLElement {
    const chapters: [string, string, string][] = [
      ["inicio", "Início", "inicio"],
      ["manifesto", "Manifesto", "manifesto"],
      ["processo", "O caminho", "processo"],
      ["arquitetura", "Arquitetura", "por-dentro"],
      ["compromisso", "Compromisso", "compromisso"],
    ];
    return h(
      "aside",
      { className: "chapter-nav", "aria-label": "Navegação pelas seções" },
      ...chapters.map(([id, label, target]) =>
        h(
          "button",
          { className: "chapter-link", "data-chapter-link": id, "aria-label": label, onclick: () => scrollToId(target) },
          h("span", { className: "chapter-dot", "aria-hidden": "true" }),
          h("span", { className: "chapter-label" }, label),
        ),
      ),
    );
  }

  function footer(): HTMLElement {
    return h(
      "footer",
      { className: "site-footer" },
      h(
        "div",
        { className: "footer-top" },
        h(
          "div",
          { className: "footer-brand" },
          h("span", { className: "footer-mark", "aria-hidden": "true" }, "BR"),
          h("div", {}, h("strong", {}, "Blind Report"), h("span", {}, "Luz sobre as notícias que ninguém vê")),
        ),
        h(
          "nav",
          { className: "footer-nav", "aria-label": "Mapa do site" },
          ...[
            ["inicio", "Início"],
            ["seguranca", "Segurança"],
            ["denunciar", "Denunciar"],
            ["respostas", "Respostas"],
            ["verificar", "Verificar"],
          ].map(([id, label]) => h("a", { href: routeHref(id as Route) }, label)),
        ),
        h(
          "div",
          { className: "footer-icons" },
          h("span", { className: "icon-badge", title: "Criptografia de ponta a ponta" }, icon("lock")),
          h("span", { className: "icon-badge", title: "Sem registro de IP" }, icon("eyeOff")),
          h("span", { className: "icon-badge", title: "Chaves só na redação" }, icon("key")),
          h("a", { className: "icon-badge", href: "https://github.com/rayangustavo/blind-report", target: "_blank", rel: "noreferrer noopener", "aria-label": "Código-fonte no GitHub" }, icon("github")),
        ),
      ),
      h(
        "div",
        { className: "footer-bottom" },
        h("span", {}, "© 2026 Blind Report. Código aberto sob licença MIT."),
        h("span", {}, "Modo demonstração · backend simulado em memória"),
      ),
    );
  }

  const TITLES: Record<Route, string> = {
    inicio: "Blind Report — fale sem deixar rastro",
    seguranca: "Segurança por dentro — Blind Report",
    denunciar: "Enviar denúncia — Blind Report",
    respostas: "Respostas — Blind Report",
    verificar: "Verificar documento — Blind Report",
  };

  function focusDesk() {
    const desk = document.getElementById("enviar-denuncia");
    desk?.scrollIntoView({ behavior: "smooth", block: "start" });
    requestAnimationFrame(() => {
      const input = (document.getElementById("nr") ?? document.getElementById("txt")) as HTMLElement | null;
      input?.focus({ preventScroll: true });
    });
  }

  function topbar(): HTMLElement {
    const tabs: [Route, string][] = [
      ["inicio", "Início"],
      ["seguranca", "Segurança"],
      ["respostas", "Respostas"],
      ["verificar", "Verificar"],
    ];
    return h(
      "header",
      { className: "topbar" },
      h(
        "div",
        { className: "nav-shell" },
        h(
          "a",
          { className: "brand", href: routeHref("inicio"), "aria-label": "Blind Report — página inicial" },
          logoMark(),
          h("span", {}, "Blind Report"),
        ),
        h(
          "nav",
          { className: "nav-tabs", "aria-label": "Seções" },
          ...tabs.map(([id, label]) =>
            h(
              "a",
              {
                className: route === id ? "nav-tab is-active" : "nav-tab",
                href: routeHref(id),
                "aria-current": route === id ? "page" : undefined,
              },
              label,
            ),
          ),
        ),
        h(
          "div",
          { className: "nav-actions" },
          h(
            "a",
            {
              className: "nav-cta",
              href: routeHref("denunciar"),
              "aria-current": route === "denunciar" ? "page" : undefined,
              onclick: (event: Event) => {
                if (route === "denunciar") {
                  event.preventDefault();
                  focusDesk();
                } else {
                  pendingFocus = true;
                }
              },
            },
            "Denunciar",
          ),
          h("span", { className: "status-pill" }, h("span", { className: "pulse-dot", "aria-hidden": "true" }), "Demonstração"),
        ),
      ),
    );
  }

  let lastView = "";
  let disposeScrolly: (() => void) | null = null;
  function render(s: SourceState) {
    document.body.dataset.mode = route;
    document.body.dataset.step = s.step;
    document.documentElement.dataset.route = route;
    document.title = TITLES[route];

    let main: HTMLElement;
    if (route === "inicio") {
      main = h(
        "main",
        { id: "conteudo" },
        heroLanding(),
        manifesto(),
        processSection(),
        securityTeaser(),
        creed(),
      );
    } else if (route === "seguranca") {
      main = h(
        "main",
        { id: "conteudo" },
        securityHero(),
        architecture(),
        latticeSection(),
        noTraceSection(),
        securityCta(),
      );
    } else if (route === "denunciar") {
      const body = viewSend(s);
      const active = s.step === "newsroom" || s.step === "compose";
      const stage = active
        ? h(
            "div",
            { className: "desk" },
            h("div", { className: "desk-main", "data-reveal": "" }, body),
            instruments(draftText.length),
          )
        : h("div", { className: "desk desk-single" }, h("div", { className: "desk-main" }, body));
      main = h(
        "main",
        { id: "conteudo" },
        denunciaHero(s),
        h(
          "div",
          { className: "denuncia-wrap" },
          reportSubnav("denunciar"),
          h("section", { className: "denuncia-stage", id: "enviar-denuncia" }, stage),
        ),
        receiptLinks(),
      );
    } else {
      const body = route === "respostas" ? viewReplies(s) : viewVerify(s);
      main = h(
        "main",
        { id: "conteudo" },
        hero(heroFor(s)),
        h(
          "div",
          { className: "denuncia-wrap is-center" },
          reportSubnav(route),
          h("div", { className: "flow flow-compact", id: "enviar-denuncia" }, body),
        ),
      );
    }

    const content = h(
      "div",
      { className: "page" },
      h("a", { className: "skip", href: "#conteudo" }, "Ir para o conteúdo"),
      route === "inicio" || route === "seguranca" ? scrollProgress() : null,
      topbar(),
      route === "inicio" ? chapterNav() : route === "seguranca" ? securityChapterNav() : null,
      main,
      footer(),
    );

    const previous = lastView;
    const previousRoute = previous.split(":")[0];
    const key = `${route}:${s.step}`;
    const changed = key !== lastView;
    if (changed) content.dataset.enter = "";
    lastView = key;

    disposeScrolly?.();
    disposeScrolly = null;
    root.replaceChildren(content);
    disposeScrolly = setupScrolly(root);

    if (pendingFocus) {
      pendingFocus = false;
      requestAnimationFrame(focusDesk);
    } else if (changed && previous) {
      if (route === previousRoute && route === "denunciar") {
        requestAnimationFrame(() => document.getElementById("enviar-denuncia")?.scrollIntoView({ behavior: "auto", block: "start" }));
      } else {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    }
  }

  window.addEventListener("hashchange", () => {
    const next = parseRoute();
    if (next === route) return;
    route = next;
    tab = route === "respostas" ? "respostas" : route === "verificar" ? "verificar" : "enviar";
    render(controller.state);
  });

  controller.subscribe(render);
  render(controller.state);
}

start().catch((e) => {
  document.getElementById("app")!.textContent = "Não foi possível iniciar a demonstração: " + (e instanceof Error ? e.message : String(e));
});
