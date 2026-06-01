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
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (dto *CreateRoleRequestDTO) Validate() error {
	return validation.ValidateStruct(dto,
		validation.Field(&dto.Name,
			validation.Required,
			validation.Length(2, 50),
		),
		validation.Field(&dto.Description,
			validation.Required,
			validation.Length(5, 200),
		),
	)
}

type UpdateRoleRequestDTO struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (dto *UpdateRoleRequestDTO) Validate() error {
	return validation.ValidateStruct(dto,
		validation.Field(&dto.Name,
			validation.Required,
			validation.Length(2, 50),
		),
		validation.Field(&dto.Description,
			validation.Required,
			validation.Length(5, 200),
		),
	)
}

type AssignPermissionRequestDTO struct {
	PermissionId int64 `json:"permission_id"`
}

func (dto *AssignPermissionRequestDTO) Validate() error {
	return validation.ValidateStruct(dto,
		validation.Field(&dto.PermissionId,
			validation.Required,
		),
	)
}

type RemovePermissionRequestDTO struct {
	PermissionId int64 `json:"permission_id"`
}

func (dto *RemovePermissionRequestDTO) Validate() error {
	return validation.ValidateStruct(dto,
		validation.Field(&dto.PermissionId,
			validation.Required,
		),
	)
}