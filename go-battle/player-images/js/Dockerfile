FROM node:10-alpine

RUN apk add --no-cache git make python2 g++

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
