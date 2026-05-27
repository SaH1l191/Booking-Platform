package services

import (
	"fmt"
	db "goAuth/db/repositories"
	"goAuth/dto"
	"goAuth/models"
	"goAuth/utils"
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

func (u *UserServiceImpl) LoginUser(payload *dto.LoginUserRequestDTO) (string, error) {

	email := payload.Email
	password := payload.Password

	user, err := u.userRepo.GetByEmail(email)
	if err != nil {
		fmt.Println("Error fetching user by email:", err)
		return "", err
	}
	if user == nil {
		fmt.Println("No user found with the given email")
		return "", fmt.Errorf("no user found with email: %s", email)
	}

	isPasswordValid  := utils.CheckPasswordHash(password, user.Password)
	if !isPasswordValid {
		fmt.Println("Password does not match")
		return "", nil
	} 

	// fmt.Println("JWT Token:", tokenString)

	return "tokenString", nil
}
