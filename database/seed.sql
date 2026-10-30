-- داده نمونه (hash ها نمونه‌اند، نه رمز واقعی)
INSERT INTO users (first_name,last_name,email,phone,password_hash) VALUES
 ('Admin','Root','admin@fm.test',NULL,'$2b$12$adminadminadminadminaOabcdefghijklmnopqrstuvwxyz012'),
 ('Ali','Rezaei','ali@fm.test','09120000001','$2b$12$aliAliAliAliAliAliAuabcdefghijklmnopqrstuvwxyz012'),
 ('Sara','Ahmadi','sara@fm.test','09120000002','$2b$12$saraSaraSaraSaraSaraOabcdefghijklmnopqrstuvwxyz012'),
 ('Reza','Karimi','reza@fm.test',NULL,'$2b$12$rezaRezaRezaRezaRezaOabcdefghijklmnopqrstuvwxyz012');
INSERT INTO admins (user_id) VALUES (1);

INSERT INTO user_profiles (user_id,headline,bio,location) VALUES
 (2,'Full-stack Developer','Web dev with 5y experience','Tehran'),
 (3,'UI/UX Designer',NULL,'Shiraz'),
 (4,'Data Analyst','Python & SQL','Isfahan');
INSERT INTO portfolios (profile_id,title,url) VALUES (1,'Shop website','https://example.com/shop'),(2,'Banking app UI',NULL);
INSERT INTO certificates (profile_id,title,issuer,issued_date) VALUES (3,'Google Data Analytics','Google','2023-05-01');

INSERT INTO categories (title) VALUES ('Web Development'),('Graphic Design'),('Data Analysis');
INSERT INTO skills (name) VALUES ('Python'),('React'),('SQL'),('UI/UX'),('Django');
INSERT INTO profile_skills VALUES (1,1),(1,2),(1,5),(2,4),(3,1),(3,3);

-- پروژه‌ها (open شدن بعد از درج پروژه)
INSERT INTO projects (employer_id,title,description,pricing_type,budget,status,deadline) VALUES
 (2,'Online store website','Build an e-commerce site','fixed_price',20000000,'draft','2026-12-30'),  -- 1  (Ali)
 (3,'Mobile app UI design','Design 10 screens','fixed_price',8000000,'draft',NULL),                -- 2  (Sara)
 (4,'Sales dashboard','SQL + Python reporting','hourly',500000,'draft','2026-12-01');              -- 3  (Reza)
UPDATE projects SET status='open';

INSERT INTO project_categories VALUES (1,1),(2,2),(3,3),(3,1);
INSERT INTO project_skills VALUES (1,2),(1,5),(2,4),(3,1),(3,3);

-- پیشنهادها (Ali هم کارفرما، هم فریلنسر)
INSERT INTO proposals (project_id,freelancer_id,amount,cover_letter,estimated_days) VALUES
 (2,2,7500000,'I can do the UI with Figma',10),    -- 1: Ali -> پروژه Sara
 (3,2,450000,'SQL expert',NULL),                   -- 2: Ali -> پروژه Reza
 (3,3,480000,'Python + SQL',NULL),                 -- 3: Sara -> پروژه Reza
 (1,4,18000000,'Django developer',30);             -- 4: Reza -> پروژه Ali
UPDATE proposals SET estimated_hours = 40 WHERE id = 3;
-- پذیرش یک پیشنهاد (پروژه ۱ → in_progress توسط trigger)
UPDATE proposals SET status='accepted' WHERE id = 4;
