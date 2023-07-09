FROM golang:1.19.10 as builder

WORKDIR /usr/src/app

# copy application to container
COPY . ./

ADD go.mod go.mod
ADD go.sum go.sum

# install deps
RUN go mod tidy
