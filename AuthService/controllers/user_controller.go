package controllers

import (
	"fmt"
	"goAuth/dto"
	"goAuth/services"
	"goAuth/utils"
	"net/http"

	"github.com/go-chi/chi"
	"github.com/golang-jwt/jwt/v5"
	env "goAuth/config/env"
)

type UserController struct {
	UserService services.UserServiceImpl
}

func NewUserController(userService services.UserServiceImpl) *UserController {
	return &UserController{UserService: userService}
}

func (uc *UserController) CreateUser(w http.ResponseWriter, r *http.Request) {

	payload := r.Context().Value("payload").(dto.CreateUserRequestDTO)
	fmt.Println("payload in controller ", payload)

	user, err := uc.UserService.CreateUser(&payload)
	if err != nil {
		utils.WriteJsonErrorResponse(w, http.StatusInternalServerError, "Failed to create User", err)
		return
	}

	utils.WriteJsonSuccessResponse(w, http.StatusCreated, "User created successfully", user)
}

func (uc *UserController) GetUserByID(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Fetching user by id ")
	userId := chi.URLParam(r, "id")
	fmt.Println("User id in controller ", userId)

	if userId == "" {
		utils.WriteJsonErrorResponse(w, http.StatusBadRequest, "USER ID is required", fmt.Errorf("missing user ID"))
		return
	}

	user, err := uc.UserService.GetUserById(userId)
	if err != nil {
		utils.WriteJsonErrorResponse(w, http.StatusInternalServerError, "Failed to fetch User", err)
		return
	}

	if user == nil {
		utils.WriteJsonErrorResponse(w, http.StatusNotFound, "User not found", fmt.Errorf("user not found: %s", userId))
		return
	}

	utils.WriteJsonSuccessResponse(w, http.StatusOK, "User fetched successfully", user)
	fmt.Println("User fetched in controller ", user)
}

func (uc *UserController) LoginUser(w http.ResponseWriter, r *http.Request) {
	payload := r.Context().Value("payload").(dto.LoginUserRequestDTO)
	fmt.Println("Payload received:", payload)

	tokens, err := uc.UserService.LoginUser(&payload)
	if err != nil {
		utils.WriteJsonErrorResponse(w, http.StatusInternalServerError, "Failed to login user", err)
		return
	}

	utils.SetAuthCookies(w, tokens.AccessToken, tokens.RefreshToken)

	utils.WriteJsonSuccessResponse(w, http.StatusOK, "User logged in successfully", tokens)
}

func (uc *UserController) DeleteUser(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Fetching user by id ")
	userId := chi.URLParam(r, "id")
	fmt.Println("User id in controller ", userId)

	if userId == "" {
		utils.WriteJsonErrorResponse(w, http.StatusBadRequest, "USER ID is required", fmt.Errorf("missing user ID"))
		return
	}

	err := uc.UserService.DeleteUser(userId)
	if err != nil {
		utils.WriteJsonErrorResponse(w, http.StatusInternalServerError, "Failed to delete User", err)
		return
	}

	utils.WriteJsonSuccessResponse(w, http.StatusOK, "User deleted successfully", nil)
	fmt.Println("User deleted in controller ", userId)
}

func (uc *UserController) RefreshToken(w http.ResponseWriter, r *http.Request) {
	
	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		utils.WriteJsonErrorResponse(w, http.StatusUnauthorized, "Refresh token missing", err)
		return
	}
	tokenString := cookie.Value

	claims := jwt.MapClaims{}
	_, err = jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(env.GetEnv("JWT_REFRESH_SECRET", "refresh_secret")), nil
	})
	if err != nil {
		utils.WriteJsonErrorResponse(w, http.StatusUnauthorized, "Invalid refresh token", err)
		return
	}

	// Ensure token type is refresh if set
	if typ, ok := claims["type"].(string); ok && typ != "refresh" {
		utils.WriteJsonErrorResponse(w, http.StatusUnauthorized, "Invalid token type", fmt.Errorf("expected refresh token"))
		return
	}

	email, _ := claims["email"].(string)
	if email == "" {
		utils.WriteJsonErrorResponse(w, http.StatusUnauthorized, "Email claim missing", fmt.Errorf("invalid token"))
		return
	}

	user, err := uc.UserService.GetUserByEmail(email)
	if err != nil || user == nil {
		utils.WriteJsonErrorResponse(w, http.StatusUnauthorized, "User not found", fmt.Errorf("invalid user"))
		return
	}

	newTokens, err := uc.UserService.RefreshTokens(email)
	if err != nil {
		utils.WriteJsonErrorResponse(w, http.StatusInternalServerError, "Failed to refresh tokens", err)
		return
	}

	utils.SetAuthCookies(w, newTokens.AccessToken, newTokens.RefreshToken)

	utils.WriteJsonSuccessResponse(w, http.StatusOK, "Token refreshed successfully", newTokens)
}

func (uc *UserController) GetAllUsers(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Fetching all users")
	users, err := uc.UserService.GetAllUsers()
	if err != nil {
		utils.WriteJsonErrorResponse(w, http.StatusInternalServerError, "Failed to fetch users", err)
		return
	}

	utils.WriteJsonSuccessResponse(w, http.StatusOK, "Users fetched successfully", users)
	fmt.Println("Users fetched in controller ", users)
}
