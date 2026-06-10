package metrics

import ( 
    "github.com/prometheus/client_golang/prometheus/promhttp"
    "net/http"
)

func MetricsHandler() http.Handler {
    return promhttp.Handler()
}