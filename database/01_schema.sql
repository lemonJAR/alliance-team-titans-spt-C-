-- Student Performance Tracker - MySQL 8 schema
-- Run in MySQL Workbench as root.
DROP DATABASE IF EXISTS spt_db;

CREATE DATABASE spt_db CHARACTER
SET
    utf8mb4 COLLATE utf8mb4_unicode_ci;

USE spt_db;

-- ───────── School structure ─────────
CREATE TABLE
    colleges (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(150) NOT NULL
    );

CREATE TABLE
    programs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        college_id INT NOT NULL,
        code VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(150) NOT NULL,
        FOREIGN KEY (college_id) REFERENCES colleges (id)
    );

CREATE TABLE
    subjects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        program_id INT NOT NULL,
        code VARCHAR(20) NOT NULL,
        name VARCHAR(150) NOT NULL,
        units INT NOT NULL DEFAULT 3,
        year_level TINYINT NOT NULL,
        semester TINYINT NOT NULL,
        UNIQUE KEY uq_subject (program_id, code),
        FOREIGN KEY (program_id) REFERENCES programs (id)
    );

CREATE TABLE
    subject_prerequisites (
        subject_id INT NOT NULL,
        prerequisite_id INT NOT NULL,
        PRIMARY KEY (subject_id, prerequisite_id),
        FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE,
        FOREIGN KEY (prerequisite_id) REFERENCES subjects (id) ON DELETE CASCADE
    );

CREATE TABLE
    semester_loads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        program_id INT NOT NULL,
        year_level TINYINT NOT NULL,
        semester TINYINT NOT NULL,
        max_units INT NOT NULL DEFAULT 27,
        UNIQUE KEY uq_load (program_id, year_level, semester),
        FOREIGN KEY (program_id) REFERENCES programs (id)
    );

-- ───────── Users ─────────
CREATE TABLE
    users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(190) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM ('ADMIN', 'PROFESSOR', 'STUDENT') NOT NULL,
        first_name VARCHAR(80) NOT NULL,
        middle_name VARCHAR(80) NULL,
        last_name VARCHAR(80) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        email_verified BOOLEAN NOT NULL DEFAULT FALSE,
        fcm_token VARCHAR(255) NULL,
        date_joined DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

-- Registrar pre-loads student IDs; user_id stays NULL until the student signs up.
CREATE TABLE
    students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL UNIQUE,
        student_id_no VARCHAR(30) NOT NULL UNIQUE,
        program_id INT NULL,
        year_level TINYINT NOT NULL DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
        FOREIGN KEY (program_id) REFERENCES programs (id)
    );

CREATE TABLE
    teachers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        employee_id VARCHAR(30) NOT NULL UNIQUE,
        college_id INT NULL,
        department_code VARCHAR(20) NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (college_id) REFERENCES colleges (id)
    );

CREATE TABLE
    teacher_subjects (
        teacher_id INT NOT NULL,
        subject_id INT NOT NULL,
        PRIMARY KEY (teacher_id, subject_id),
        FOREIGN KEY (teacher_id) REFERENCES teachers (id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE
    );

-- Used for email verification and password reset links.
CREATE TABLE
    email_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(100) NOT NULL UNIQUE,
        purpose ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD') NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

-- ───────── Terms, offerings, enrollment ─────────
CREATE TABLE
    academic_terms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        school_year VARCHAR(20) NOT NULL, -- e.g. 2025-2026
        semester TINYINT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT FALSE,
        UNIQUE KEY uq_term (school_year, semester)
    );

CREATE TABLE
    offerings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        term_id INT NOT NULL,
        subject_id INT NOT NULL,
        teacher_id INT NULL,
        offer_code VARCHAR(30) NOT NULL UNIQUE,
        schedule VARCHAR(120) NOT NULL DEFAULT 'TBA',
        room VARCHAR(60) NULL,
        max_slots INT NOT NULL DEFAULT 40,
        current_slots INT NOT NULL DEFAULT 0,
        FOREIGN KEY (term_id) REFERENCES academic_terms (id),
        FOREIGN KEY (subject_id) REFERENCES subjects (id),
        FOREIGN KEY (teacher_id) REFERENCES teachers (id)
    );

CREATE TABLE
    enrollments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        subject_id INT NOT NULL,
        term_id INT NOT NULL,
        offering_id INT NULL,
        request_status ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ENROLLED') NOT NULL DEFAULT 'PENDING',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        enrolled_at DATETIME NULL,
        UNIQUE KEY uq_enroll (student_id, subject_id, term_id),
        FOREIGN KEY (student_id) REFERENCES students (id),
        FOREIGN KEY (subject_id) REFERENCES subjects (id),
        FOREIGN KEY (term_id) REFERENCES academic_terms (id),
        FOREIGN KEY (offering_id) REFERENCES offerings (id)
    );

-- ───────── Grades (WBS Modules 2 & 3) ─────────
-- Philippine scale: 1.00 (highest) to 5.00; passing is <= 3.00
CREATE TABLE
    grades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        enrollment_id INT NOT NULL UNIQUE, -- one grade record per enrollment
        prelim DECIMAL(3, 2) NULL,
        midterm DECIMAL(3, 2) NULL,
        finals DECIMAL(3, 2) NULL,
        remarks VARCHAR(500) NULL, -- teacher feedback per grade
        entered_by INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT chk_prelim CHECK (
            prelim IS NULL
            OR prelim BETWEEN 1.00 AND 5.00
        ),
        CONSTRAINT chk_midterm CHECK (
            midterm IS NULL
            OR midterm BETWEEN 1.00 AND 5.00
        ),
        CONSTRAINT chk_finals CHECK (
            finals IS NULL
            OR finals BETWEEN 1.00 AND 5.00
        ),
        FOREIGN KEY (enrollment_id) REFERENCES enrollments (id) ON DELETE CASCADE,
        FOREIGN KEY (entered_by) REFERENCES users (id)
    );

-- Grade history / timeline (WBS: Grade History/Timeline)
CREATE TABLE
    grade_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        grade_id INT NOT NULL,
        changed_by INT NOT NULL,
        action ENUM ('CREATE', 'UPDATE', 'DELETE') NOT NULL,
        old_values JSON NULL,
        new_values JSON NULL,
        changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_gh_grade (grade_id),
        FOREIGN KEY (changed_by) REFERENCES users (id)
    );

-- ───────── Audit log (WBS: Audit Log/Modification History) ─────────
CREATE TABLE
    audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        actor_id INT NULL,
        actor_type VARCHAR(20) NULL,
        user_email VARCHAR(190) NULL,
        action VARCHAR(60) NOT NULL, -- e.g. GRADE_UPDATE, USER_DELETE
        entity VARCHAR(60) NULL,
        entity_id INT NULL,
        details TEXT NULL,
        ip_address VARCHAR(45) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_audit_action (action),
        INDEX idx_audit_actor (actor_id),
        INDEX idx_audit_date (created_at)
    );

CREATE TABLE
    notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        message VARCHAR(500) NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_notif_user (user_id, is_read),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );