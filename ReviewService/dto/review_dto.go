package dto

import (
    "time"
    validation "github.com/go-ozzo/ozzo-validation/v4"
)

type CreateReviewRequestDTO struct {
	UserId    int64  `json:"user_id" validate:"required"`
	BookingId int64  `json:"booking_id" validate:"required"`
	HotelId   int64  `json:"hotel_id" validate:"required"`
	Comment   string `json:"comment" validate:"required,min=1,max=1000"`
	Rating    int    `json:"rating" validate:"required,min=1,max=5"`
}

type UpdateReviewRequestDTO struct {
	Comment string `json:"comment" validate:"required,min=1,max=1000"`
	Rating  int    `json:"rating" validate:"required,min=1,max=5"`
}

type ReviewResponseDTO struct {
	Id        int64      `json:"id"`
	UserId    int64      `json:"user_id"`
	BookingId int64      `json:"booking_id"`
	HotelId   int64      `json:"hotel_id"`
	Comment   string     `json:"comment"`
	Rating    int        `json:"rating"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
	IsSynced  bool       `json:"is_synced"`
}

func (c CreateReviewRequestDTO) Validate() error {
    return validation.ValidateStruct(&c,
        validation.Field(&c.UserId, validation.Required),
        validation.Field(&c.BookingId, validation.Required),
        validation.Field(&c.HotelId, validation.Required),
        validation.Field(&c.Comment, validation.Required, validation.Length(1, 1000)),
        validation.Field(&c.Rating, validation.Required, validation.Min(1), validation.Max(5)),
    )
}

func (u UpdateReviewRequestDTO) Validate() error {
    return validation.ValidateStruct(&u,
        validation.Field(&u.Comment, validation.Required, validation.Length(1, 1000)),
        validation.Field(&u.Rating, validation.Required, validation.Min(1), validation.Max(5)),
    )
}
