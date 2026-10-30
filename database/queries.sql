-- Q1: پروژه‌های باز با دسته‌بندی‌ها و کارفرما
SELECT p.id, p.title, p.pricing_type, p.budget,
       u.first_name||' '||u.last_name AS employer,
       string_agg(DISTINCT c.title, ', ') AS categories
FROM projects p
JOIN users u ON u.id = p.employer_id
LEFT JOIN project_categories pc ON pc.project_id = p.id
LEFT JOIN categories c ON c.id = pc.category_id
WHERE p.status = 'open'
GROUP BY p.id, u.first_name, u.last_name;

-- Q2: پیشنهادهای یک پروژه (مثلا 3) با نام فریلنسر
SELECT pr.id, u.first_name||' '||u.last_name AS freelancer, pr.amount, pr.estimated_hours, pr.status
FROM proposals pr JOIN users u ON u.id = pr.freelancer_id
WHERE pr.project_id = 3 ORDER BY pr.created_at;

-- Q3: پروژه‌های هر کارفرما و تعداد پیشنهادها
SELECT u.id, u.first_name||' '||u.last_name AS employer, p.title, COUNT(pr.id) AS proposals_count
FROM projects p
JOIN users u ON u.id = p.employer_id
LEFT JOIN proposals pr ON pr.project_id = p.id
GROUP BY u.id, u.first_name, u.last_name, p.id, p.title
ORDER BY u.id, p.id;

-- Q4: مهارت‌های موردنیاز هر پروژه
SELECT p.id, p.title, string_agg(s.name, ', ' ORDER BY s.name) AS required_skills
FROM projects p
LEFT JOIN project_skills ps ON ps.project_id = p.id
LEFT JOIN skills s ON s.id = ps.skill_id
GROUP BY p.id, p.title ORDER BY p.id;
