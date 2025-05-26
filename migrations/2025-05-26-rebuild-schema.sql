-- Drop all relevant tables (disable foreign key checks first)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS link_allocations;
DROP TABLE IF EXISTS links;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS domains;
SET FOREIGN_KEY_CHECKS = 1;

-- Recreate tables with INT primary keys (except users)
CREATE TABLE domains (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE departments (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain_id INT NOT NULL,
    FOREIGN KEY (domain_id) REFERENCES domains(id)
);

CREATE TABLE links (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    url VARCHAR(2048) NOT NULL,
    domain_id INT NOT NULL,
    department_id INT NOT NULL,
    uid CHAR(36) NOT NULL,
    times_allocated INT DEFAULT 0,
    times_purchased INT DEFAULT 0,
    error_count INT DEFAULT 0,
    FOREIGN KEY (domain_id) REFERENCES domains(id),
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE users (
    id CHAR(36) NOT NULL PRIMARY KEY, -- UUID
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    department_id INT,
    domain_id INT,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (domain_id) REFERENCES domains(id)
);

CREATE TABLE link_allocations (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    link_id INT NOT NULL,
    user_id CHAR(36) NOT NULL,
    allocated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_additional BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (link_id) REFERENCES links(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- (Add any additional columns you need for your app)
