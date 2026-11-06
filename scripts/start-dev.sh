#!/usr/bin/env bash
# ==============================================================================
# BLIND REPORT — SERVIDOR DE DESENVOLVIMENTO LOCAL (NEXT.JS 16)
# Inicia o portal web unificado (Whistleblower & Editorial Desk)
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

echo -e "${YELLOW}Iniciando portal unificado Next.js 16 (WEBSITE)...${NC}"
echo -e "${BOLD}Portal pronto para uso no navegador:${NC}"
echo -e "  • ${CYAN}Blind Report (Denúncia & Redação):${NC}    ${BOLD}http://127.0.0.1:3000${NC}"
echo -e "\nPressione ${YELLOW}Ctrl+C${NC} para encerrar o servidor.\n"

exec npm --prefix WEBSITE run dev
