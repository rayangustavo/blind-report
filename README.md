# Blind Report

> Canal de denúncia anônima para jornalismo investigativo combinando **ENSv2**, **Arkiv** e **World ID**.

## Visão Geral

O **Blind Report** é uma plataforma que permite a qualquer cidadão ou fonte enviar denúncias e documentos sigilosos para redações jornalísticas de forma comprovadamente segura, anônima e verificável:

- **Identidade e Descoberta via ENSv2**: Redações registram sua política e chaves públicas de cifragem em seus nomes `.eth`. Jornalistas recebem subnomes delegados (`jornalista.redacao.eth`).
- **Criptografia de Ponta a Ponta**: Envelopes assimétricos autenticados com Libsodium. Apenas os destinatários autorizados conseguem abrir os documentos.
- **Armazenamento Imutável no Arkiv**: Denúncias são persistidas como entidades imutáveis na rede Arkiv, com transferência de custódia para a redação.
- **Prevenção de Spam com World ID**: Prova de humanidade de conhecimento zero (ZKP) garantindo no máximo 1 denúncia por pessoa por período (época) por redação, sem revelar a identidade da fonte.
- **Privacidade Extrema**: Sem logs de IP, sem trackers, código estático sem chamadas externas ocultas e guardrails rígidos contra vazamento de rede.

## Estrutura do Monorepo

```
blind-report/
├── packages/
│   ├── core/            # Tipos de domínio, regras de época e limites
│   ├── crypto/          # Envelopes cifrados, mailbox e compromissos
│   ├── network-policy/  # Guardrails de rede, allowlist e CSP
│   ├── ens-client/      # Resolução e administração no ENSv2
│   ├── arkiv-store/     # Persistência e consultas no Arkiv
│   ├── worldid-gate/    # Verificação de ZKP e controle de nullifiers
│   ├── source-client/   # SDK da fonte (headless)
│   └── newsroom-client/ # SDK da redação (headless)
├── apps/
│   ├── relayer/         # Serviço HTTP de ingestão sem logs de IP
│   ├── web-source/      # Interface web da fonte (estática)
│   └── web-newsroom/    # Painel editorial da redação
└── tests/
    ├── contract/        # Testes de limites e regras arquiteturais
    └── e2e/             # Testes de ponta a ponta sem navegador
```

## Desenvolvimento

```bash
# Instalar dependências
npm install

# Executar guardrails de segurança
npm run guardrails

# Executar testes unitários
npm test

# Executar verificação de tipos
npm run typecheck

# Pipeline completo de CI local
npm run ci
```

## Licença

MIT
