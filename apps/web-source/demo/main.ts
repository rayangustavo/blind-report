// Demo local da interface da fonte, com backend SIMULADO.
// O `main` do repositório está com APIs divergentes entre pacotes e não compila;
// esta entrada exercita a UI/controller reais com respostas falsas em memória.
import { toBase64Url } from "@blind-report/core";
import { SourceError } from "@blind-report/source-client";
import { cancellable, createSourceController, type SourceState } from "../src/controller.ts";
import { download, h, readFileBytes, readFileText } from "../src/dom.ts";

type Tab = "enviar" | "respostas" | "verificar";
type IconName = "shield" | "lock" | "key" | "eyeOff" | "github" | "check" | "download" | "fingerprint" | "cube";

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
  );
}

function logoRow(): HTMLElement {
  return h("div", { className: "brand" }, logoMark(), h("span", {}, "Blind Report"));
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
  let tab: Tab = "enviar";
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
          h("span", { className: "flow-icon", "aria-hidden": "true" }, icon(node.icon)),
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

  function scrollCue(): HTMLElement {
    return h(
      "button",
      { className: "scroll-cue", "aria-label": "Ir para o formulário", onclick: () => document.querySelector(".panel")?.scrollIntoView({ behavior: "smooth", block: "center" }) },
      h("span", { className: "scroll-cue-arrow", "aria-hidden": "true" }, "↓"),
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

  function features(): HTMLElement {
    const cards = [
      { icon: "lock" as IconName, num: "01", title: "Criptografia de ponta a ponta", text: "O relato é selado com a chave pública da redação no seu aparelho. Nem o servidor de envio consegue ler.", tag: "Libsodium" },
      { icon: "eyeOff" as IconName, num: "02", title: "Anonimato por padrão", text: "Sem registro de IP, sem trackers e sem chamadas externas escondidas. A rede é restrita por política.", tag: "Rede restrita" },
      { icon: "fingerprint" as IconName, num: "03", title: "Prova de humanidade", text: "World ID bloqueia spam e ataques sem revelar quem você é: uma denúncia por pessoa, por época e por redação.", tag: "World ID" },
      { icon: "cube" as IconName, num: "04", title: "Custódia imutável", text: "A denúncia é registrada no Arkiv e a custódia é transferida para a redação — com trilha verificável.", tag: "Arkiv" },
    ];
    return h(
      "section",
      { className: "features", id: "como-funciona" },
      h(
        "header",
        { className: "section-head" },
        h("span", { className: "eyebrow" }, h("span", { className: "eyebrow-dot", "aria-hidden": "true" }), "Como funciona"),
        h("h2", {}, "Segurança não é promessa. É arquitetura."),
        h("p", { className: "muted" }, "Quatro camadas independentes protegem a fonte e garantem que a redação receba exatamente o que foi enviado."),
      ),
      h(
        "div",
        { className: "feature-grid" },
        ...cards.map((card) =>
          h(
            "article",
            { className: "feature-card" },
            h("div", { className: "feature-top" }, h("span", { className: "feature-icon" }, icon(card.icon)), h("span", { className: "feature-num" }, card.num)),
            h("h3", {}, card.title),
            h("p", {}, card.text),
            h("span", { className: "feature-tag" }, card.tag),
          ),
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

  let lastView = "";
  function render(s: SourceState) {
    const landing = tab === "enviar" && s.step === "newsroom";
    document.body.dataset.mode = tab;
    document.body.dataset.step = s.step;

    const tabs: [Tab, string][] = [
      ["enviar", "Enviar"],
      ["respostas", "Respostas"],
      ["verificar", "Verificar"],
    ];
    const header = h(
      "header",
      { className: "topbar" },
      h(
        "div",
        { className: "nav-shell" },
        logoRow(),
        h(
          "nav",
          { className: "nav-tabs", "aria-label": "Seções" },
          ...tabs.map(([id, label]) =>
            h(
              "button",
              {
                className: "nav-tab",
                "aria-current": tab === id ? "page" : undefined,
                onclick: () => {
                  tab = id;
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  render(controller.state);
                },
              },
              label,
            ),
          ),
        ),
        h("span", { className: "status-pill" }, h("span", { className: "pulse-dot", "aria-hidden": "true" }), "Demonstração"),
      ),
    );
    const body = tab === "enviar" ? viewSend(s) : tab === "respostas" ? viewReplies(s) : viewVerify(s);
    const content = h(
      "div",
      { className: "page" },
      h("a", { className: "skip", href: "#conteudo" }, "Ir para o conteúdo"),
      header,
      h(
        "main",
        { id: "conteudo" },
        hero(heroFor(s)),
        landing ? consolePreview() : null,
        landing ? scrollCue() : null,
        landing ? protocols() : null,
        body,
        landing ? features() : null,
      ),
      footer(),
    );

    const key = `${tab}:${s.step}`;
    if (key !== lastView) content.dataset.enter = "";
    lastView = key;
    root.replaceChildren(content);
  }

  controller.subscribe(render);
  render(controller.state);
}

start().catch((e) => {
  document.getElementById("app")!.textContent = "Não foi possível iniciar a demonstração: " + (e instanceof Error ? e.message : String(e));
});
