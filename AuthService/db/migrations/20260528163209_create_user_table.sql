-- +goose Up 
create table if not exists users(
	id SERIAL auto_increment  primary key,
    username VARCHAR(255) unique NOT NULL,
    password VARCHAR(255) NOT NULL,
    email  varchar(255) unique not null ,
    created_at TIMESTamp not null default current_timestamp,
    updated_at TIMESTamp not null default current_timestamp
);
-- +goose Down
DROP TABLE IF EXISTS users;
