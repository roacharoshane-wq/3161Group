USE comp3161;

-- Admins
INSERT INTO admin (email, password_hash, first_name, last_name, created_by_admin_id)
VALUES
  ('admin1@example.com', SHA2('admin123', 256), 'Admin', 'One', NULL);

INSERT INTO admin (email, password_hash, first_name, last_name, created_by_admin_id)
VALUES
  ('admin2@example.com', SHA2('admin123', 256), 'Admin', 'Two', 1),
  ('admin3@example.com', SHA2('admin123', 256), 'Admin', 'Three', 1),
  ('admin4@example.com', SHA2('admin123', 256), 'Admin', 'Four', 1),
  ('admin5@example.com', SHA2('admin123', 256), 'Admin', 'Five', 1);

DROP TEMPORARY TABLE IF EXISTS temp_numbers;
CREATE TEMPORARY TABLE temp_numbers (
  n INT UNSIGNED PRIMARY KEY
);

INSERT INTO temp_numbers (n)
SELECT
  d1.d + d2.d * 10 + d3.d * 100 + d4.d * 1000 + d5.d * 10000 + 1 AS n
FROM (
  SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
  UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
) d1
CROSS JOIN (
  SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
  UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
) d2
CROSS JOIN (
  SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
  UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
) d3
CROSS JOIN (
  SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
  UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
) d4
CROSS JOIN (
  SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
  UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
) d5;

-- Lecturers (50)
INSERT INTO lecturer (email, password_hash, first_name, last_name, created_by_admin_id)
SELECT
  CONCAT('lecturer', LPAD(n, 5, '0'), '@example.com'),
  SHA2('lecturer123', 256),
  CONCAT('Lecturer ', n),
  'User',
  1
FROM temp_numbers
WHERE n <= 50;

-- Students (100000)
INSERT INTO student (student_no, email, password_hash, first_name, last_name, created_by_admin_id)
SELECT
  CONCAT('S', LPAD(n, 6, '0')),
  CONCAT('student', LPAD(n, 6, '0'), '@example.com'),
  SHA2('student123', 256),
  CONCAT('Student ', n),
  'User',
  1
FROM temp_numbers
WHERE n <= 100000;

-- Courses (200)
INSERT INTO course (course_code, course_name, created_by_admin_id)
SELECT
  CONCAT('C', LPAD(n, 4, '0')),
  CONCAT('Course ', n),
  1
FROM temp_numbers
WHERE n <= 200;

-- Assign one lecturer per course (4 courses per lecturer)
INSERT INTO course_lecturer (course_id, lecturer_id)
SELECT
  c.course_id,
  MOD(c.course_id - 1, 50) + 1 AS lecturer_id
FROM course c;

-- Enroll each student in 3 courses (min 3, max 6)
INSERT INTO course_student (course_id, student_id)
SELECT
  MOD(s.student_id - 1, 200) + 1 AS course_id,
  s.student_id
FROM student s;

INSERT INTO course_student (course_id, student_id)
SELECT
  MOD(s.student_id + 66, 200) + 1 AS course_id,
  s.student_id
FROM student s;

INSERT INTO course_student (course_id, student_id)
SELECT
  MOD(s.student_id + 133, 200) + 1 AS course_id,
  s.student_id
FROM student s;

-- Sections (3 per course)
INSERT INTO section (course_id, title, position, created_by_lecturer_id)
SELECT
  c.course_id,
  CONCAT('Section ', p.pos),
  p.pos,
  cl.lecturer_id
FROM course c
JOIN course_lecturer cl ON cl.course_id = c.course_id
JOIN (
  SELECT 1 AS pos UNION ALL SELECT 2 UNION ALL SELECT 3
) p;

-- Section items (link, lecture slide, assignment)
INSERT INTO section_item (section_id, item_type, title, created_by_lecturer_id)
SELECT
  s.section_id,
  it.item_type,
  CONCAT(it.item_label, ' ', s.section_id),
  s.created_by_lecturer_id
FROM section s
JOIN (
  SELECT 'link' AS item_type, 'Link' AS item_label
  UNION ALL SELECT 'lecture_slide', 'Slide'
  UNION ALL SELECT 'assignment', 'Assignment'
) it;

INSERT INTO section_link (section_item_id, url)
SELECT
  section_item_id,
  CONCAT('https://example.com/links/', section_item_id)
FROM section_item
WHERE item_type = 'link';

INSERT INTO section_lecture_slide (section_item_id, file_url)
SELECT
  section_item_id,
  CONCAT('https://example.com/slides/', section_item_id, '.pdf')
FROM section_item
WHERE item_type = 'lecture_slide';

-- Assignments
INSERT INTO assignment (assignment_id, description, max_score)
SELECT
  section_item_id,
  CONCAT('Assignment details for item ', section_item_id),
  100
FROM section_item
WHERE item_type = 'assignment';

-- Calendar events: general event per course
INSERT INTO calendar_event (course_id, title, event_type, event_at, created_by_lecturer_id)
SELECT
  c.course_id,
  CONCAT('Course Event ', c.course_code),
  'general',
  DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 30 DAY),
  cl.lecturer_id
FROM course c
JOIN course_lecturer cl ON cl.course_id = c.course_id;

-- Calendar events: assignment due dates
INSERT INTO calendar_event (course_id, title, event_type, event_at, created_by_lecturer_id, assignment_item_id)
SELECT
  s.course_id,
  CONCAT('Assignment Due: ', si.title),
  'assignment_due',
  DATE_ADD(CURRENT_TIMESTAMP, INTERVAL MOD(a.assignment_id, 14) + 7 DAY),
  s.created_by_lecturer_id,
  a.assignment_id
FROM assignment a
JOIN section_item si ON si.section_item_id = a.assignment_id
JOIN section s ON s.section_id = si.section_id;

-- Discussion forums (1 per course)
INSERT INTO discussion_forum (course_id, title, created_by_lecturer_id)
SELECT
  c.course_id,
  CONCAT('Forum for ', c.course_code),
  cl.lecturer_id
FROM course c
JOIN course_lecturer cl ON cl.course_id = c.course_id;

-- Discussion threads: one student thread per forum
INSERT INTO discussion_thread (forum_id, title, body, created_by_student_id, created_by_lecturer_id)
SELECT
  f.forum_id,
  CONCAT('Student thread ', f.forum_id),
  'Initial post by student',
  MOD(f.forum_id, 100000) + 1,
  NULL
FROM discussion_forum f;

-- Discussion threads: one lecturer thread per forum
INSERT INTO discussion_thread (forum_id, title, body, created_by_student_id, created_by_lecturer_id)
SELECT
  f.forum_id,
  CONCAT('Lecturer thread ', f.forum_id),
  'Initial post by lecturer',
  NULL,
  f.created_by_lecturer_id
FROM discussion_forum f;

-- Replies: one per thread
INSERT INTO discussion_reply (thread_id, parent_reply_id, body, created_by_student_id, created_by_lecturer_id)
SELECT
  t.thread_id,
  NULL,
  CONCAT('Reply to thread ', t.thread_id),
  MOD(t.thread_id, 100000) + 1,
  NULL
FROM discussion_thread t;

-- Nested replies for every 10th thread
INSERT INTO discussion_reply (thread_id, parent_reply_id, body, created_by_student_id, created_by_lecturer_id)
SELECT
  r.thread_id,
  r.reply_id,
  CONCAT('Nested reply to reply ', r.reply_id),
  MOD(r.reply_id + 1, 100000) + 1,
  NULL
FROM discussion_reply r
WHERE r.parent_reply_id IS NULL AND MOD(r.thread_id, 10) = 0;

-- Submissions for assignments in the first 20 courses (students 1..1000)
INSERT INTO submission (assignment_id, student_id, content_url)
SELECT
  a.assignment_id,
  cs.student_id,
  CONCAT('https://example.com/submissions/', a.assignment_id, '/', cs.student_id)
FROM assignment a
JOIN section_item si ON si.section_item_id = a.assignment_id
JOIN section s ON s.section_id = si.section_id
JOIN course_student cs ON cs.course_id = s.course_id
WHERE s.course_id <= 20 AND cs.student_id <= 1000;
