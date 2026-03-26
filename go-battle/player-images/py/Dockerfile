FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        make \
    && rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
