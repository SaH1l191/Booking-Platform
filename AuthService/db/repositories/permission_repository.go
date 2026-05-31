package db

import (
	"database/sql"
	"goAuth/models"
)

type PermissionRepository interface {
	GetPermissionById(id int64) (*models.Permission, error)
	GetPermissionByName(name string) (*models.Permission, error)
	GetAllPermissions() ([]*models.Permission, error)
	DeletePermissionById(id int64) error
	UpdatePermission(id int64, name string, description string, resource string, action string) (*models.Permission, error)
}

type PermissionRepositoryImpl struct {
	db *sql.DB
}

func NewPermissionRepository(db *sql.DB) *PermissionRepositoryImpl {
	return &PermissionRepositoryImpl{db: db}
}

func (r *PermissionRepositoryImpl) GetPermissionById(id int64) (*models.Permission, error) {
	query := "SELECT id, name, description, resource, action, created_at, updated_at FROM permissions WHERE id = ?"
	row := r.db.QueryRow(query, id)
	permission := &models.Permission{}
	err := row.Scan(&permission.Id, &permission.Name, &permission.Description, &permission.Resource, &permission.Action, &permission.CreatedAt, &permission.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return permission, nil
}

func (r *PermissionRepositoryImpl) GetPermissionByName(name string) (*models.Permission, error) {
	query := "SELECT id, name, description, resource, action, created_at, updated_at FROM permissions WHERE name = ?"
	row := r.db.QueryRow(query, name)
	permission := &models.Permission{}
	err := row.Scan(&permission.Id, &permission.Name, &permission.Description, &permission.Resource, &permission.Action, &permission.CreatedAt, &permission.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return permission, nil
}

func (r *PermissionRepositoryImpl) GetAllPermissions() ([]*models.Permission, error) {
	query := "SELECT id, name, description, resource, action, created_at, updated_at FROM permissions"
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var permissions []*models.Permission
	for rows.Next() {
		permission := &models.Permission{}
		err := rows.Scan(&permission.Id, &permission.Name, &permission.Description, &permission.Resource, &permission.Action, &permission.CreatedAt, &permission.UpdatedAt)
		if err != nil {
			return nil, err
		}
		permissions = append(permissions, permission)
	}
	return permissions, nil
}

func (r *PermissionRepositoryImpl) DeletePermissionById(id int64) error {
	query := "DELETE FROM permissions WHERE id = ?"
	result, err := r.db.Exec(query, id)
	if err != nil {
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return sql.ErrNoRows
	}
	return err
}

func (p *PermissionRepositoryImpl) CreatePermission(name string, description string, resource string, action string) (*models.Permission, error) {
	query := "INSERT INTO permissions (name, description, resource, action, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())"
	result, err := p.db.Exec(query, name, description, resource, action)
	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return &models.Permission{
		Id:          id,
		Name:        name,
		Description: description,
		Resource:    resource,
		Action:      action,
		CreatedAt:   "NOW()",
		UpdatedAt:   "NOW()",
	}, nil
}

func (p *PermissionRepositoryImpl) UpdatePermission(id int64, name string, description string, resource string, action string) (*models.Permission, error) {
	query := "UPDATE permissions SET name = ?, description = ?, resource = ?, action = ?, updated_at = NOW() WHERE id = ?"
	_, err := p.db.Exec(query, name, description, resource, action, id)
	if err != nil {
		return nil, err
	}

	return &models.Permission{
		Id:          id,
		Name:        name,
		Description: description,
		Resource:    resource,
		Action:      action,
		UpdatedAt:   "NOW()",
	}, nil
}

//update-2
//query := `
// UPDATE permissions
// SET name = $1,
//     description = $2,
//     resource = $3,
//     action = $4,
//     updated_at = NOW()
// WHERE id = $5
// RETURNING id, name, description, resource, action, updated_at
// `

// perm := &models.Permission{}

// err := db.QueryRow(
//     query,
//     name, description, resource, action, id,
// ).Scan(
//     &perm.Id,
//     &perm.Name,
//     &perm.Description,
//     &perm.Resource,
//     &perm.Action,
//     &perm.UpdatedAt,
// )
