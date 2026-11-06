#!/usr/bin/env bash
# ==============================================================================
# BLIND REPORT — SERVIDORES LOCAIS DAS APLICAÇÕES WEB
# Inicia as interfaces da Fonte (whistleblower) e da Redação (jornalista)
# ==============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

GREEN='\033[1;32m'
CYAN='\033[1;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "\n${BOLD}${CYAN}======================================================================${NC}"
echo -e "${BOLD}${GREEN}           BLIND REPORT — SERVIDOR DE DESENVOLVIMENTO LOCAL           ${NC}"
echo -e "${BOLD}${CYAN}======================================================================${NC}\n"

echo -e "${YELLOW}Compilando as aplicações web estáticas...${NC}"
npm run build -w apps/web-source
npm run build -w apps/web-newsroom

echo -e "\n${GREEN}Iniciando servidores locais em 127.0.0.1 (com CSP rigorosa)...${NC}\n"

# Inicia servidor da fonte na porta 5173
node scripts/serve.mjs apps/web-source/dist 5173 &
PID_SOURCE=$!

# Inicia servidor da redação na porta 5174
node scripts/serve.mjs apps/web-newsroom/dist 5174 &
PID_NEWSROOM=$!

cleanup() {
  echo -e "\n${YELLOW}Encerrando servidores...${NC}"
  kill "$PID_SOURCE" "$PID_NEWSROOM" 2>/dev/null || true
  wait "$PID_SOURCE" "$PID_NEWSROOM" 2>/dev/null || true
  echo -e "${GREEN}Servidores finalizados.${NC}"
}

trap cleanup INT TERM EXIT

echo -e "${BOLD}Aplicações prontas para teste no navegador:${NC}"
echo -e "  • ${CYAN}Portal da Fonte (Whistleblower):${NC}    ${BOLD}http://127.0.0.1:5173${NC}"
echo -e "  • ${CYAN}Painel Editorial (Redação):${NC}         ${BOLD}http://127.0.0.1:5174${NC}"
echo -e "\nPressione ${YELLOW}Ctrl+C${NC} para encerrar os servidores.\n"

wait
