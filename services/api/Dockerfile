# Build context: services/api
FROM golang:1.27 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api

FROM gcr.io/distroless/static-debian13:nonroot
COPY --from=build /out/api /api
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["/api"]
