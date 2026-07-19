-- +goose Up
-- admin user -> admin role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = 'admin'
AND r.name = 'admin';

-- hotel managers
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username IN (
    'alice', 'bob', 'charlie', 'david', 'eva'
)
AND r.name = 'hotel_manager';

-- customers
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username IN (
    'frank', 'grace', 'henry', 'irene', 'jack', 'karen', 'leo', 'mia', 'nancy', 'oliver', 
    'paul', 'queen', 'ryan', 'sophia', 'thomas', 'uma', 'victor', 'wendy', 'xavier', 'yasmin', 'zack'
)
AND r.name = 'customer';

-- +goose Down
-- Rollback: Remove the assigned roles for these specific users
DELETE FROM user_roles
WHERE user_id IN (SELECT id FROM users WHERE username IN (
    'admin', 'alice', 'bob', 'charlie', 'david', 'eva', 'frank', 'grace', 'henry', 'irene', 
    'jack', 'karen', 'leo', 'mia', 'nancy', 'oliver', 'paul', 'queen', 'ryan', 'sophia', 
    'thomas', 'uma', 'victor', 'wendy', 'xavier', 'yasmin', 'zack'
));   