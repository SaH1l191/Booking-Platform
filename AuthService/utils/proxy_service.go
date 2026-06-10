package utils

import (
	"goAuth/pkg/logger"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
)

func ProxyToService(targetBaseURL string, pathPrefix string) http.Handler {
	targetURL, err := url.Parse(targetBaseURL)

	if err != nil {
		logger.Log.Error("Error parsing service URL", "error", err)
		return nil
	}
	logger.Log.Info("Setting up proxy to service", "targetURL", targetURL.String(), "pathPrefix", pathPrefix)

	proxy := &httputil.ReverseProxy{
		Rewrite: func(pr *httputil.ProxyRequest) {

			// ---------------------------
			// Incoming request (client → gateway)
			// ---------------------------
			in := pr.In
			out := pr.Out

			logger.Log.Info("=== Proxy Request Start ===")

			logger.Log.Info("Incoming request",
				"method", in.Method,
				"url", in.URL.String(),
				"path", in.URL.Path,
				"host", in.Host,
				"remoteAddr", in.RemoteAddr,
			)

			// ---------------------------
			// Outgoing request (gateway → service)
			// ---------------------------
			logger.Log.Info("Outgoing request initial state",
				"method", out.Method,
				"url", out.URL.String(),
				"path", out.URL.Path,
			)

			// ---------------------------
			// Scheme & Host rewrite
			// ---------------------------
			out.URL.Scheme = targetURL.Scheme
			out.URL.Host = targetURL.Host

			// ---------------------------
			// Path rewrite
			// ---------------------------
			originalPath := in.URL.Path
			stripPrefix := strings.TrimPrefix(originalPath, pathPrefix)
			finalPath := "/" + strings.TrimPrefix(stripPrefix, "/")
			out.URL.Path = finalPath

			// ---------------------------
			// Host header
			// ---------------------------
			out.Host = targetURL.Host

			// ---------------------------
			// Authorization propagation
			// Priority: Authorization header > access_token cookie
			// ---------------------------
			authHeader := in.Header.Get("Authorization")
			if authHeader == "" {
				if cookie, err := in.Cookie("access_token"); err == nil && cookie.Value != "" {
					authHeader = "Bearer " + cookie.Value
				}
			}
			if authHeader != "" {
				out.Header.Set("Authorization", authHeader)
				logger.Log.Info("Authorization header propagated", "auth_header", authHeader)
			}
 
			out.Header.Del("Cookie")

			logger.Log.Info("=== Proxy Request End ===",
				"final_method", out.Method,
				"final_url", out.URL.String(),
				"final_path", out.URL.Path,
				"final_host", out.Host,
			)
		},
	}
	return proxy
}
