-- Removes the IP address column from audit_logs (the admin page no longer shows or stores it).
-- Run once on databases created before this change. New databases built from 01_schema.sql don't need it.
ALTER TABLE audit_logs DROP COLUMN ip_address;
