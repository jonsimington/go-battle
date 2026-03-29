#!/bin/bash
docker-compose -f prod.docker-compose.yml stop web viseur \
  && docker-compose -f prod.docker-compose.yml build web viseur \
  && docker-compose -f prod.docker-compose.yml up -d
