#!/bin/bash
# Libère le port 3000 si déjà occupé
fuser -k 3000/tcp 2>/dev/null

cd "$(dirname "$0")"
node server.js
