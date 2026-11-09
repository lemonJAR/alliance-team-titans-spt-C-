-- Step 4: offerings need a schedule and a room (the frontend sends and shows both).
-- Run once in MySQL Workbench against spt_db. Do NOT re-run 01_schema.sql on a database with data: it drops spt_db.
-- Also copy these two columns into the offerings table in 01_schema.sql so fresh installs get them.
USE spt_db;

ALTER TABLE offerings
    ADD COLUMN schedule VARCHAR(120) NOT NULL DEFAULT 'TBA' AFTER offer_code,
    ADD COLUMN room VARCHAR(60) NULL AFTER schedule;