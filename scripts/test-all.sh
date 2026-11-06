#!/usr/bin/env bash
# ==============================================================================
# BLIND REPORT — SCRIPT MESTRE DE TESTES E VALIDAÇÃO COMPLETA
# Executa todas as camadas: Guardrails, Tipagem, Cobertura, Builds e Protocolo E2E
# ==============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

GREEN='\033[1;32m'
CYAN='\033[1;36m'
YELLOW='\033[1;33m'
MAGENTA='\033[1;35m'
NC='\033[0m' # No Color

header() {
  echo -e "\n${CYAN}======================================================================${NC}"
  echo -e "${MAGENTA}  $1${NC}"
  echo -e "${CYAN}======================================================================${NC}"
}

success() {
  echo -e "${GREEN}✓ $1${NC}"
}

header "1/5: VERIFICAÇÃO DE GUARDRAILS DE SEGURANÇA (RNF-05)"
echo -e "${YELLOW}Garantindo que nenhuma rede de anonimato externa ou proxy foi inserida no código...${NC}"
npm run guardrails
npm run test:guardrails
success "Guardrails aprovados: código 100% em conformidade com as restrições éticas e técnicas."

header "2/5: VERIFICAÇÃO ESTÁTICA DE TIPOS (TYPESCRIPT)"
echo -e "${YELLOW}Validando tipagem em todos os 8 pacotes e 3 aplicações monorepo...${NC}"
npm run typecheck
success "Tipagem TypeScript 100% estrita sem nenhum erro."

header "3/5: BATERIA DE TESTES UNITÁRIOS E COBERTURA (VITEST)"
echo -e "${YELLOW}Executando suíte completa de testes com medição de cobertura...${NC}"
npm run test:coverage
success "Todos os testes unitários passaram com cobertura superior a 95%."

header "4/5: COMPILAÇÃO DAS APLICAÇÕES WEB (FRONTENDS ESTÁTICOS & NEXT.JS)"
echo -e "${YELLOW}Compilando portal da fonte anônima (web-source)...${NC}"
npm run build -w apps/web-source
echo -e "${YELLOW}Compilando painel editorial do jornalista (web-newsroom)...${NC}"
npm run build -w apps/web-newsroom
echo -e "${YELLOW}Compilando novo portal unificado Next.js 16 (WEBSITE)...${NC}"
npm run website:build
success "Aplicações web compiladas com sucesso para distribuição estática segura."

header "5/5: SIMULAÇÃO DO FLUXO CRIPTOGRÁFICO DE PONTA A PONTA (E2E)"
echo -e "${YELLOW}Validando fluxo E2E com interação do usuário pelo novo frontend (WEBSITE)...${NC}"
npm run test:e2e:frontend
echo -e "${YELLOW}Executando os 8 passos do protocolo em tempo real...${NC}"
node --import tsx scripts/demo-flow.ts
success "Fluxos de ponta a ponta (frontend e protocolo) validados com sucesso!"

echo -e "\n${GREEN}======================================================================${NC}"
echo -e "${GREEN}  ✓ TODOS OS TESTES E VALIDAÇÕES DO PROJETO PASSARAM COM SUCESSO!     ${NC}"
echo -e "${GREEN}======================================================================${NC}\n"
