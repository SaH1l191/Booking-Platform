package services

import (
	db "goAuth/db/repositories"
	"goAuth/models"
)

type RoleService interface {
	GetRoleById(id int64) (*models.Role, error)
	GetRoleByName(name string) (*models.Role, error)
	GetAllRoles() ([]*models.Role, error)
	CreateRole(name string, description string) (*models.Role, error)
	DeleteRoleById(id int64) error
	UpdateRole(id int64, name string, description string) (*models.Role, error)
	GetRolePermissions(roleId int64) ([]*models.RolePermission, error)
	AddPermissionToRole(roleId int64, permissionId int64) (*models.RolePermission, error)
	RemovePermissionFromRole(roleId int64, permissionId int64) error
	GetAllRolePermissions() ([]*models.RolePermission, error)
	AssignRoleToUser(userId int64, roleId int64) error
}

type RoleServiceImpl struct {
	roleRepository           db.RoleRepository
	rolePermissionRepository db.RolePermissionRepository
	userRoleRepository       db.UserRoleRepository
}

func NewRoleService(roleRepo db.RoleRepository, rolePermissionRepo db.RolePermissionRepository, userRoleRepo db.UserRoleRepository) RoleService {
	return &RoleServiceImpl{
		roleRepository:           roleRepo,
		rolePermissionRepository: rolePermissionRepo,
		userRoleRepository:       userRoleRepo,
	}
}

func (s *RoleServiceImpl) GetRoleById(id int64) (*models.Role, error) {
	return s.roleRepository.GetRoleById(id)
}

func (s *RoleServiceImpl) GetRoleByName(name string) (*models.Role, error) {
	return s.roleRepository.GetRoleByName(name)
}

func (s *RoleServiceImpl) GetAllRoles() ([]*models.Role, error) {
	return s.roleRepository.GetAllRoles()
}

func (s *RoleServiceImpl) CreateRole(name string, description string) (*models.Role, error) {
	return s.roleRepository.CreateRole(name, description)
}

func (s *RoleServiceImpl) DeleteRoleById(id int64) error {
	return s.roleRepository.DeleteRoleById(id)
}

func (s *RoleServiceImpl) UpdateRole(id int64, name string, description string) (*models.Role, error) {

	return s.roleRepository.UpdateRole(id, name, description)
}

func (s *RoleServiceImpl) GetRolePermissions(roleId int64) ([]*models.RolePermission, error) {
	return s.rolePermissionRepository.GetRolePermissionByRoleId(roleId)
}

func (s *RoleServiceImpl) AddPermissionToRole(roleId int64, permissionId int64) (*models.RolePermission, error) {
	return s.rolePermissionRepository.AddPermissionToRole(roleId, permissionId)
}

func (s *RoleServiceImpl) RemovePermissionFromRole(roleId int64, permissionId int64) error {
	return s.rolePermissionRepository.RemovePermissionFromRole(roleId, permissionId)
}

func (s *RoleServiceImpl) GetAllRolePermissions() ([]*models.RolePermission, error) {
	return s.rolePermissionRepository.GetAllRolePermissions()
}

func (s *RoleServiceImpl) AssignRoleToUser(userId int64, roleId int64) error {
	return s.userRoleRepository.AssignRoleToUser(userId, roleId)
}
