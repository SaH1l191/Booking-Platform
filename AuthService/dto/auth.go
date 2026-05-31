package dto

import (
	"github.com/go-ozzo/ozzo-validation/v4"
	"github.com/go-ozzo/ozzo-validation/v4/is"
)

type CreateUserRequestDTO struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (dto *CreateUserRequestDTO) Validate() error {
	return validation.ValidateStruct(dto,
		validation.Field(&dto.Username, validation.Required, validation.Length(5, 50)),
		validation.Field(&dto.Email, validation.Required, is.Email),
		validation.Field(&dto.Password, validation.Required, validation.Length(6, 0)),
	)
}

type LoginUserRequestDTO struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (dto *LoginUserRequestDTO) Validate() error {
    return validation.ValidateStruct(dto,
        validation.Field(&dto.Email, validation.Required, is.Email),
        validation.Field(&dto.Password, validation.Required, validation.Length(6, 0)),
    )
}

type AuthTokens struct {
    AccessToken  string `json:"accessToken"`
    RefreshToken string `json:"refreshToken"`
}
	  
type CreateRoleRequestDTO struct {
	Name        string `json:"name" validate:"required,min=2,max=50"`
	Description string `json:"description" validate:"required,min=5,max=200"`
}

type UpdateRoleRequestDTO struct {
	Name        string `json:"name" validate:"required,min=2,max=50"`
	Description string `json:"description" validate:"required,min=5,max=200"`
}

type AssignPermissionRequestDTO struct {
	PermissionId int64 `json:"permission_id" validate:"required"`
}

type RemovePermissionRequestDTO struct {
	PermissionId int64 `json:"permission_id" validate:"required"`
}