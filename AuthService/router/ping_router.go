package router

import (
	"net/http"

	"github.com/go-chi/chi"
)

type PingRouter struct {

}
func (ur *PingRouter) Register(chiRouter chi.Router) {
	chiRouter.Get("/ping", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Pong"))
	})
}