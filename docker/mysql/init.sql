CREATE DATABASE IF NOT EXISTS auth_db;
CREATE DATABASE IF NOT EXISTS airbnb_development;
CREATE DATABASE IF NOT EXISTS airbnb_development1;
CREATE DATABASE IF NOT EXISTS payment_db;
CREATE DATABASE IF NOT EXISTS review_service;

CREATE USER IF NOT EXISTS 'sahil'@'%' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON auth_db.* TO 'sahil'@'%';
GRANT ALL PRIVILEGES ON airbnb_development.* TO 'sahil'@'%';
GRANT ALL PRIVILEGES ON airbnb_development1.* TO 'sahil'@'%';
GRANT ALL PRIVILEGES ON payment_db.* TO 'sahil'@'%';
GRANT ALL PRIVILEGES ON review_service.* TO 'sahil'@'%';
FLUSH PRIVILEGES;
