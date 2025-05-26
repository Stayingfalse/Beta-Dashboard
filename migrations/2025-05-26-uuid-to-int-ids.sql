-- Migration: Switch from UUIDs to INT IDs for departments, domains, and links (except users and sessions)
-- 1. Add new INT primary key columns
-- ALTER TABLE departments ADD COLUMN id_new INT NOT NULL AUTO_INCREMENT UNIQUE FIRST;
-- ALTER TABLE domains ADD COLUMN id_new INT NOT NULL AUTO_INCREMENT UNIQUE FIRST;
-- ALTER TABLE links ADD COLUMN id_new INT NOT NULL AUTO_INCREMENT UNIQUE FIRST;

-- 2. Add new INT foreign key columns to referencing tables
-- ALTER TABLE users ADD COLUMN department_id_new INT;
-- ALTER TABLE users ADD COLUMN domain_id_new INT;
-- ALTER TABLE link_allocations ADD COLUMN link_id_new INT;
-- ALTER TABLE link_allocations ADD COLUMN user_id_new CHAR(36);

-- 3. Populate new INT columns by joining on UUIDs
UPDATE users u JOIN departments d ON u.department_id = d.id SET u.department_id_new = d.id_new;
-- Use the correct UUID column for domains (replace 'id' with the actual UUID column name if different)
-- UPDATE users u JOIN domains dom ON u.domain_id = dom.id SET u.domain_id_new = dom.id_new;
-- If the UUID column in domains is named 'uuid', use this instead:
-- UPDATE users u JOIN domains dom ON u.domain_id = dom.uuid SET u.domain_id_new = dom.id_new;
UPDATE link_allocations la JOIN links l ON la.link_id = l.id SET la.link_id_new = l.id_new;
UPDATE link_allocations la JOIN users u ON la.user_id = u.id SET la.user_id_new = u.id;

-- 4. Add foreign key constraints
ALTER TABLE users ADD CONSTRAINT fk_users_department_id_new FOREIGN KEY (department_id_new) REFERENCES departments(id_new);
ALTER TABLE users ADD CONSTRAINT fk_users_domain_id_new FOREIGN KEY (domain_id_new) REFERENCES domains(id_new);
ALTER TABLE link_allocations ADD CONSTRAINT fk_link_allocations_link_id_new FOREIGN KEY (link_id_new) REFERENCES links(id_new);

-- 5. (Optional) Drop old UUID columns and rename new columns
-- (Do this only after codebase is updated)
-- ALTER TABLE departments DROP COLUMN id;
-- ALTER TABLE departments CHANGE id_new id INT NOT NULL AUTO_INCREMENT PRIMARY KEY;
-- ALTER TABLE domains DROP COLUMN id;
-- ALTER TABLE domains CHANGE id_new id INT NOT NULL AUTO_INCREMENT PRIMARY KEY;
-- ALTER TABLE links DROP COLUMN id;
-- ALTER TABLE links CHANGE id_new id INT NOT NULL AUTO_INCREMENT PRIMARY KEY;
-- ALTER TABLE users DROP COLUMN department_id, DROP COLUMN domain_id;
-- ALTER TABLE users CHANGE department_id_new department_id INT, CHANGE domain_id_new domain_id INT;
-- ALTER TABLE link_allocations DROP COLUMN link_id;
-- ALTER TABLE link_allocations CHANGE link_id_new link_id INT;

-- 6. (Optional) Clean up any remaining references to old UUID columns

-- NOTE: Do not drop or rename columns until the codebase is fully migrated to use INT IDs.
