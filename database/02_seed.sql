USE spt_db;

INSERT INTO
    colleges (code, name)
VALUES
    ('CCS', 'College of Computer Studies');

INSERT INTO
    programs (college_id, code, name)
VALUES
    (1, 'BSIT', 'BS Information Technology');

INSERT INTO
    subjects (
        program_id,
        code,
        name,
        units,
        year_level,
        semester
    )
VALUES
    (1, 'IT101', 'Introduction to Computing', 3, 1, 1),
    (1, 'IT102', 'Computer Programming 1', 3, 1, 1),
    (1, 'IT103', 'Computer Programming 2', 3, 1, 2);

INSERT INTO
    subject_prerequisites
VALUES
    (3, 2);

-- IT103 requires IT102
INSERT INTO
    semester_loads (program_id, year_level, semester, max_units)
VALUES
    (1, 1, 1, 27),
    (1, 1, 2, 27);

INSERT INTO
    academic_terms (
        school_year,
        semester,
        start_date,
        end_date,
        is_active
    )
VALUES
    ('2025-2026', 1, '2025-08-11', '2025-12-19', TRUE);

-- Pre-registered student IDs (sign-up checks these)
INSERT INTO
    students (student_id_no, program_id, year_level)
VALUES
    ('2025-0001', 1, 1),
    ('2025-0002', 1, 1),
    ('2025-0003', 1, 1);

-- The admin account is created by the backend in Step 4 (it needs a hashed password).