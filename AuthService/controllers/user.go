package controllers

import (
	"encoding/json"
	"fmt"
	"goAuth/dto"
	"goAuth/services"
	"net/http"

	"github.com/go-chi/chi"
)

type UserController struct {
	UserService services.UserServiceImpl
}

func NewUserController(userService services.UserServiceImpl) *UserController {
	return &UserController{UserService: userService}
}

func (uc *UserController) CreateUser(w http.ResponseWriter, r *http.Request) {

	var payload dto.CreateUserRequestDTO 
	err := json.NewDecoder(r.Body).Decode(&payload)
	if err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	fmt.Println("payload in controller ", payload)
	user, err := uc.UserService.CreateUser(&payload)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]any{
			"status":  "error",
			"message": "Failed to create User",
			"error":   err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]any{
		"status":  "success",
		"message": "User created successfully",
		"data":    user,
	})
	fmt.Println("User created in controller ", user)
}

func (uc *UserController) GetUserByID(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Fetching user by id ")
	userId := chi.URLParam(r,"id")

	if userId == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]any{
			"status":  "error",
			"message": "User ID is required",
		})
		return
	}

	user, err := uc.UserService.GetUserById(userId)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]any{
			"status":  "error",
			"message": "Failed to fetch User",
			"error":   err.Error(),
		})
		return
	}

	if user == nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]any{
			"status":  "error",
			"message": "User not found",
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]any{
		"status":  "success",
		"message": "User fetched successfully",
		"data":    user,
	})
	fmt.Println("User fetched in controller ", user)
}

func (uc *UserController) LoginUser(w http.ResponseWriter, r *http.Request) {

	payload := dto.LoginUserRequestDTO{} 
	err := json.NewDecoder(r.Body).Decode(&payload)
	if err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	fmt.Println("logging in user....")  

	jwtToken, err := uc.UserService.LoginUser(&payload)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]any{
			"status":  "error",
			"message": "Failed to login User",
			"error":   err.Error(),
		})
		return
	}
	if jwtToken == "" {
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}


	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]any{
		"status":  "success",
		"message": "User logged in successfully",
		"data":    jwtToken,
	})
	fmt.Println("User logged in in controller ", jwtToken)
}
