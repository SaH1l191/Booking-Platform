package models 


type User struct {
	Id int64
	Username string
	Email string
	Password string
	CreatedAt string
	UpdatedAt string
}

type Role struct {
	Id int64
	Name string
	Description string
	CreatedAt string
	UpdatedAt string
}