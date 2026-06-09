package db

import (
	"database/sql"
	"goAuth/models"
	"goAuth/pkg/logger"
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
		logger.Log.Error("Failed to create user", "error", err)
		return nil, err
	}
	lastInsertID, rowErr := res.LastInsertId()
	if rowErr != nil {
		logger.Log.Error("Failed to fetch last insert ID", "error", rowErr)
		return nil, rowErr
	}
	user := &models.User{
		Id:       lastInsertID,
		Username: username,
		Email:    email,
	}
	logger.Log.Info("User created successfully", "userId", user.Id, "username", user.Username, "email", user.Email)
	return user, nil
}

func (u *UserRepository) GetByID(id string) (*models.User, error) {
	query := "SELECT id,username,email,created_at,updated_at FROM users WHERE id = ?"
	row := u.db.QueryRow(query, id)
	user := &models.User{}
	err := row.Scan(&user.Id, &user.Username, &user.Email, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		logger.Log.Error("Failed to fetch user by ID", "error", err, "userId", id)
		return nil, err
	}
	return user, nil
}

func (u *UserRepository) GetByEmail(email string) (*models.User, error) {
	query := "SELECT id,username,email,password,created_at,updated_at FROM users WHERE email = ?"
	row := u.db.QueryRow(query, email)
	user := &models.User{}
	if err := row.Scan(&user.Id, &user.Username, &user.Email, &user.Password, &user.CreatedAt, &user.UpdatedAt); err != nil {
		logger.Log.Error("Failed to fetch user by email", "error", err, "email", email)
		return nil, err
	}
	return user, nil
}

func (u *UserRepository) DeleteByID(id int64) error {
	query := "DELETE FROM users WHERE id = ?"
	res, err := u.db.Exec(query, id)
	if err != nil {
		logger.Log.Error("Failed to delete user", "error", err, "userId", id)
		return err
	}
	rowsAffected, rowErr := res.RowsAffected()
	if rowErr != nil {
		logger.Log.Error("Failed to fetch rows affected", "error", rowErr)
		return rowErr
	}
	if rowsAffected == 0 {
		logger.Log.Warn("No user found with ID", "userId", id)
		return sql.ErrNoRows
	}
	logger.Log.Info("User deleted successfully", "userId", id)
	return nil
}

func (u *UserRepository) GetAll(id int64) ([]*models.User, error) {
	query := "SELECT id,username,email,created_at,updated_at FROM users"
	rows, err := u.db.Query(query)
	if err != nil {
		logger.Log.Error("Failed to fetch users", "error", err)
		return nil, err
	}
	defer rows.Close()
	users := []*models.User{}
	for rows.Next() {
		user := &models.User{}
		if err := rows.Scan(&user.Id, &user.Username, &user.Email, &user.CreatedAt, &user.UpdatedAt); err != nil {
			logger.Log.Error("Failed to scan user row", "error", err)
			return nil, err
		}
		users = append(users, user)
	}
	if err := rows.Err(); err != nil {
		logger.Log.Error("Error iterating user rows", "error", err)
		return nil, err
	}
	return users, nil
}
