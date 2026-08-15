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
		FlushInterval: 100 * time.Millisecond,
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

			out.URL.Scheme = targetURL.Scheme
			out.URL.Host = targetURL.Host

			originalPath := in.URL.Path
			stripPrefix := strings.TrimPrefix(originalPath, pathPrefix)
			finalPath := "/" + strings.TrimPrefix(stripPrefix, "/")
			out.URL.Path = finalPath
			out.Host = targetURL.Host

			// Propagate Authorization header (from header or cookie)
			authHeader := in.Header.Get("Authorization")
			if authHeader == "" {
				if cookie, err := in.Cookie("access_token"); err == nil && cookie.Value != "" {
					authHeader = "Bearer " + cookie.Value
				}
			}
			if authHeader != "" {
				out.Header.Set("Authorization", authHeader)
			}

			// Request ID
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

			// spoofing prevenation
			out.Header.Del("X-User-ID")
			out.Header.Del("X-User-Email")
			out.Header.Del("X-User-Role")

			// 
			if uid := in.Context().Value("userID"); uid != nil {
				out.Header.Set("X-User-ID", fmt.Sprintf("%v", uid))
			}
			if email := in.Context().Value("email"); email != nil {
				out.Header.Set("X-User-Email", fmt.Sprintf("%v", email))
			}
			if roles := in.Context().Value("roles"); roles != nil {
				if roleList, ok := roles.([]string); ok && len(roleList) > 0 {
					out.Header.Set("X-User-Role", strings.Join(roleList, ","))
				}
			}
			out.Header.Del("Cookie")
		},
	}
	return proxy
}
