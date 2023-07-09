FROM golang:1.19.10 as builder

WORKDIR /usr/src/app

# copy application to container
COPY . ./

# install deps
RUN go mod tidy
