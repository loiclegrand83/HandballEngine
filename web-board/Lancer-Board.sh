#!/bin/bash
cd "$(dirname "$0")"

# Si quelque chose occupe déjà le port 3000, on le libère
OLDPIDS=$(lsof -ti :3000 2>/dev/null)
if [ -n "$OLDPIDS" ]; then
  echo "Port 3000 occupé — arrêt des anciens processus..."
  echo "$OLDPIDS" | xargs kill 2>/dev/null
  sleep 1
fi

node server.js
