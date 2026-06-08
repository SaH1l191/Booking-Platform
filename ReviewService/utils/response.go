package utils

import (
	"ReviewService/pkg/logger"
	"encoding/json"
	"net/http"
)

func WriteJsonResponse(w http.ResponseWriter, statusCode int, data any) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	return json.NewEncoder(w).Encode(data)
}

func WriteJsonSuccessResponse(w http.ResponseWriter, status int, message string, data any) error {
	w.Header().Set("Content-Type", "application/json")
	response := map[string]any{}
	response["success"] = true
	response["message"] = message
	response["data"] = data
	return WriteJsonResponse(w, status, response)
}

func WriteJsonErrorResponse(w http.ResponseWriter, status int, message string, err error) error {
	response := map[string]any{}
	response["status"] = "error"
	response["message"] = message
	response["error"] = err.Error()
	return WriteJsonResponse(w, status, response)
}

func ReadJsonRequest(r *http.Request, result any) error {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	return decoder.Decode(result)
}
  

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


