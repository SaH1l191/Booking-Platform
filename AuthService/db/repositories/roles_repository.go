package db

import (
	"database/sql"
	"goAuth/models"
)

type RolesRepository interface {
	GetRoleById(id int64) (*models.Role, error)
	GetRoleByName(name string) (*models.Role, error)
	GetAllRoles() ([]*models.Role, error)
	UpdateRole(id int64, name, description string) error
	DeleteRoleById(id int64) error
}

type RoleRepository struct {
	db *sql.DB
}

func NewRoleRepository(db *sql.DB) *RoleRepository {
	return &RoleRepository{db: db}
}

func (r *RoleRepository) GetRoleById(id int64) (*models.Role, error) {
	query := "SELECT id,name,description,created_at,updated_at FROM roles WHERE id = ?"
	row := r.db.QueryRow(query, id)
	role := &models.Role{}

	if err := row.Scan(&role.Id, &role.Name, &role.Description, &role.CreatedAt, &role.UpdatedAt); err != nil {
		return nil, err
	}
	return role, nil
}

func (r *RoleRepository) GetRoleByName(name string) (*models.Role, error) {
	query := "SELECT id,name,description,created_at,updated_at FROM roles WHERE name = ?"
	row := r.db.QueryRow(query, name)
	role := &models.Role{}
	if err := row.Scan(&role.Id, &role.Name, &role.Description, &role.CreatedAt, &role.UpdatedAt); err != nil {
		return nil, err
	}
	return role, nil
}

func (r *RoleRepository) GetAllRoles(name string) ([]*models.Role, error) {
	query := "SELECT id,name,description,created_at,updated_at FROM roles"
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []*models.Role
	for rows.Next() {
		role := &models.Role{}
		if err := rows.Scan(&role.Id, &role.Name, &role.Description, &role.CreatedAt, &role.UpdatedAt); err != nil {
			return nil, err
		}
		roles = append(roles, role)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return roles, nil
}

func (r *RoleRepository) CreateRole(name string, description string) (*models.Role, error) {
	query := "INSERT INTO roles (name, description, created_at, updated_at) VALUES (?, ?, NOW(), NOW())"
	res, err := r.db.Exec(query, name, description)
	if err != nil {
		return nil, err
	}

	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}

	return &models.Role{
		Id:          id,
		Name:        name,
		Description: description,
	}, nil
}

func (r *RoleRepository) UpdateRole(id int64, name string, description string) (*models.Role, error) {
	query := "UPDATE roles SET name = ?, description = ?, updated_at = NOW() WHERE id = ?"
	res, err := r.db.Exec(query, name, description, id)
	if err != nil {
		return nil, err
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return nil, err
	}

	if rowsAffected == 0 {
		return nil, sql.ErrNoRows
	}
	return r.GetRoleById(id)
}

func (r *RoleRepository) DeleteRoleById(id int64) error {
	query := "DELETE FROM roles WHERE id = ?"
	res, err := r.db.Exec(query, id)
	if err != nil {
		return err
	}
	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return sql.ErrNoRows
	}
	return nil
}
