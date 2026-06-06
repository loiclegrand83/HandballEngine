#!/bin/bash
cd "$(dirname "$0")"

# Si quelque chose occupe déjà le port 3000, on le libère
OLDPID=$(lsof -ti :3000 2>/dev/null)
if [ -n "$OLDPID" ]; then
  echo "Port 3000 occupé (PID $OLDPID) — arrêt de l'ancien processus..."
  kill "$OLDPID" 2>/dev/null
  sleep 1
fi

node server.js
