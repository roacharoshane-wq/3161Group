USE comp3161;

CREATE OR REPLACE VIEW v_user_login AS
SELECT
  'admin' AS role,
  admin_id AS user_id,
  email,
  password_hash,
  created_at
FROM admin
UNION ALL
SELECT
  'lecturer' AS role,
  lecturer_id AS user_id,
  email,
  password_hash,
  created_at
FROM lecturer
UNION ALL
SELECT
  'student' AS role,
  student_id AS user_id,
  email,
  password_hash,
  created_at
FROM student;

CREATE OR REPLACE VIEW v_course_members AS
SELECT
  c.course_id,
  c.course_code,
  'lecturer' AS member_role,
  l.lecturer_id AS member_id,
  l.email,
  CONCAT(l.first_name, ' ', l.last_name) AS full_name
FROM course_lecturer cl
JOIN lecturer l ON l.lecturer_id = cl.lecturer_id
JOIN course c ON c.course_id = cl.course_id
UNION ALL
SELECT
  c.course_id,
  c.course_code,
  'student' AS member_role,
  s.student_id AS member_id,
  s.email,
  CONCAT(s.first_name, ' ', s.last_name) AS full_name
FROM course_student cs
JOIN student s ON s.student_id = cs.student_id
JOIN course c ON c.course_id = cs.course_id;

CREATE OR REPLACE VIEW v_assignment_due AS
SELECT
  a.assignment_id,
  si.title AS assignment_title,
  c.course_id,
  c.course_code,
  ce.event_at AS due_at
FROM assignment a
JOIN section_item si ON si.section_item_id = a.assignment_id
JOIN section s ON s.section_id = si.section_id
JOIN course c ON c.course_id = s.course_id
LEFT JOIN calendar_event ce ON ce.assignment_item_id = a.assignment_id;
