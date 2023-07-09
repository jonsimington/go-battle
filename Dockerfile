FROM golang:latest as builder

# Download and install the latest release of dep
RUN go get github.com/golang/dep/cmd/dep

# Copy the code from the host and compile it
WORKDIR $GOPATH/src/github.com/jonsimington/go-battle

ADD Gopkg.toml Gopkg.toml
ADD Gopkg.lock Gopkg.lock

# install deps
RUN dep ensure --vendor-only

# copy application to container
COPY . ./

# build app
RUN GOOS=linux go run Server.go Match.go Player.go Game.go Client.go DB.go

FROM scratch
COPY --from=builder /app ./
ENTRYPOINT ["./app"]
