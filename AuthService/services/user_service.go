package services

import (
	"fmt"
	"github.com/golang-jwt/jwt/v5"
	"goAuth/config/env"
	db "goAuth/db/repositories"
	"goAuth/dto"
	"goAuth/models"
	"goAuth/utils"
	"strconv"
	"time"
)

type UserServiceImpl struct {
	userRepo db.UserRepository
}

func NewUserServiceImpl(userRepo db.UserRepository) UserServiceImpl {
	return UserServiceImpl{userRepo: userRepo}
}

func (u *UserServiceImpl) GetUserById(id string) (*models.User, error) {
	user, err := u.userRepo.GetByID(id)
	if err != nil {
		fmt.Printf("Error fetching user by ID: %v\n", err)
		return nil, err
	}
	return user, nil
}

func (u *UserServiceImpl) CreateUser(payload *dto.CreateUserRequestDTO) (*models.User, error) {
	fmt.Println("Creating user in userservice")
	hashedPass, err := utils.HashPassword(payload.Password)
	if err != nil {
		fmt.Printf("Error hashing password: %v\n", err)
		return nil, err
	}
	user, err := u.userRepo.Create(payload.Username, payload.Email, hashedPass)
	if err != nil {
		fmt.Printf("Error creating user: %v\n", err)
		return nil, err
	}
	return user, nil
}

func (u *UserServiceImpl) LoginUser(payload *dto.LoginUserRequestDTO) (dto.AuthTokens, error) {
	email := payload.Email
	password := payload.Password

	user, err := u.userRepo.GetByEmail(email)
	if err != nil {
		fmt.Println("Error fetching user by email:", err)
		return dto.AuthTokens{}, err
	}
	if user == nil {
		fmt.Println("No user found with the given email")
		return dto.AuthTokens{}, fmt.Errorf("no user found with email: %s", email)
	}

	if !utils.CheckPasswordHash(password, user.Password) {
		fmt.Println("Password does not match")
		return dto.AuthTokens{}, fmt.Errorf("invalid password")
	}

	accessToken, err := u.generateAccessToken(user)
	if err != nil {
		return dto.AuthTokens{}, err
	}
	refreshToken, err := u.generateRefreshToken(user)
	if err != nil {
		return dto.AuthTokens{}, err
	}

	return dto.AuthTokens{AccessToken: accessToken, RefreshToken: refreshToken}, nil
}


func (u *UserServiceImpl) generateAccessToken(user *models.User) (string, error) {
	claims := jwt.MapClaims{
		"email":    user.Email,
		"userId": user.Id,
		"username": user.Username,
		"type":     "access",
		"exp":      time.Now().Add(15 * time.Minute).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(env.GetEnv("JWT_SECRET", "secret")))
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
	return token.SignedString([]byte(env.GetEnv("JWT_REFRESH_SECRET", "refresh_secret")))
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
    access, err := u.generateAccessToken(user)
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
