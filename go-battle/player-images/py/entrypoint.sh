#!/bin/sh
set -e

git clone "$REPO_URL" /app
cd /app
make
python3 main.py "$GAME_TYPE" -s "$SERVER_HOST:$SERVER_PORT" -r "$GAME_SESSION"
