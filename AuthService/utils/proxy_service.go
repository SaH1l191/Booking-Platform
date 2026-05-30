package utils

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
)

func ProxyToService(targetBaseURL string, pathPrefix string) http.Handler {
	targetURL, err := url.Parse(targetBaseURL)

	if err != nil {
		fmt.Printf("Error parsing service URL: %v", err)
		return nil
	}
	fmt.Printf("Proxying to service at: %s\n", targetURL.String())
	proxy := httputil.NewSingleHostReverseProxy(targetURL)

	proxy.Rewrite = func(pr *httputil.ProxyRequest) {
		req := pr.Out
		req.URL.Scheme = targetURL.Scheme
		fmt.Printf("Request URL Scheme: %s\n", req.URL.Scheme)
		req.URL.Host = targetURL.Host
		fmt.Printf("Request URL Host: %s\n", req.URL.Host)
		originalPath := pr.In.URL.Path

		fmt.Printf("Original Path: %s\n", originalPath)

		stripPrefix := strings.TrimPrefix(originalPath, pathPrefix)
		req.URL.Path = targetURL.Path + stripPrefix
		fmt.Printf("Rewritten Path: %s\n", req.URL.Path)

		req.Host = targetURL.Host

		if userId, ok := pr.In.Context().Value("userId").(string); ok {
			req.Header.Set("X-User-ID", userId)
			fmt.Printf("Added X-User-ID header: %s\n", userId)
		}
	}
	return proxy
}
