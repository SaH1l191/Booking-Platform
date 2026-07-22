package utils

import (
	"crypto/rand"
	"fmt"
	"goAuth/pkg/logger"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"
)

func generateRequestID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

func ProxyToService(targetBaseURL string, pathPrefix string) http.Handler {
	targetURL, err := url.Parse(targetBaseURL)

	if err != nil {
		logger.Log.Error("Error parsing service URL", "error", err)
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "Service temporarily unavailable", http.StatusBadGateway)
		})
	}
	logger.Log.Info("Setting up proxy to service", "targetURL", targetURL.String(), "pathPrefix", pathPrefix)

	proxy := &httputil.ReverseProxy{
		Transport: &http.Transport{
			ResponseHeaderTimeout: 30 * time.Second,
			DialContext: (&net.Dialer{
				Timeout:   10 * time.Second,
				KeepAlive: 30 * time.Second,
			}).DialContext,
			TLSHandshakeTimeout:   10 * time.Second,
			ExpectContinueTimeout: 1 * time.Second,
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			logger.Log.Error("Proxy error", "error", err)
			http.Error(w, "Service temporarily unavailable", http.StatusBadGateway)
		},
		Rewrite: func(pr *httputil.ProxyRequest) {
			in := pr.In
			out := pr.Out

			fmt.Println("=== Proxy Request Start ===")
			fmt.Printf("Incoming request: method=%s url=%s path=%s host=%s remoteAddr=%s\n", in.Method, in.URL.String(), in.URL.Path, in.Host, in.RemoteAddr)
			fmt.Printf("Outgoing request initial state: method=%s url=%s path=%s\n", out.Method, out.URL.String(), out.URL.Path)

			out.URL.Scheme = targetURL.Scheme
			out.URL.Host = targetURL.Host

			originalPath := in.URL.Path
			fmt.Printf("Original request path: %s pathPrefix=%s\n", originalPath, pathPrefix)
			stripPrefix := strings.TrimPrefix(originalPath, pathPrefix)
			fmt.Printf("Stripped prefix from path: %s\n", stripPrefix)
			finalPath := "/" + strings.TrimPrefix(stripPrefix, "/")
			fmt.Printf("Final request path after rewrite: %s\n", finalPath)
			out.URL.Path = finalPath

			out.Host = targetURL.Host

			authHeader := in.Header.Get("Authorization")
			if authHeader == "" {
				if cookie, err := in.Cookie("access_token"); err == nil && cookie.Value != "" {
					authHeader = "Bearer " + cookie.Value
				}
			}
			if authHeader != "" {
				out.Header.Set("Authorization", authHeader)
				fmt.Printf("Authorization header propagated: %s\n", authHeader)
			}

			requestID := in.Header.Get("X-Request-ID")
			if requestID == "" {
				if rv := in.Context().Value("request_id"); rv != nil {
					requestID = rv.(string)
				}
			}
			if requestID == "" {
				requestID = generateRequestID()
			}
			out.Header.Set("X-Request-ID", requestID)

			out.Header.Set("X-Original-Path", originalPath)

			out.Header.Del("Cookie")

			fmt.Printf("=== Proxy Request End === method=%s url=%s path=%s host=%s\n", out.Method, out.URL.String(), out.URL.Path, out.Host)
		},
	}
	return proxy
}
