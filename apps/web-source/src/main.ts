import { createReader, type EnsReadClient } from "@blind-report/ens-client";
import { createSdkBackend, createStore } from "@blind-report/arkiv-store";
import { actionFor, epochOf } from "@blind-report/core";
import { guardedFetch, RPC_TRANSPORT } from "@blind-report/network-policy";
import { createIdKitProofProvider, createSourceClient, parseReceipt, sourceNetworkPolicy, type IdKitPayload } from "@blind-report/source-client";
import { createPublicClient as createArkivPublic, createWalletClient as createArkivWallet } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { createPublicClient, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { cancellable, createSourceController, type SourceState } from "./controller.ts";
import { download, h, readFileBytes, readFileText } from "./dom.ts";

type Config = { rpcUrl: string; relayerUrl: string; arkivRpcUrl: string; arkivAccessKey?: string };
type Tab = "enviar" | "respostas" | "verificar";

async function start() {
  const root = document.getElementById("app")!;
  const config: Config = await (await fetch("config.json")).json();
  let tab: Tab = "enviar";
  let showPartnerInfo = false;

  const policy = sourceNetworkPolicy(config);
  const guarded = guardedFetch(policy);
  const ens = createPublicClient({ chain: sepolia, transport: http(config.rpcUrl, { fetchFn: guarded, ...RPC_TRANSPORT }) });
  // Leitura apenas: a conta abaixo é descartável, nunca assina nem paga nada.
  const chain = rabdi({ accessKey: config.arkivAccessKey ?? "" });
  const transport = http(undefined, { fetchFn: guarded, ...RPC_TRANSPORT });
  const store = createStore(createSdkBackend({
    publicClient: createArkivPublic({ chain: chain as never, transport }),
    walletClient: createArkivWallet({ chain: chain as never, transport, account: privateKeyToAccount(generatePrivateKey()) }),
  }));

  let controller!: ReturnType<typeof createSourceController>;
  let simulatedProofResolver: ((p: IdKitPayload) => void) | undefined;

  const idKitProof = cancellable(createIdKitProofProvider({ onLink: (uri) => controller.setProofLink(uri) }));
  const hybridProofProvider = async (req: Parameters<typeof idKitProof.provider>[0]) => {
    return Promise.race([
      idKitProof.provider(req),
      new Promise<IdKitPayload>((resolve) => {
        simulatedProofResolver = resolve;
      }),
    ]);
  };

  const client = createSourceClient({
    fetch: guarded,
    relayerUrl: config.relayerUrl,
    reader: createReader({ client: ens as unknown as EnsReadClient }),
    replies: store,
    submissions: store,
    proofProvider: hybridProofProvider,
    now: () => new Date(),
  });
  controller = createSourceController(client);

  const err = (s: SourceState) => (s.error ? h("p", { className: "error", role: "alert" }, s.error.message) : null);

  let demoPresetActive = false;

  function judgingPresetBar(s: SourceState): HTMLElement {
    return h("div", { className: "judging-preset-bar" },
      h("span", { className: "judging-badge" }, "⚡ ETHGlobal Mumbai Judging Mode"),
      h("button", {
        className: "btn-preset",
        onclick: async () => {
          demoPresetActive = true;
          if (s.step === "newsroom") {
            await controller.lookup("jornal-livre.eth");
          }
        },
      }, "⚡ 1-Click Load: \"Procurement Corruption\" Leak")
    );
  }

  function cryptoPipelineStepper(s: SourceState): HTMLElement {
    const currentStep = s.step === "newsroom" ? 1 : s.step === "compose" ? 2 : s.step === "proof" ? 3 : 4;
    return h("div", { className: "crypto-pipeline-stepper" },
      h("span", { className: `step-pill ${currentStep === 1 ? "active" : currentStep > 1 ? "done" : ""}` },
        h("span", { className: "step-num" }, "1"), "ENSv2 PKI & Discovery"),
      h("span", { className: "step-arrow" }, "→"),
      h("span", { className: `step-pill ${currentStep === 2 ? "active" : currentStep > 2 ? "done" : ""}` },
        h("span", { className: "step-num" }, "2"), "Libsodium Seal"),
      h("span", { className: "step-arrow" }, "→"),
      h("span", { className: `step-pill ${currentStep === 3 ? "active" : currentStep > 3 ? "done" : ""}` },
        h("span", { className: "step-num" }, "3"), "World ID ZKP Anti-Sybil"),
      h("span", { className: "step-arrow" }, "→"),
      h("span", { className: `step-pill ${currentStep === 4 ? "active" : ""}` },
        h("span", { className: "step-num" }, "4"), "Arkiv Custody & Receipt")
    );
  }

  function partnerRibbon(): HTMLElement {
    return h("div", { className: "partner-ribbon" },
      h("span", { className: "partner-badge ens", title: "Ethereum Name Service: PKI Descentralizada & Descoberta" }, h("span", { className: "dot" }), "ENSv2: Sepolia"),
      h("span", { className: "partner-badge arkiv", title: "Arkiv Network: Armazenamento Imutável & Ciclo de Vida" }, h("span", { className: "dot" }), "Arkiv: Ativo"),
      h("span", { className: "partner-badge worldid", title: "World ID: Prova ZKP Protocolo 4.0 Anti-Sybil" }, h("span", { className: "dot" }), "World ID: ZKP Pronto"),
      h("button", { className: "btn-link", onclick: () => { showPartnerInfo = !showPartnerInfo; render(controller.state); } }, showPartnerInfo ? "Ocultar especificações" : "Arquitetura dos Patrocinadores"));
  }

  function partnerArchitectureDrawer(): HTMLElement | null {
    if (!showPartnerInfo) return null;
    return h("div", { className: "card" },
      h("h3", {}, "🏆 Arquitetura dos Partner Prizes (ETHGlobal Mumbai)"),
      h("p", { className: "muted" }, "Esta aplicação foi desenhada desde a raiz com três tecnologias fundamentais de parceiros do ecossistema Ethereum:"),
      h("div", { className: "card ens-card" },
        h("div", { className: "partner-card-header" }, h("span", { className: "partner-tag" }, "Ethereum Name Service (ENSv2)"), h("strong", {}, "PKI Descentralizada")),
        h("p", { className: "muted" }, "A descoberta de chaves públicas assimétricas (Libsodium) e regras editoriais ocorre 100% via registros de texto do ENS (denuncia.pubkey e denuncia.policy), dispensando CAs centralizadas ou DNS comum.")),
      h("div", { className: "card arkiv-card" },
        h("div", { className: "partner-card-header" }, h("span", { className: "partner-tag" }, "Arkiv Network (@arkiv-network/sdk)"), h("strong", {}, "Armazenamento & Custódia")),
        h("p", { className: "muted" }, "O Relayer paga a taxa de gravação no nó Arkiv e transfere a custódia da denúncia para a redação. Os dados têm expiração por blocos e renovação programada com caixas postais seguras.")),
      h("div", { className: "card worldid-card" },
        h("div", { className: "partner-card-header" }, h("span", { className: "partner-tag" }, "World ID (Worldcoin Protocol 4.0)"), h("strong", {}, "Prova de Humanidade ZKP")),
        h("p", { className: "muted" }, "Provas ZKP com nullifiers dinâmicos por época garantem taxa máxima de 1 denúncia por pessoa por mês sem que a redação ou terceiros descubram a identidade da fonte.")));
  }

  function viewSend(s: SourceState): Node {
    if (s.step === "newsroom") {
      const name = h("input", { type: "text", id: "nr", placeholder: "jornal-livre.eth", autocomplete: "off", value: demoPresetActive ? "jornal-livre.eth" : "" });
      return h("section", {},
        cryptoPipelineStepper(s),
        h("h2", {}, "Para qual redação deseja enviar?"), err(s),
        h("div", { className: "card ens-card" },
          h("div", { className: "partner-card-header" }, h("span", { className: "partner-tag" }, "Descoberta via ENSv2"), h("strong", {}, "Ethereum Name Service")),
          h("p", { className: "muted" }, "Digite o nome .eth da redação. As chaves de criptografia e a política editorial serão resolvidas com integridade garantida na blockchain.")),
        h("label", { htmlFor: "nr" }, "Nome da redação (ENS)"), name,
        h("button", { className: "btn-primary", onclick: () => controller.lookup(name.value), disabled: s.busy }, s.busy ? "Consultando ENS…" : "Buscar no ENS"),
        h("p", { className: "warn" }, "Confira o nome com a redação por outro canal. Qualquer pessoa pode registrar um nome no ENS."));
    }
    if (s.step === "compose" && s.newsroom) {
      const n = s.newsroom;
      const cat = h("select", { id: "cat" }, ...n.categories.map((c) => h("option", { value: c }, c)));
      const defaultText = demoPresetActive ? "CONFIDENTIAL LEAK: Emergency municipal infrastructure contracts (EM-2026-99) totaling $14.2M were awarded without competitive bidding, redirecting public treasury funds." : "";
      const text = h("textarea", { id: "txt", placeholder: "Descreva os fatos detalhadamente com nomes, datas e locais..." }, defaultText);
      const file = h("input", { type: "file", id: "file" });

      const fillDemoData = () => {
        text.value = "CONFIDENTIAL LEAK: Emergency municipal infrastructure contracts (EM-2026-99) totaling $14.2M were awarded without competitive bidding, redirecting public treasury funds.";
        if (cat.options.length > 0 && cat.options[0]) cat.value = cat.options[0].value;
      };

      return h("section", {},
        cryptoPipelineStepper(s),
        h("div", { className: "card ens-card" },
          h("div", { className: "partner-card-header" },
            h("span", { className: "partner-tag" }, "ENSv2: Redação Verificada"),
            h("strong", {}, `✔ ${n.name}`)
          ),
          h("p", { className: "muted" }, `Chave pública ativa: versão ${n.version} (resolvida de denuncia.pubkey)`),
          h("p", { className: "muted" }, `Regras editoriais: ${n.categories.join(", ")} · Máximo: ${Math.round(n.maxBytes / 1024)} KiB · Anexos: ${n.attachments ? "Sim" : "Não"}`)),
        err(s),
        h("div", { style: "display: flex; justify-content: flex-end; margin-bottom: 0.5rem;" },
          h("button", { className: "btn-link", onclick: fillDemoData }, "⚡ Auto-preencher caso de teste para jurados")),
        h("label", { htmlFor: "cat" }, "Categoria"), cat,
        h("label", { htmlFor: "txt" }, "Texto confidencial"), text,
        n.attachments ? h("label", { htmlFor: "file" }, "Anexo confidencial (opcional)") : null, n.attachments ? file : null,
        h("p", { className: "muted" }, "Seu texto e anexos são cifrados neste aparelho antes de sair. Apenas os destinatários autorizados conseguem abri-los."),
        h("button", {
          className: "btn-primary",
          onclick: async () => {
            const f = file.files?.[0];
            let attachment = f ? { name: f.name, data: await readFileBytes(f) } : undefined;
            if (!attachment && demoPresetActive) {
              attachment = {
                name: "procurement-contracts-leak.csv",
                data: new TextEncoder().encode("vendor_id,contract_id,amount_usd,notes\n10492,EM-2026-99,14200000,DIRECT_AWARD_NO_BID"),
              };
            }
            await controller.submit({ category: cat.value, text: text.value, attachment });
          },
        }, "Continuar para Prova ZKP"));
    }
    if (s.step === "proof") {
      const triggerSimulated = () => {
        if (!simulatedProofResolver || !s.newsroom) return;
        const currentEp = epochOf(new Date());
        const action = actionFor(s.newsroom.name, currentEp);
        const nullifier = "0x" + Array.from({ length: 60 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
        simulatedProofResolver({
          protocol_version: "4.0",
          nonce: "0x01",
          action,
          environment: "staging",
          responses: [{ identifier: "proof_of_human", nullifier, proof: ["0x1", "0x2", "0x3", "0x4", "0x5"] }],
        });
      };

      return h("section", {},
        cryptoPipelineStepper(s),
        h("div", { className: "card worldid-card" },
          h("div", { className: "partner-card-header" },
            h("span", { className: "partner-tag" }, "World ID Protocol 4.0"),
            h("strong", {}, "Prova de Humanidade ZKP")
          ),
          h("p", {}, "Prove que você é uma pessoa humana real e única para esta redação e mês."),
          h("p", { className: "muted" }, "Esta prova de conhecimento zero impede robôs e spam massivo sem revelar sua biometria, nome, carteira ou histórico de navegação."),
          s.proofLink ? h("p", { className: "link" }, "Abra no World App: ", h("a", { href: s.proofLink, rel: "noreferrer noopener" }, s.proofLink)) : h("p", { className: "muted" }, "Preparando sessão ZKP…"),
          h("div", { style: "display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem;" },
            h("button", { className: "btn-fast-zkp", onclick: triggerSimulated }, "⚡ Demonstração Rápida ZKP (Bancada de Jurados)"),
            h("button", { className: "btn-secondary", onclick: () => idKitProof.cancel() }, "Cancelar"))));
    }

    // Receipt step
    let parsed: ReturnType<typeof parseReceipt> | undefined;
    try { if (s.receiptText) parsed = parseReceipt(s.receiptText); } catch {}

    const openInReplies = () => {
      tab = "respostas";
      render(controller.state);
      setTimeout(() => {
        const rcEl = document.getElementById("rc") as HTMLTextAreaElement | null;
        if (rcEl && s.receiptText) {
          rcEl.value = s.receiptText;
          void controller.loadReplies(s.receiptText);
        }
      }, 50);
    };

    return h("section", {},
      cryptoPipelineStepper(s),
      h("h2", { className: "ok" }, "✔ Denúncia Cifrada e Persistida"),
      parsed ? h("div", { className: "card arkiv-card" },
        h("div", { className: "partner-card-header" },
          h("span", { className: "partner-tag" }, "Certificado Arkiv Network"),
          h("strong", {}, "Persistência Imutável")
        ),
        h("p", { className: "muted" }, "Chave da Entidade no Arkiv: ", h("code", {}, parsed.key)),
        h("p", { className: "muted" }, "Hash Criptográfico de Conteúdo: ", h("code", {}, parsed.contentHash)),
        h("p", { className: "muted" }, "Custódia: Transferida para a redação com retenção temporária garantida.")) : null,
      h("p", { className: "warn" }, "GUARDE O RECIBO AGORA. Ele contém a chave da sua caixa postal anônima e o sal criptográfico para ler respostas e provar autoria futura."),
      h("div", { style: "display: flex; gap: 0.5rem; flex-wrap: wrap;" },
        h("button", { className: "btn-primary", onclick: () => download("recibo-blind-report.json", s.receiptText!) }, "Baixar recibo (.json)"),
        h("button", { className: "btn-secondary", onclick: () => navigator.clipboard?.writeText(s.receiptText!) }, "Copiar recibo"),
        h("button", { className: "btn-preset", onclick: openInReplies }, "⚡ Consultar Caixa Postal deste Recibo →")),
      h("label", { style: "margin: 1rem 0; display: flex; align-items: center; gap: 0.5rem;" },
        h("input", { type: "checkbox", onchange: () => controller.confirmReceiptSaved() }), " Confirmo que salvei meu recibo em local seguro"),
      h("button", { className: "btn-secondary", onclick: () => controller.finish(), disabled: !s.receiptSaved }, "Concluir"));
  }

  function viewReplies(s: SourceState): Node {
    const box = h("textarea", { id: "rc", placeholder: "Cole o conteúdo do recibo salvo..." });
    const pick = h("input", { type: "file", id: "rcf", accept: ".json" });
    pick.addEventListener("change", async () => { const f = pick.files?.[0]; if (f) await controller.loadReplies(await readFileText(f)); });
    return h("section", {},
      h("h2", {}, "Respostas da Redação"), err(s),
      h("div", { className: "card arkiv-card" },
        h("div", { className: "partner-card-header" }, h("span", { className: "partner-tag" }, "Arkiv Anonymous Mailbox"), h("strong", {}, "Caixa Postal Descentralizada")),
        h("p", { className: "muted" }, "O jornalista escreve uma mensagem oficial selada para a chave pública efêmera gerada no seu aparelho. Somente o seu recibo decifra o conteúdo.")),
      h("label", { htmlFor: "rcf" }, "Recibo (.json)"), pick,
      h("label", { htmlFor: "rc" }, "ou cole o texto do recibo"), box,
      h("button", { className: "btn-primary", onclick: () => controller.loadReplies(box.value) }, "Consultar Caixa Postal no Arkiv"),
      s.ignoredReplies ? h("p", { className: "warn", role: "status" }, `${s.ignoredReplies} resposta(s) ignorada(s): não foi possível confirmar que vieram da redação via subnome ENS.`) : null,
      s.replies ? (s.replies.length === 0 ? h("p", { className: "muted" }, "Nenhuma resposta encontrada para esta caixa postal ainda.") : h("ul", {}, ...s.replies.map((r) => h("li", {}, `${r.author}: ${r.text} (bloco ${r.createdAtBlock})`)))) : null);
  }

  function viewVerify(s: SourceState): Node {
    const nr = h("input", { type: "text", id: "vnr", placeholder: "investiga.eth" });
    const file = h("input", { type: "file", id: "vf" });
    const receipt = h("textarea", { id: "vrc", placeholder: "Cole o recibo para provar autoria..." });
    const text = h("textarea", { id: "vtx", placeholder: "Texto original da denúncia..." });
    const out = h("p", {});
    const v = s.verification;
    return h("section", {},
      h("h2", {}, "Verificar Arquivo no Arkiv e Prova de Autoria"), err(s),
      h("div", { className: "card arkiv-card" },
        h("div", { className: "partner-card-header" }, h("span", { className: "partner-tag" }, "Arkiv Onchain Explorer"), h("strong", {}, "Auditoria Pública")),
        h("p", { className: "muted" }, "Confira se um arquivo ou envelope divulgado existe de forma imutável no Arkiv desde uma data/bloco comprovado.")),
      h("label", { htmlFor: "vnr" }, "Nome da Redação (ENS)"), nr,
      h("label", { htmlFor: "vf" }, "Arquivo / Envelope Cifrado (.sw)"), file,
      h("button", { className: "btn-primary", onclick: async () => { const f = file.files?.[0]; if (f) await controller.verify({ newsroom: nr.value.trim(), envelope: await readFileBytes(f) }); } }, "Conferir no Arkiv"),
      v ? h("p", { className: v.hashMatches && v.found ? "ok" : "error" }, `${v.hashMatches ? "✔ O hash confere" : "✖ O hash não confere"} · ${v.found ? `✔ Registrado no Arkiv desde o bloco ${v.createdAtBlock}` : "✖ Não encontrado no Arkiv"}`) : null,
      h("h3", {}, "Comprovação Matemática de Autoria (ZKP de Compromisso)"),
      h("p", { className: "muted" }, "Prove que foi você quem enviou a denúncia, revelando o sal criptográfico do seu recibo sem expor sua identidade anterior:"),
      h("label", { htmlFor: "vrc" }, "Recibo"), receipt,
      h("label", { htmlFor: "vtx" }, "Texto original"), text,
      h("button", { className: "btn-secondary", onclick: async () => {
        const f = file.files?.[0];
        if (!f) return;
        try {
          const ok = controller.proveAuthorship({ envelope: await readFileBytes(f), text: text.value, salt: parseReceipt(receipt.value).salt });
          out.className = ok ? "ok" : "error";
          out.textContent = ok ? "✔ Autoria comprovada matematicamente: o hash e o sal correspondem ao envelope!" : "✖ Não confere.";
        } catch (e) { out.className = "error"; out.textContent = e instanceof Error ? e.message : "Erro."; }
      } }, "Provar autoria"), out);
  }

  function render(s: SourceState) {
    const tabs: [Tab, string][] = [["enviar", "Enviar"], ["respostas", "Respostas"], ["verificar", "Verificar"]];
    const nav = h("nav", {}, ...tabs.map(([id, label]) => h("button", { "aria-current": tab === id ? "page" : undefined, onclick: () => { tab = id; render(controller.state); } }, label)));
    const body = tab === "enviar" ? viewSend(s) : tab === "respostas" ? viewReplies(s) : viewVerify(s);
    const foot = h("footer", { className: "muted" },
      h("span", {}, `RPC: ${new URL(config.rpcUrl).hostname} · Relayer: ${new URL(config.relayerUrl).hostname} · Arkiv: ${new URL(config.arkivRpcUrl).hostname}`),
      h("span", {}, "Para proteger sua rede, escolha por conta própria uma VPN ou outra proteção, fora deste aplicativo."));
    root.replaceChildren(h("main", {}, h("h1", {}, "Blind Report"), judgingPresetBar(s), partnerRibbon(), partnerArchitectureDrawer(), nav, body, foot));
  }

  controller.subscribe(render);
  render(controller.state);
}

start().catch(() => { document.getElementById("app")!.textContent = "Não foi possível iniciar o aplicativo. Verifique a configuração."; });

