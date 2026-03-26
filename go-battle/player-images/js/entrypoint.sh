#!/bin/sh
set -e

git clone "$REPO_URL" /app
cd /app
make
node main.js "$GAME_TYPE" -s "$SERVER_HOST:$SERVER_PORT" -r "$GAME_SESSION"
