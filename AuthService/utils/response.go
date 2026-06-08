package utils

import (
    "encoding/json"
    "net/http"
    "goAuth/pkg/logger"
)

// WriteJSON sends a JSON response with the given status code.
func WriteJSON(w http.ResponseWriter, status int, payload interface{}) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    if err := json.NewEncoder(w).Encode(payload); err != nil {
        // fallback to plain text if JSON encoding fails
        http.Error(w, "Internal Server Error", http.StatusInternalServerError)
        logger.Log.Error("Failed to encode JSON response", "error", err)
    }
}

// ErrorResponse is the standard error envelope.
type ErrorResponse struct {
    Success bool   `json:"success"`
    Message string `json:"message"`
}

// SuccessResponse is the standard success envelope.
type SuccessResponse struct {
    Success bool        `json:"success"`
    Message string      `json:"message"`
    Data    interface{} `json:"data"`
}
