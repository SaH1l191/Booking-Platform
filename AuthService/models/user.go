package models

import "time"

type User struct {
	Id        int64     `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Password  string    `json:"-"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Role struct {
	Id          int64
	Name        string
	Description string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}
type Permission struct {
	Id          int64
	Name        string
	Description string
	Resource    string
	Action      string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type RolePermission struct {
	Id           int64
	RoleId       int64
	PermissionId int64
	CreatedAt    time.Time
	UpdatedAt    time.Time
}
