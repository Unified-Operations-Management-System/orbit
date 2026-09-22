package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/api"
	"github.com/joho/godotenv"
)

type Server struct{}

var _ api.StrictServerInterface = (*Server)(nil)

func (s *Server) GetHello(ctx context.Context, req api.GetHelloRequestObject) (api.GetHelloResponseObject, error) {
	return api.GetHello200JSONResponse{Message: "Hello, Orbit!"}, nil
}

func main() {
	_ = godotenv.Load()

	mux := http.NewServeMux()
	api.HandlerFromMux(api.NewStrictHandler(&Server{}, nil), mux)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Orbit API listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}
