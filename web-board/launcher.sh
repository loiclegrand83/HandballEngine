#!/bin/bash

# ════════════════════════════════════════════════════════════════
# Handball Engine Launcher
# Gère les PIDs orphelins et assure un arrêt propre
# ════════════════════════════════════════════════════════════════

PORT=3000
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_FILE="$SCRIPT_DIR/server.js"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour tuer les processus orphelins
cleanup_orphans() {
  echo -e "${YELLOW}🔍 Vérification des PIDs orphelins sur le port $PORT...${NC}"

  # Trouver tous les processus Node.js écoute sur le port 3000
  PIDS=$(lsof -ti:$PORT 2>/dev/null || echo "")

  if [ -n "$PIDS" ]; then
    echo -e "${YELLOW}⚠️  PIDs orphelins trouvés : $PIDS${NC}"
    for PID in $PIDS; do
      echo -e "${RED}   Arrêt du processus $PID...${NC}"
      kill -9 "$PID" 2>/dev/null || true
    done
    sleep 1
    echo -e "${GREEN}✓ Nettoyage effectué${NC}"
  else
    echo -e "${GREEN}✓ Aucun PID orphelin${NC}"
  fi
}

# Fonction d'arrêt propre
shutdown() {
  echo ""
  echo -e "${YELLOW}🛑 Arrêt en cours...${NC}"

  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    echo -e "${RED}   Fermeture du processus $SERVER_PID${NC}"
    kill "$SERVER_PID" 2>/dev/null

    # Attendre max 5 secondes
    for i in {1..5}; do
      if ! kill -0 "$SERVER_PID" 2>/dev/null; then
        break
      fi
      sleep 1
    done

    # Force kill si encore actif
    if kill -0 "$SERVER_PID" 2>/dev/null; then
      echo -e "${RED}   Force kill du processus $SERVER_PID${NC}"
      kill -9 "$SERVER_PID" 2>/dev/null || true
    fi
  fi

  echo -e "${GREEN}✓ Serveur arrêté${NC}"
  exit 0
}

# Trap Ctrl+C et autres signaux
trap shutdown SIGINT SIGTERM EXIT

# ────────────────────────────────────────────────────────────────
# LANCEMENT
# ────────────────────────────────────────────────────────────────

echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  🏐 Handball Engine${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Vérifier que Node.js est installé
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js n'est pas installé${NC}"
  exit 1
fi

# Nettoyer les orphelins
cleanup_orphans

# Vérifier que server.js existe
if [ ! -f "$SERVER_FILE" ]; then
  echo -e "${RED}❌ server.js introuvable à $SERVER_FILE${NC}"
  exit 1
fi

# Lancer le serveur
echo -e "${YELLOW}🚀 Lancement du serveur...${NC}"
cd "$SCRIPT_DIR"
node "$SERVER_FILE" &
SERVER_PID=$!

echo -e "${GREEN}✓ Serveur lancé (PID: $SERVER_PID)${NC}"
echo ""
echo -e "${GREEN}📍 Accès local : http://localhost:$PORT${NC}"
echo -e "${GREEN}📍 Accès réseau : http://$(hostname -I | awk '{print $1}'):$PORT${NC}"
echo ""
echo -e "${YELLOW}Appuyez sur Ctrl+C pour arrêter${NC}"
echo ""

# Garder le script actif
wait "$SERVER_PID" 2>/dev/null
