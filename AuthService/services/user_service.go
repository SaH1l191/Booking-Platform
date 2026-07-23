package services

import (
	"fmt"
	"github.com/golang-jwt/jwt/v5"
	"goAuth/config/env"
	db "goAuth/db/repositories"
	"goAuth/dto"
	"goAuth/models"
	"goAuth/pkg/logger"
	"goAuth/utils"
	"strconv"
	"time"
)

type UserService interface {
	GetUserById(id string) (*models.User, error)
	CreateUser(payload *dto.CreateUserRequestDTO) (*models.User, error)
	LoginUser(payload *dto.LoginUserRequestDTO) (dto.AuthTokens, error)
	GetUserByEmail(email string) (*models.User, error)
	DeleteUser(idStr string) error
	RefreshTokens(email string) (dto.AuthTokens, error)
	GetAllUsers() ([]*models.User, error)
}

type UserServiceImpl struct {
	userRepo db.UserRepository
}

func NewUserServiceImpl(userRepo db.UserRepository) UserService {
	return &UserServiceImpl{userRepo: userRepo}
}

func (u *UserServiceImpl) GetUserById(id string) (*models.User, error) {
	user, err := u.userRepo.GetByID(id)
	if err != nil {
		logger.Log.Error("Failed to fetch user by ID", "error", err, "userId", id)
		return nil, err
	}
	return user, nil
}

func (u *UserServiceImpl) CreateUser(payload *dto.CreateUserRequestDTO) (*models.User, error) {
	fmt.Println("Creating user in service", "email", payload.Email)
	hashedPass, err := utils.HashPassword(payload.Password)
	if err != nil {
		logger.Log.Error("Failed to hash password", "error", err)
		return nil, err
	}
	user, err := u.userRepo.Create(payload.Username, payload.Email, hashedPass)
	if err != nil {
		logger.Log.Error("Failed to create user", "error", err)
		return nil, err
	}
	return user, nil
}

func (u *UserServiceImpl) LoginUser(payload *dto.LoginUserRequestDTO) (dto.AuthTokens, error) {
	email := payload.Email
	password := payload.Password

	user, err := u.userRepo.GetByEmail(email)
	if err != nil {
		logger.Log.Error("Failed to fetch user by email", "error", err, "email", email)
		return dto.AuthTokens{}, err
	}
	if user == nil {
		logger.Log.Warn("No user found with email", "email", email)
		return dto.AuthTokens{}, fmt.Errorf("no user found with email: %s", email)
	}

	if !utils.CheckPasswordHash(password, user.Password) {
		logger.Log.Warn("Password does not match", "email", email)
		return dto.AuthTokens{}, fmt.Errorf("invalid password")
	}

	roles, err := u.userRepo.GetUserRoles(user.Id)
	if err != nil {
		logger.Log.Error("Failed to fetch user roles", "error", err, "userId", user.Id)
		return dto.AuthTokens{}, err
	}

	accessToken, err := u.generateAccessToken(user, roles)
	if err != nil {
		return dto.AuthTokens{}, err
	}
	refreshToken, err := u.generateRefreshToken(user)
	if err != nil {
		return dto.AuthTokens{}, err
	}

	return dto.AuthTokens{AccessToken: accessToken, RefreshToken: refreshToken}, nil
}


func (u *UserServiceImpl) generateAccessToken(user *models.User, roles []string) (string, error) {
	if roles == nil {
		roles = []string{}
	}
	claims := jwt.MapClaims{
		"email":    user.Email,
		"userId":   user.Id,
		"username": user.Username,
		"roles":    roles,
		"type":     "access",
		"exp":      time.Now().Add(15 * time.Minute).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(env.GetEnv("JWT_ACCESS_SECRET", "secret")))
}


func (u *UserServiceImpl) generateRefreshToken(user *models.User) (string, error) {
	claims := jwt.MapClaims{
		"email":    user.Email,
		"userId":   user.Id,
		"username": user.Username,
		"exp":      time.Now().Add(7 * 24 * time.Hour).Unix(),
		"type":     "refresh",
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(env.GetEnv("JWT_REFRESH_SECRET", "secret")))
}


func (u *UserServiceImpl) GetUserByEmail(email string) (*models.User, error) {
    return u.userRepo.GetByEmail(email)
}

func (u *UserServiceImpl) DeleteUser(idStr string) error {
    id, err := strconv.ParseInt(idStr, 10, 64)
    if err != nil {
        return fmt.Errorf("invalid user ID: %w", err)
    }
    return u.userRepo.DeleteByID(id)
}


func (u *UserServiceImpl) RefreshTokens(email string) (dto.AuthTokens, error) {
    user, err := u.userRepo.GetByEmail(email)
    if err != nil {
        return dto.AuthTokens{}, err
    }
    if user == nil {
        return dto.AuthTokens{}, fmt.Errorf("user not found for email: %s", email)
    }

    roles, err := u.userRepo.GetUserRoles(user.Id)
    if err != nil {
        return dto.AuthTokens{}, err
    }

    access, err := u.generateAccessToken(user, roles)
    if err != nil {
        return dto.AuthTokens{}, err
    }
    refresh, err := u.generateRefreshToken(user)
    if err != nil {
        return dto.AuthTokens{}, err
    }
    return dto.AuthTokens{AccessToken: access, RefreshToken: refresh}, nil
}

func (u *UserServiceImpl) GetAllUsers() ([]*models.User, error) {
    return u.userRepo.GetAll(0)
}
