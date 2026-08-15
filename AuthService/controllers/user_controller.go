package controllers

import (
	"fmt"
	env "goAuth/config/env"
	"goAuth/dto"
	"goAuth/pkg/logger"
	"goAuth/services"
	"goAuth/utils"
	"net/http"
	"strings"

	"github.com/go-chi/chi"
	"github.com/golang-jwt/jwt/v5"
)

type UserController struct {
	UserService services.UserService
}

func NewUserController(userService services.UserService) *UserController {
	return &UserController{UserService: userService}
}

func (uc *UserController) CreateUser(w http.ResponseWriter, r *http.Request) {

	payload, ok := r.Context().Value("payload").(dto.CreateUserRequestDTO)
	if !ok {
		utils.WriteJsonErrorResponse(w, http.StatusBadRequest, "Invalid request payload", fmt.Errorf("invalid payload type"))
		return
	}
	fmt.Println("Creating user", "username", payload.Username, "email", payload.Email)

	user, err := uc.UserService.CreateUser(&payload)
	if err != nil {
		utils.WriteJsonErrorResponse(w, http.StatusInternalServerError, "Failed to create User", err)
		return
	}

	tokens, err := uc.UserService.LoginUser(&dto.LoginUserRequestDTO{Email: payload.Email, Password: payload.Password})
	if err != nil {
		utils.WriteJsonSuccessResponse(w, http.StatusCreated, "User created successfully", user)
		return
	}

	utils.SetAuthCookies(r, w, tokens.AccessToken, tokens.RefreshToken)

	roles, _ := uc.UserService.GetUserRoles(user.Id)
	if roles == nil {
		roles = []string{}
	}

	utils.WriteJsonSuccessResponse(w, http.StatusCreated, "User created successfully", map[string]interface{}{
		"user":          map[string]interface{}{"id": user.Id, "username": user.Username, "email": user.Email, "roles": roles, "createdAt": user.CreatedAt, "updatedAt": user.UpdatedAt},
		"accessToken":   tokens.AccessToken,
		"refreshToken":  tokens.RefreshToken,
	})
}

func (uc *UserController) GetUserByID(w http.ResponseWriter, r *http.Request) {
	userId := chi.URLParam(r, "id")
	fmt.Println("Fetching user by ID", "userId", userId)

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
	fmt.Println("User fetched successfully", "userId", userId)
}

func (uc *UserController) LoginUser(w http.ResponseWriter, r *http.Request) {
	payload, ok := r.Context().Value("payload").(dto.LoginUserRequestDTO)
	if !ok {
		utils.WriteJsonErrorResponse(w, http.StatusBadRequest, "Invalid request payload", fmt.Errorf("invalid payload type"))
		return
	}
	logger.Log.Info("Login attempt", "email", payload.Email)

	tokens, err := uc.UserService.LoginUser(&payload)
	if err != nil {
		utils.WriteJsonErrorResponse(w, http.StatusInternalServerError, "Failed to login user", err)
		return
	}
	logger.Log.Info("Login successful", "email", payload.Email)

	user, _ := uc.UserService.GetUserByEmail(strings.TrimSpace(strings.ToLower(payload.Email)))

	utils.SetAuthCookies(r, w, tokens.AccessToken, tokens.RefreshToken)

	userData := map[string]interface{}{}
	if user != nil {
		roles, _ := uc.UserService.GetUserRoles(user.Id)
		if roles == nil {
			roles = []string{}
		}
		userData = map[string]interface{}{"id": user.Id, "username": user.Username, "email": user.Email, "roles": roles, "createdAt": user.CreatedAt, "updatedAt": user.UpdatedAt}
	}

	utils.WriteJsonSuccessResponse(w, http.StatusOK, "User logged in successfully", map[string]interface{}{
		"user":          userData,
		"accessToken":   tokens.AccessToken,
		"refreshToken":  tokens.RefreshToken,
	})
}

func (uc *UserController) DeleteUser(w http.ResponseWriter, r *http.Request) {
	userId := chi.URLParam(r, "id")
	fmt.Println("Deleting user", "userId", userId)

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
	fmt.Println("User deleted successfully", "userId", userId)
}

func (uc *UserController) RefreshToken(w http.ResponseWriter, r *http.Request) {

	tokenString := ""

	if authHeader := r.Header.Get("Authorization"); strings.HasPrefix(authHeader, "Bearer ") {
		tokenString = strings.TrimPrefix(authHeader, "Bearer ")
	}

	if tokenString == "" {
		if cookie, err := r.Cookie("refresh_token"); err == nil {
			tokenString = cookie.Value
		}
	}

	tokenString = strings.TrimSpace(tokenString)
	if tokenString == "" {
		utils.WriteJsonErrorResponse(w, http.StatusUnauthorized, "Refresh token missing", fmt.Errorf("no refresh token provided"))
		return
	}

	claims := jwt.MapClaims{}
	_, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(env.GetEnv("JWT_REFRESH_SECRET")), nil
	})
	if err != nil {
		utils.WriteJsonErrorResponse(w, http.StatusUnauthorized, "Invalid refresh token", err)
		return
	}
	fmt.Println("claims", claims)

	typ, ok := claims["type"].(string)
	if !ok || typ != "refresh" {
		utils.WriteJsonErrorResponse(w, http.StatusUnauthorized, "Invalid token type", fmt.Errorf("expected refresh token"))
		return
	}

	email, _ := claims["email"].(string)
	if email == "" {
		utils.WriteJsonErrorResponse(w, http.StatusUnauthorized, "Email claim missing", fmt.Errorf("invalid token"))
		return
	}

	email = strings.TrimSpace(strings.ToLower(email))
	logger.Log.Info("Refreshing token", "email", email)

	//additional guard to check if user still exists before refreshing tokens
	user, err := uc.UserService.GetUserByEmail(email)
	if err != nil || user == nil {
		logger.Log.Error("User not found during token refresh", "error", err, "email", email)
		utils.WriteJsonErrorResponse(w, http.StatusUnauthorized, "User not found", fmt.Errorf("invalid user"))
		return
	}

	newTokens, err := uc.UserService.RefreshTokens(email)
	if err != nil {
		utils.WriteJsonErrorResponse(w, http.StatusInternalServerError, "Failed to refresh tokens", err)
		return
	}

	utils.SetAuthCookies(r, w, newTokens.AccessToken, newTokens.RefreshToken)

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
	fmt.Println("Users fetched successfully", "count", len(users))
}

func (uc *UserController) LogoutUser(w http.ResponseWriter, r *http.Request) {
	utils.ClearAuthCookies(w)

	utils.WriteJsonSuccessResponse(w, http.StatusOK, "User logged out successfully", nil)
	fmt.Println("User logged out successfully")
}
