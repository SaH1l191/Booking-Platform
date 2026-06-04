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
		logger.Logger.Error("Error parsing service URL", "error", err)
		return nil
	}
	logger.Logger.Info("Setting up proxy to service", "targetURL", targetURL.String(), "pathPrefix", pathPrefix)

	proxy := &httputil.ReverseProxy{
		Rewrite: func(pr *httputil.ProxyRequest) {

			// ---------------------------
			// Incoming request (client → gateway)
			// ---------------------------
			in := pr.In
			out := pr.Out

			logger.Logger.Info("=== Proxy Request Start ===")

			logger.Logger.Info("Incoming request",
				"method", in.Method,
				"url", in.URL.String(),
				"path", in.URL.Path,
				"host", in.Host,
				"remoteAddr", in.RemoteAddr,
			)

			// ---------------------------
			// Outgoing request (gateway → service)
			// ---------------------------
			logger.Logger.Info("Outgoing request initial state",
				"method", out.Method,
				"url", out.URL.String(),
				"path", out.URL.Path,
			)

			// ---------------------------
			// Scheme & Host rewrite
			// ---------------------------
			logger.Logger.Info("Setting target URL",
				"scheme_before", out.URL.Scheme,
				"host_before", out.URL.Host,
				"target_scheme", targetURL.Scheme,
				"target_host", targetURL.Host,
			)

			out.URL.Scheme = targetURL.Scheme
			out.URL.Host = targetURL.Host

			logger.Logger.Info("Target URL applied",
				"scheme_after", out.URL.Scheme,
				"host_after", out.URL.Host,
			)

			// ---------------------------
			// Path rewrite
			// ---------------------------
			originalPath := in.URL.Path
			logger.Logger.Info("Path rewrite start",
				"original_path", originalPath,
				"path_prefix", pathPrefix,
			)

			stripPrefix := strings.TrimPrefix(originalPath, pathPrefix)

			logger.Logger.Info("After prefix stripping",
				"strip_prefix", stripPrefix,
			)

			finalPath := "/" + strings.TrimPrefix(stripPrefix, "/")

			// if targetURL.Path != "" && targetURL.Path != "/" {
			// 	finalPath = "/" + strings.TrimSuffix(targetURL.Path, "/") + finalPath
			// }

			out.URL.Path = finalPath

			logger.Logger.Info("Path rewrite complete",
				"final_path", out.URL.Path,
			)

			// ---------------------------
			// Host header
			// ---------------------------
			out.Host = targetURL.Host

			logger.Logger.Info("Host set",
				"host_header", out.Host,
			)

			// ---------------------------
			// Headers cleanup + propagation
			// ---------------------------
			out.Header.Del("x-user-id")

			userID, ok := in.Context().Value("userId").(string)
			if ok {
				out.Header.Set("x-user-id", userID)

				logger.Logger.Info("User ID propagated",
					"user_id", userID,
				)
			} else {
				logger.Logger.Info("No user ID found in context")
			}

			// ---------------------------
			// Final outgoing request summary
			// ---------------------------
			logger.Logger.Info("=== Proxy Request End ===",
				"final_method", out.Method,
				"final_url", out.URL.String(),
				"final_path", out.URL.Path,
				"final_host", out.Host,
			)
		},
	}
	return proxy
}
