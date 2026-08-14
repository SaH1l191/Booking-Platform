package models

import "time"

type Review struct {
	Id        int64      `json:"id"`
	UserId    int64      `json:"user_id"`
	BookingId int64      `json:"booking_id"`
	HotelId   int64      `json:"hotel_id"`
	Comment   string     `json:"comment"`
	Rating    int        `json:"rating"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at"`
	IsSynced  bool       `json:"is_synced"`
}