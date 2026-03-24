FROM golang:1.25.8-bookworm AS builder

WORKDIR /usr/src/app

RUN go install github.com/air-verse/air@v1.61.7

# Install base packages
RUN apt update && apt install -y curl cmake build-essential pkg-config libssl-dev

# Install Python 2.7 from Debian bullseye (removed in bookworm)
RUN echo "deb http://deb.debian.org/debian bullseye main" > /etc/apt/sources.list.d/bullseye.list \
    && apt update \
    && apt install -y python2.7 python2.7-dev \
    && rm /etc/apt/sources.list.d/bullseye.list \
    && apt update

# install node so we can run js clients
ENV NODE_VERSION=10.24.1
RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/master/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"
RUN node --version
RUN npm --version

# Configure npm to use Python 2.7
RUN npm config set python /usr/bin/python2.7

# copy application to container
COPY . ./

# install deps
RUN go mod tidy
