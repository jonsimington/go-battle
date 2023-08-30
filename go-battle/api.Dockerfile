FROM golang:1.19.10-bullseye as builder

WORKDIR /usr/src/app

RUN go install github.com/cosmtrek/air@latest

# install node so we can run js clients
ENV NODE_VERSION=10.24.1
RUN apt update
RUN apt install -y curl
RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/master/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"
RUN node --version
RUN npm --version

# copy application to container
COPY . ./

# install deps
RUN go mod tidy
