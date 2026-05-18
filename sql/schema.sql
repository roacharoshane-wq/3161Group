CREATE DATABASE IF NOT EXISTS comp3161;
USE comp3161;

CREATE TABLE admin (
  admin_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_admin_id INT UNSIGNED NULL,
  CONSTRAINT fk_admin_created_by
    FOREIGN KEY (created_by_admin_id)
    REFERENCES admin (admin_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE lecturer (
  lecturer_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_admin_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_lecturer_created_by
    FOREIGN KEY (created_by_admin_id)
    REFERENCES admin (admin_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE student (
  student_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_no VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_admin_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_student_created_by
    FOREIGN KEY (created_by_admin_id)
    REFERENCES admin (admin_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE course (
  course_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_code VARCHAR(20) NOT NULL UNIQUE,
  course_name VARCHAR(255) NOT NULL,
  created_by_admin_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_course_created_by
    FOREIGN KEY (created_by_admin_id)
    REFERENCES admin (admin_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE course_lecturer (
  course_id INT UNSIGNED NOT NULL,
  lecturer_id INT UNSIGNED NOT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (course_id, lecturer_id),
  CONSTRAINT fk_course_lecturer_course
    FOREIGN KEY (course_id)
    REFERENCES course (course_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_course_lecturer_lecturer
    FOREIGN KEY (lecturer_id)
    REFERENCES lecturer (lecturer_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE course_student (
  course_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  enrolled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (course_id, student_id),
  CONSTRAINT fk_course_student_course
    FOREIGN KEY (course_id)
    REFERENCES course (course_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_course_student_student
    FOREIGN KEY (student_id)
    REFERENCES student (student_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE section (
  section_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  position INT UNSIGNED NOT NULL,
  created_by_lecturer_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_section_course_position (course_id, position),
  CONSTRAINT fk_section_course
    FOREIGN KEY (course_id)
    REFERENCES course (course_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_section_created_by
    FOREIGN KEY (created_by_lecturer_id)
    REFERENCES lecturer (lecturer_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE section_item (
  section_item_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  section_id INT UNSIGNED NOT NULL,
  item_type ENUM('link', 'lecture_slide', 'assignment') NOT NULL,
  title VARCHAR(255) NOT NULL,
  created_by_lecturer_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_section_item_section
    FOREIGN KEY (section_id)
    REFERENCES section (section_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_section_item_created_by
    FOREIGN KEY (created_by_lecturer_id)
    REFERENCES lecturer (lecturer_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE section_link (
  section_item_id INT UNSIGNED PRIMARY KEY,
  url VARCHAR(2048) NOT NULL,
  CONSTRAINT fk_section_link_item
    FOREIGN KEY (section_item_id)
    REFERENCES section_item (section_item_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE section_lecture_slide (
  section_item_id INT UNSIGNED PRIMARY KEY,
  file_url VARCHAR(2048) NOT NULL,
  CONSTRAINT fk_section_slide_item
    FOREIGN KEY (section_item_id)
    REFERENCES section_item (section_item_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE assignment (
  assignment_id INT UNSIGNED PRIMARY KEY,
  description TEXT NULL,
  max_score INT UNSIGNED NOT NULL DEFAULT 100,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_assignment_item
    FOREIGN KEY (assignment_id)
    REFERENCES section_item (section_item_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE calendar_event (
  event_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  event_type ENUM('assignment_due', 'general') NOT NULL,
  event_at DATETIME NOT NULL,
  created_by_lecturer_id INT UNSIGNED NOT NULL,
  updated_by_lecturer_id INT UNSIGNED NULL,
  assignment_item_id INT UNSIGNED NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_calendar_event_course
    FOREIGN KEY (course_id)
    REFERENCES course (course_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_calendar_event_created_by
    FOREIGN KEY (created_by_lecturer_id)
    REFERENCES lecturer (lecturer_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_calendar_event_updated_by
    FOREIGN KEY (updated_by_lecturer_id)
    REFERENCES lecturer (lecturer_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_calendar_event_assignment_item
    FOREIGN KEY (assignment_item_id)
    REFERENCES section_item (section_item_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE discussion_forum (
  forum_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  created_by_lecturer_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_forum_course
    FOREIGN KEY (course_id)
    REFERENCES course (course_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_forum_created_by
    FOREIGN KEY (created_by_lecturer_id)
    REFERENCES lecturer (lecturer_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE discussion_thread (
  thread_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  forum_id INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_student_id INT UNSIGNED NULL,
  created_by_lecturer_id INT UNSIGNED NULL,
  CONSTRAINT fk_thread_forum
    FOREIGN KEY (forum_id)
    REFERENCES discussion_forum (forum_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_thread_student
    FOREIGN KEY (created_by_student_id)
    REFERENCES student (student_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_thread_lecturer
    FOREIGN KEY (created_by_lecturer_id)
    REFERENCES lecturer (lecturer_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE discussion_reply (
  reply_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  thread_id INT UNSIGNED NOT NULL,
  parent_reply_id INT UNSIGNED NULL,
  body TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_student_id INT UNSIGNED NULL,
  created_by_lecturer_id INT UNSIGNED NULL,
  CONSTRAINT fk_reply_thread
    FOREIGN KEY (thread_id)
    REFERENCES discussion_thread (thread_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_reply_parent
    FOREIGN KEY (parent_reply_id)
    REFERENCES discussion_reply (reply_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_reply_student
    FOREIGN KEY (created_by_student_id)
    REFERENCES student (student_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_reply_lecturer
    FOREIGN KEY (created_by_lecturer_id)
    REFERENCES lecturer (lecturer_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE submission (
  submission_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  content_url VARCHAR(2048) NOT NULL,
  grade DECIMAL(5,2) NULL,
  UNIQUE KEY uq_submission_assignment_student (assignment_id, student_id),
  CONSTRAINT fk_submission_assignment
    FOREIGN KEY (assignment_id)
    REFERENCES assignment (assignment_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_submission_student
    FOREIGN KEY (student_id)
    REFERENCES student (student_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_course_student_student ON course_student (student_id);
CREATE INDEX idx_course_lecturer_lecturer ON course_lecturer (lecturer_id);
CREATE INDEX idx_section_course ON section (course_id);
CREATE INDEX idx_section_item_section ON section_item (section_id);
CREATE INDEX idx_calendar_event_course ON calendar_event (course_id);
CREATE INDEX idx_forum_course ON discussion_forum (course_id);
CREATE INDEX idx_thread_forum ON discussion_thread (forum_id);
CREATE INDEX idx_reply_thread ON discussion_reply (thread_id);





