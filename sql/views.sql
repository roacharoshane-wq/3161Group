USE comp3161;

-- -----------------------------------------------------------------------
-- Existing utility views
-- -----------------------------------------------------------------------

CREATE OR REPLACE VIEW v_user_login AS
SELECT
  'admin'    AS role,
  admin_id   AS user_id,
  email,
  password_hash,
  created_at
FROM admin
UNION ALL
SELECT
  'lecturer'  AS role,
  lecturer_id AS user_id,
  email,
  password_hash,
  created_at
FROM lecturer
UNION ALL
SELECT
  'student'   AS role,
  student_id  AS user_id,
  email,
  password_hash,
  created_at
FROM student;


CREATE OR REPLACE VIEW v_course_members AS
SELECT
  c.course_id,
  c.course_code,
  'lecturer'   AS member_role,
  l.lecturer_id AS member_id,
  l.email,
  CONCAT(l.first_name, ' ', l.last_name) AS full_name
FROM course_lecturer cl
JOIN lecturer l ON l.lecturer_id = cl.lecturer_id
JOIN course   c ON c.course_id   = cl.course_id
UNION ALL
SELECT
  c.course_id,
  c.course_code,
  'student'    AS member_role,
  s.student_id AS member_id,
  s.email,
  CONCAT(s.first_name, ' ', s.last_name) AS full_name
FROM course_student cs
JOIN student s ON s.student_id = cs.student_id
JOIN course  c ON c.course_id  = cs.course_id;


CREATE OR REPLACE VIEW v_assignment_due AS
SELECT
  a.assignment_id,
  si.title        AS assignment_title,
  c.course_id,
  c.course_code,
  ce.event_at     AS due_at
FROM assignment a
JOIN section_item si ON si.section_item_id = a.assignment_id
JOIN section      s  ON s.section_id       = si.section_id
JOIN course       c  ON c.course_id        = s.course_id
LEFT JOIN calendar_event ce ON ce.assignment_item_id = a.assignment_id;


-- -----------------------------------------------------------------------
-- Report views
-- -----------------------------------------------------------------------

-- 1. All courses that have 50 or more students
CREATE OR REPLACE VIEW v_courses_50_plus_students AS
SELECT
  c.course_id,
  c.course_code,
  c.course_name,
  COUNT(cs.student_id) AS student_count
FROM course c
JOIN course_student cs ON cs.course_id = c.course_id
GROUP BY c.course_id, c.course_code, c.course_name
HAVING COUNT(cs.student_id) >= 50
ORDER BY student_count DESC;


-- 2. All students that are enrolled in 5 or more courses
CREATE OR REPLACE VIEW v_students_5_plus_courses AS
SELECT
  s.student_id,
  s.student_no,
  s.first_name,
  s.last_name,
  s.email,
  COUNT(cs.course_id) AS course_count
FROM student s
JOIN course_student cs ON cs.student_id = s.student_id
GROUP BY s.student_id, s.student_no, s.first_name, s.last_name, s.email
HAVING COUNT(cs.course_id) >= 5
ORDER BY course_count DESC;


-- 3. All lecturers that teach 3 or more courses
CREATE OR REPLACE VIEW v_lecturers_3_plus_courses AS
SELECT
  l.lecturer_id,
  l.first_name,
  l.last_name,
  l.email,
  COUNT(cl.course_id) AS course_count
FROM lecturer l
JOIN course_lecturer cl ON cl.lecturer_id = l.lecturer_id
GROUP BY l.lecturer_id, l.first_name, l.last_name, l.email
HAVING COUNT(cl.course_id) >= 3
ORDER BY course_count DESC;


-- 4. The 10 most enrolled courses
CREATE OR REPLACE VIEW v_top_10_enrolled_courses AS
SELECT
  c.course_id,
  c.course_code,
  c.course_name,
  COUNT(cs.student_id) AS student_count
FROM course c
LEFT JOIN course_student cs ON cs.course_id = c.course_id
GROUP BY c.course_id, c.course_code, c.course_name
ORDER BY student_count DESC
LIMIT 10;


-- 5. The top 10 students with the highest overall grade averages
CREATE OR REPLACE VIEW v_top_10_students_by_average AS
SELECT
  s.student_id,
  s.student_no,
  s.first_name,
  s.last_name,
  s.email,
  ROUND(AVG(sub.grade), 2)  AS overall_average,
  COUNT(sub.submission_id)  AS graded_submissions
FROM student s
JOIN submission sub ON sub.student_id = s.student_id
WHERE sub.grade IS NOT NULL
GROUP BY s.student_id, s.student_no, s.first_name, s.last_name, s.email
ORDER BY overall_average DESC
LIMIT 10;
