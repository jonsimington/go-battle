#!/bin/sh
set -e

git clone --recurse-submodules "$REPO_URL" /app
cd /app
make clean || true
make
./build/cpp-client "$GAME_TYPE" -s "$SERVER_HOST:$SERVER_PORT" -r "$GAME_SESSION"
