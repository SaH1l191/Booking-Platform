package router

import (
	"github.com/go-chi/chi"
)

type Router interface {
	Register(r chi.Router)
}

func SetupRouter() chi.Router {
	r := chi.NewRouter()
	return r
}
