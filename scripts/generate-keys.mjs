#!/usr/bin/env node
/**
 * Utilitário de Tooling: Gerador de Chaves e Contas Ethereum (BIP-39 / BIP-44)
 * 
 * Uso:
 *   node scripts/generate-keys.mjs               (Gera 1 seed phrase de 12 palavras e 1 conta)
 *   node scripts/generate-keys.mjs -n 3          (Gera 1 seed phrase e deriva 3 contas)
 *   node scripts/generate-keys.mjs -w 24         (Gera seed phrase de 24 palavras)
 *   node scripts/generate-keys.mjs -p "seed..."  (Deriva contas a partir de uma seed existente)
 *   node scripts/generate-keys.mjs --raw         (Gera chaves privadas soltas, sem seed phrase)
 *   node scripts/generate-keys.mjs --json        (Exporta o resultado diretamente em formato JSON)
 */

import {
  english,
  generateMnemonic,
  generatePrivateKey,
  mnemonicToAccount,
  privateKeyToAccount,
} from "viem/accounts";

const args = process.argv.slice(2);

function getArg(flag, alias) {
  const idx = args.findIndex((a) => a === flag || a === alias);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith("-")) {
    return args[idx + 1];
  }
  return null;
}

const hasFlag = (flag, alias) => args.includes(flag) || (alias ? args.includes(alias) : false);

if (hasFlag("--help", "-h")) {
  console.log(`
Utilitário de Geração de Chaves e Contas Ethereum

USO:
  node scripts/generate-keys.mjs [opções]

OPÇÕES:
  -n, --count <número>     Quantidade de contas a derivar (padrão: 1)
  -w, --words <12|24>      Tamanho da seed phrase: 12 ou 24 palavras (padrão: 12)
  -p, --phrase "<frase>"   Seed phrase existente para derivar chaves
  -r, --raw                Gera chaves privadas avulsas (sem seed phrase)
  --json                   Imprime o resultado em formato JSON
  -h, --help               Exibe esta mensagem de ajuda
`);
  process.exit(0);
}

const isJson = hasFlag("--json");
const isRaw = hasFlag("--raw", "-r");
const count = Math.max(1, parseInt(getArg("--count", "-n") ?? "1", 10) || 1);
const wordsCount = parseInt(getArg("--words", "-w") ?? "12", 10) === 24 ? 24 : 12;
const inputPhrase = getArg("--phrase", "-p");

// Cores ANSI para formatação de terminal
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const MAGENTA = "\x1b[35m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

if (isRaw) {
  // Geração de chaves avulsas sem seed phrase
  const accounts = [];
  for (let i = 0; i < count; i++) {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    accounts.push({
      index: i,
      address: account.address,
      privateKey,
      publicKey: account.publicKey,
    });
  }

  if (isJson) {
    console.log(JSON.stringify({ type: "raw_keys", count, accounts }, null, 2));
    process.exit(0);
  }

  console.log(`\n${BOLD}${MAGENTA}======================================================================${RESET}`);
  console.log(`       CHAVES ETHEREUM AVULSAS GERADAS (SEM SEED PHRASE)             `);
  console.log(`${BOLD}${MAGENTA}======================================================================${RESET}\n`);

  accounts.forEach((acc, i) => {
    console.log(`${BOLD}${CYAN}Conta #${i + 1}${RESET}`);
    console.log(`  ${BOLD}Endereço (Address):${RESET}   ${GREEN}${acc.address}${RESET}`);
    console.log(`  ${BOLD}Chave Privada:${RESET}        ${YELLOW}${acc.privateKey}${RESET}`);
    console.log(`  ${BOLD}Chave Pública:${RESET}        ${DIM}${acc.publicKey}${RESET}\n`);
  });

  process.exit(0);
}

// Geração via Seed Phrase (BIP-39 / BIP-44)
const mnemonic = inputPhrase ?? generateMnemonic(english, wordsCount === 24 ? 256 : 128);

const accounts = [];
for (let i = 0; i < count; i++) {
  const account = mnemonicToAccount(mnemonic, { addressIndex: i });
  const hdKey = account.getHdKey();
  const privateKey = `0x${Buffer.from(hdKey.privateKey).toString("hex")}`;
  const derivationPath = `m/44'/60'/0'/0/${i}`;

  accounts.push({
    index: i,
    derivationPath,
    address: account.address,
    privateKey,
    publicKey: account.publicKey,
  });
}

if (isJson) {
  console.log(
    JSON.stringify(
      {
        mnemonic,
        wordCount: mnemonic.split(" ").length,
        derivationStandard: "BIP-44 (m/44'/60'/0'/0/i)",
        accounts,
      },
      null,
      2
    )
  );
  process.exit(0);
}

console.log(`\n${BOLD}${MAGENTA}======================================================================${RESET}`);
console.log(`       GERADOR DE SEED PHRASE E CHAVES ETHEREUM (BIP-39 / BIP-44)     `);
console.log(`${BOLD}${MAGENTA}======================================================================${RESET}\n`);

console.log(`${BOLD}${CYAN}Seed Phrase (Mnemonic - ${mnemonic.split(" ").length} palavras):${RESET}`);
console.log(`  ${BOLD}${GREEN}${mnemonic}${RESET}\n`);

console.log(`${DIM}Padrão de Derivação: m/44'/60'/0'/0/index (Ethereum Padrão BIP-44)${RESET}\n`);

accounts.forEach((acc) => {
  console.log(`${BOLD}${CYAN}Conta #${acc.index} ${DIM}[path: ${acc.derivationPath}]${RESET}`);
  console.log(`  ${BOLD}Endereço (Address):${RESET}   ${GREEN}${acc.address}${RESET}`);
  console.log(`  ${BOLD}Chave Privada:${RESET}        ${YELLOW}${acc.privateKey}${RESET}`);
  console.log(`  ${BOLD}Chave Pública:${RESET}        ${DIM}${acc.publicKey}${RESET}\n`);
});

console.log(`${BOLD}${RED}⚠️  ATENÇÃO (AVISO DE SEGURANÇA):${RESET}`);
console.log(`Essas chaves foram geradas para fins de teste e desenvolvimento local.`);
console.log(`Nunca envie fundos reais da Mainnet para chaves geradas em terminais compartilhados.\n`);
