FROM golang:1.24.2-bullseye AS builder

WORKDIR /usr/src/app

RUN go install github.com/air-verse/air@v1.61.7

# Install Python 2.7 from Debian bullseye
RUN apt update
RUN apt install -y curl cmake build-essential python2.7 python2.7-dev pkg-config libssl-dev

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
