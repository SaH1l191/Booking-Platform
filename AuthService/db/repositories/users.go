package db

import (
	"database/sql"
	"fmt"
	"goAuth/models"
)

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) UserRepository {
	return UserRepository{db: db}
}

func (u *UserRepository) Create(username string, email string, hashedPass string) (*models.User, error) {
	query := "INSERT INTO users (username, email, password) VALUES (?,?,?)"
	res, err := u.db.Exec(query, username, email, hashedPass)
	if err != nil {
		fmt.Printf("Error creating user: %v\n", err)
		return nil, err
	}
	lastInsertID, rowErr := res.LastInsertId()
	if rowErr != nil {
		fmt.Printf("Error fetching last insert ID: %v\n", rowErr)
		return nil, rowErr
	}
	user := &models.User{
		Id:       lastInsertID,
		Username: username,
		Email:    email,
	}
	fmt.Println("User created successfully ", user)
	return user, nil
}

func (u *UserRepository) GetByID(id string) (*models.User, error) {
	query := "SELECT id,username,email,created_at,updated_at FROM users WHERE id = ?"
	row := u.db.QueryRow(query, id)
	user := &models.User{}
	err := row.Scan(&user.Id, &user.Username, &user.Email, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		fmt.Printf("Error fetching user by ID: %v\n", err)
		return nil, err
	}
	return user, nil
}

func (u *UserRepository) GetByEmail(email string) (*models.User, error) {
	query := "SELECT id,username,email,created_at,updated_at FROM users WHERE email = ?"
	row := u.db.QueryRow(query, email)
	user := &models.User{}
	if err := row.Scan(&user.Id, &user.Username, &user.Email, &user.CreatedAt, &user.UpdatedAt); err != nil {
		fmt.Printf("Error fetching user by email: %v\n", err)
		return nil, err
	}
	return user, nil
}

func (u *UserRepository) DeleteByID(id int64) error {
	query := "DELETE FROM users WHERE id = ?"
	res, err := u.db.Exec(query, id)
	if err != nil {
		fmt.Printf("Error deleting user: %v\n", err)
		return err
	}
	rowsAffected, rowErr := res.RowsAffected()
	if rowErr != nil {
		fmt.Printf("Error fetching rows affected: %v\n", rowErr)
		return rowErr
	}
	if rowsAffected == 0 {
		fmt.Printf("No user found with ID: %d\n", id)
		return sql.ErrNoRows
	}
	fmt.Printf("User with ID %d deleted successfully\n", id)
	return nil
}

func (u *UserRepository) GetAll(id int64) ([]*models.User, error) {
	query := "SELECT id,username,email,created_at,updated_at FROM users"
	rows, err := u.db.Query(query)
	if err != nil {
		fmt.Printf("Error fetching users: %v\n", err)
		return nil, err
	}
	defer rows.Close()
	users := []*models.User{}
	for rows.Next() {
		user := &models.User{}
		if err := rows.Scan(&user.Id, &user.Username, &user.Email, &user.CreatedAt, &user.UpdatedAt); err != nil {
			fmt.Printf("Error scanning user: %v\n", err)
			return nil, err
		}
		users = append(users, user)
	}
	if err := rows.Err(); err != nil {
		fmt.Println("Error with rows:", err)
		return nil, err
	}

	return users, nil
}
