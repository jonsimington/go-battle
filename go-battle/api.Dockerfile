FROM golang:1.19.10 as builder

WORKDIR /usr/src/app

RUN go install github.com/cosmtrek/air@latest

# copy application to container
COPY . ./

# install deps
RUN go mod tidy
