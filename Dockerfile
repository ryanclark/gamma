FROM golang:1.19 as base

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY main.go main.go
COPY cmd cmd
COPY internal internal

RUN go build -o gamma main.go

FROM gcr.io/distroless/base-debian10 as final

COPY --from=base /app/gamma /gamma

CMD ["/gamma", "deploy"]
