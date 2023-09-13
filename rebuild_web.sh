#!/bin/bash
docker-compose stop web && cd go-battle-web/ && sudo rm -rf node_modules/ && npm i && npm run build --production && cd .. && docker-compose -f prod.docker-compose.yml build web && docker-compose -f prod.docker-compose.yml up -d
