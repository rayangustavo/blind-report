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

PORT="${PORT:-3000}"
HOST="${HOST:-0.0.0.0}"

if ps -ef | grep -E 'WEBSITE/node_modules/.bin/next dev|next-server .*WEBSITE' | grep -v grep >/dev/null 2>&1; then
  echo -e "${YELLOW}Servidor Next.js antigo detectado. Reiniciando o processo do portal web...${NC}"
  pkill -f 'WEBSITE/node_modules/.bin/next dev' || true
  pkill -f 'next-server.*WEBSITE' || true
fi

RELAYER_PORT="${RELAYER_PORT:-8787}"

if ! curl -sf "http://127.0.0.1:${RELAYER_PORT}/health" >/dev/null 2>&1; then
  echo -e "${YELLOW}Iniciando backend Relayer na porta ${RELAYER_PORT}...${NC}"
  node --env-file=.env --import tsx apps/relayer/src/main.ts >/dev/null 2>&1 &
  RELAYER_PID=$!
  trap 'kill $RELAYER_PID 2>/dev/null || true' EXIT INT TERM
else
  echo -e "${GREEN}Backend Relayer já ativo na porta ${RELAYER_PORT}.${NC}"
fi

echo -e "${YELLOW}Iniciando portal unificado Next.js 16 (WEBSITE)...${NC}"
echo -e "${BOLD}Serviços prontos para uso no navegador:${NC}"
echo -e "  • ${CYAN}Blind Report (Denúncia & Redação):${NC}    ${BOLD}http://127.0.0.1:${PORT}${NC}"
echo -e "  • ${CYAN}Relayer Backend (Arkiv & World ID):${NC}  ${BOLD}http://127.0.0.1:${RELAYER_PORT}${NC}"
echo -e "\nPressione ${YELLOW}Ctrl+C${NC} para encerrar o servidor.\n"

npm --prefix WEBSITE run dev -- --hostname "$HOST" --port "$PORT" "$@"
