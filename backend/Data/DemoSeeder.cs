using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SptApi.Models;
using SptApi.Services;

namespace SptApi.Data;

// Demo / test data for development. Generated from the same dataset as database/04_demo_seed.sql.
//
// Turn it on with  "Seed": { "DemoData": true }  in appsettings.Development.json (see Program.cs).
// It runs once: if prof.santos@spt.local already exists it does nothing, so it is safe to leave switched on.
// Everything it creates is additive - existing rows (colleges, programs, subjects, terms, students) are reused.
//
// Logins: every demo account uses the password below. The admin account comes from DbSeeder.SeedAdminAsync.
public static class DemoSeeder
{
    private const string DemoPassword = "Password123";
    private const string DemoMarkerEmail = "prof.santos@spt.local";
    private const string SeedAdminLabel = "admin@spt.local";   // stands in for whichever admin account exists

    private sealed record SubjectSeed(string Program, string Code, string Name, int Units, int Year, int Sem);
    private sealed record TermSeed(string SchoolYear, int Sem, string Start, string End, bool Active);
    private sealed record TeacherSeed(string Email, string First, string Last, string EmpId, string College, string Dept, string[] Subjects);
    private sealed record StudentSeed(string No, string Email, string First, string? Middle, string Last, string Program, int Year, bool Active, bool Verified);
    private sealed record OfferingSeed(string Sy, int Sem, string Subject, int Section, string Emp, string Schedule, string Room, int Max);
    private sealed record EnrollSeed(string No, string Sy, int Sem, string Subject, string Status, int? Section, decimal? Prelim, decimal? Midterm, decimal? Finals, string? Remarks);
    private sealed record AuditSeed(int HoursAgo, string? Email, string? Role, string Action, string Entity, string Details, string Ip);

    // ───────── Data ─────────
    private static readonly (string Code, string Name)[] Colleges = [
        ("CBA", "College of Business Administration")
    ];
    private static readonly (string College, string Code, string Name)[] Programs = [
        ("CCS", "BSCS", "BS Computer Science"),
        ("CBA", "BSBA", "BS Business Administration")
    ];
    private static readonly SubjectSeed[] Subjects = [
        new("BSIT", "IT101", "Introduction to Computing", 3, 1, 1),
        new("BSIT", "IT102", "Computer Programming 1", 3, 1, 1),
        new("BSIT", "GE101", "Understanding the Self", 3, 1, 1),
        new("BSIT", "GE102", "Mathematics in the Modern World", 3, 1, 1),
        new("BSIT", "PE101", "Physical Education 1", 2, 1, 1),
        new("BSIT", "IT103", "Computer Programming 2", 3, 1, 2),
        new("BSIT", "IT104", "Discrete Mathematics", 3, 1, 2),
        new("BSIT", "GE103", "Purposive Communication", 3, 1, 2),
        new("BSIT", "PE102", "Physical Education 2", 2, 1, 2),
        new("BSIT", "IT201", "Data Structures and Algorithms", 3, 2, 1),
        new("BSIT", "IT202", "Database Management Systems", 3, 2, 1),
        new("BSIT", "IT203", "Web Systems and Technologies", 3, 2, 1),
        new("BSCS", "CS101", "Introduction to Computer Science", 3, 1, 1),
        new("BSCS", "CS102", "Programming Fundamentals", 3, 1, 1),
        new("BSCS", "CS103", "Object-Oriented Programming", 3, 1, 2),
        new("BSBA", "BA101", "Principles of Management", 3, 1, 1),
        new("BSBA", "BA102", "Financial Accounting", 3, 1, 1)
    ];
    private static readonly (string Subject, string Requires)[] Prerequisites = [
        ("IT103", "IT102"),
        ("IT201", "IT103"),
        ("IT202", "IT103"),
        ("CS103", "CS102")
    ];
    private static readonly (string Program, int Year, int Sem, int MaxUnits)[] Loads = [
        ("BSIT", 2, 1, 27),
        ("BSCS", 1, 1, 27),
        ("BSCS", 1, 2, 27),
        ("BSBA", 1, 1, 24)
    ];
    private static readonly TermSeed[] Terms = [
        new("2024-2025", 1, "2024-08-12", "2024-12-20", false),
        new("2024-2025", 2, "2025-01-13", "2025-05-23", false),
        new("2025-2026", 1, "2025-08-11", "2025-12-19", true),
        new("2025-2026", 2, "2026-01-12", "2026-05-22", false)
    ];
    private static readonly TeacherSeed[] Teachers = [
        new("prof.santos@spt.local", "Maria", "Santos", "EMP-0001", "CCS", "IT", ["IT101", "IT104", "IT201", "IT203"]),
        new("prof.reyes@spt.local", "Juan", "Reyes", "EMP-0002", "CCS", "IT", ["IT101", "IT102", "IT103", "IT202"]),
        new("prof.cruz@spt.local", "Ana", "Cruz", "EMP-0003", "CCS", "CS", ["CS101", "CS102", "CS103"]),
        new("prof.lim@spt.local", "Carlo", "Lim", "EMP-0004", "CBA", "BA", ["BA101", "BA102"]),
        new("prof.ocampo@spt.local", "Liza", "Ocampo", "EMP-0005", "CBA", "GE", ["GE101", "GE102", "PE101"])
    ];
    private static readonly StudentSeed[] Students = [
        new("2025-0001", "mark.delacruz@student.spt.local", "Mark", null, "Dela Cruz", "BSIT", 1, true, true),
        new("2025-0002", "jane.villanueva@student.spt.local", "Jane", "Marie", "Villanueva", "BSIT", 1, true, true),
        new("2025-0004", "paolo.ramirez@student.spt.local", "Paolo", null, "Ramirez", "BSIT", 1, true, true),
        new("2025-0005", "sofia.garcia@student.spt.local", "Sofia", null, "Garcia", "BSIT", 1, true, true),
        new("2025-0006", "miguel.torres@student.spt.local", "Miguel", null, "Torres", "BSIT", 1, true, true),
        new("2025-0007", "bianca.flores@student.spt.local", "Bianca", null, "Flores", "BSIT", 1, true, true),
        new("2025-0008", "nathan.aquino@student.spt.local", "Nathan", null, "Aquino", "BSCS", 1, true, true),
        new("2025-0009", "isabel.mendoza@student.spt.local", "Isabel", null, "Mendoza", "BSCS", 1, true, true),
        new("2025-0010", "rafael.bautista@student.spt.local", "Rafael", null, "Bautista", "BSBA", 1, false, true),
        new("2025-0011", "camille.navarro@student.spt.local", "Camille", null, "Navarro", "BSIT", 2, true, true),
        new("2025-0012", "joshua.pascual@student.spt.local", "Joshua", null, "Pascual", "BSIT", 2, true, false)
    ];
    // Pre-registered IDs nobody has claimed yet, for testing the sign-up flow.
    private static readonly (string No, string Program, int Year)[] Unclaimed = [
        ("2025-0003", "BSIT", 1),
        ("2025-0013", "BSIT", 1),
        ("2025-0014", "BSCS", 1)
    ];
    private static readonly OfferingSeed[] Offerings = [
        new("2024-2025", 1, "IT101", 1, "EMP-0001", "MWF 08:00-09:00", "Room 101", 40),
        new("2024-2025", 1, "IT102", 1, "EMP-0002", "TTh 09:00-10:30", "Lab 1", 40),
        new("2024-2025", 2, "IT103", 1, "EMP-0002", "MWF 10:00-11:00", "Lab 2", 40),
        new("2024-2025", 2, "IT104", 1, "EMP-0001", "TTh 13:00-14:30", "Room 102", 40),
        new("2025-2026", 1, "IT101", 1, "EMP-0001", "MWF 08:00-09:00", "Room 101", 40),
        new("2025-2026", 1, "IT101", 2, "EMP-0002", "TTh 08:00-09:30", "Room 102", 40),
        new("2025-2026", 1, "IT102", 1, "EMP-0002", "MWF 09:00-10:00", "Lab 1", 40),
        new("2025-2026", 1, "GE101", 1, "EMP-0005", "MW 13:00-14:30", "Room 201", 40),
        new("2025-2026", 1, "GE102", 1, "EMP-0005", "TTh 13:00-14:30", "Room 202", 40),
        new("2025-2026", 1, "PE101", 1, "EMP-0005", "F 15:00-17:00", "Gym", 40),
        new("2025-2026", 1, "IT201", 1, "EMP-0001", "MWF 10:00-11:00", "Lab 2", 40),
        new("2025-2026", 1, "IT202", 1, "EMP-0002", "TTh 10:30-12:00", "Lab 3", 2),
        new("2025-2026", 1, "IT203", 1, "EMP-0001", "MW 15:00-16:30", "Lab 1", 40),
        new("2025-2026", 1, "CS101", 1, "EMP-0003", "MWF 13:00-14:00", "Room 301", 40),
        new("2025-2026", 1, "CS102", 1, "EMP-0003", "TTh 15:00-16:30", "Lab 4", 40),
        new("2025-2026", 1, "BA101", 1, "EMP-0004", "MWF 14:00-15:00", "Room 401", 40),
        new("2025-2026", 1, "BA102", 1, "EMP-0004", "TTh 08:00-09:30", "Room 402", 40)
    ];
    private static readonly EnrollSeed[] Enrollments = [
        new("2025-0001", "2025-2026", 1, "IT101", "ENROLLED", 1, 1.50m, 1.75m, 1.50m, "Strong lab work."),
        new("2025-0001", "2025-2026", 1, "IT102", "ENROLLED", 1, 2.00m, 2.25m, 2.00m, null),
        new("2025-0001", "2025-2026", 1, "GE101", "ENROLLED", 1, 1.25m, 1.50m, null, null),
        new("2025-0001", "2025-2026", 1, "GE102", "ENROLLED", 1, 2.50m, 2.75m, null, null),
        new("2025-0001", "2025-2026", 1, "PE101", "ENROLLED", 1, 1.00m, 1.00m, 1.25m, null),
        new("2025-0002", "2025-2026", 1, "IT101", "ENROLLED", 1, 1.25m, 1.25m, 1.50m, null),
        new("2025-0002", "2025-2026", 1, "IT102", "ENROLLED", 1, 1.75m, 2.00m, null, null),
        new("2025-0002", "2025-2026", 1, "GE101", "ENROLLED", 1, 1.50m, null, null, null),
        new("2025-0002", "2025-2026", 1, "GE102", "PENDING", null, null, null, null, null),
        new("2025-0002", "2025-2026", 1, "PE101", "APPROVED", null, null, null, null, null),
        new("2025-0004", "2025-2026", 1, "IT101", "ENROLLED", 2, 2.75m, 3.00m, 3.00m, null),
        new("2025-0004", "2025-2026", 1, "IT102", "ENROLLED", 1, 3.00m, 3.50m, null, "Needs to improve on exercises."),
        new("2025-0004", "2025-2026", 1, "GE101", "ENROLLED", 1, null, null, null, null),
        new("2025-0004", "2025-2026", 1, "GE102", "ENROLLED", 1, 5.00m, 4.00m, null, "Please see the instructor about make-up work."),
        new("2025-0005", "2025-2026", 1, "IT101", "ENROLLED", 2, 1.00m, 1.25m, 1.25m, "Excellent performance."),
        new("2025-0005", "2025-2026", 1, "IT102", "ENROLLED", 1, 1.25m, 1.50m, 1.25m, null),
        new("2025-0005", "2025-2026", 1, "GE102", "PENDING", null, null, null, null, null),
        new("2025-0005", "2025-2026", 1, "PE101", "PENDING", null, null, null, null, null),
        new("2025-0006", "2025-2026", 1, "IT101", "ENROLLED", 1, 2.25m, 2.50m, null, null),
        new("2025-0006", "2025-2026", 1, "IT102", "PENDING", null, null, null, null, null),
        new("2025-0006", "2025-2026", 1, "GE101", "REJECTED", null, null, null, null, null),
        new("2025-0007", "2025-2026", 1, "IT101", "APPROVED", null, null, null, null, null),
        new("2025-0007", "2025-2026", 1, "IT102", "APPROVED", null, null, null, null, null),
        new("2025-0007", "2025-2026", 1, "GE101", "PENDING", null, null, null, null, null),
        new("2025-0008", "2025-2026", 1, "CS101", "ENROLLED", 1, 1.75m, 2.00m, 1.75m, null),
        new("2025-0008", "2025-2026", 1, "CS102", "ENROLLED", 1, 2.25m, null, null, null),
        new("2025-0009", "2025-2026", 1, "CS101", "ENROLLED", 1, 1.50m, 1.50m, null, null),
        new("2025-0009", "2025-2026", 1, "CS102", "ENROLLED", 1, 1.25m, 1.50m, 1.50m, null),
        new("2025-0010", "2025-2026", 1, "BA101", "ENROLLED", 1, 3.00m, 3.25m, null, null),
        new("2025-0011", "2024-2025", 1, "IT101", "ENROLLED", 1, 1.50m, 1.50m, 1.75m, null),
        new("2025-0011", "2024-2025", 1, "IT102", "ENROLLED", 1, 1.75m, 1.75m, 2.00m, null),
        new("2025-0011", "2024-2025", 2, "IT103", "ENROLLED", 1, 1.50m, 1.75m, 1.50m, null),
        new("2025-0011", "2024-2025", 2, "IT104", "ENROLLED", 1, 2.00m, 2.25m, 2.25m, null),
        new("2025-0011", "2025-2026", 1, "IT201", "ENROLLED", 1, 1.75m, 2.00m, null, null),
        new("2025-0011", "2025-2026", 1, "IT202", "ENROLLED", 1, 2.00m, null, null, null),
        new("2025-0011", "2025-2026", 1, "IT203", "PENDING", null, null, null, null, null),
        new("2025-0012", "2024-2025", 1, "IT101", "ENROLLED", 1, 2.50m, 2.75m, 2.75m, null),
        new("2025-0012", "2024-2025", 1, "IT102", "ENROLLED", 1, 3.00m, 3.00m, 3.00m, null),
        new("2025-0012", "2024-2025", 2, "IT103", "ENROLLED", 1, 3.25m, 3.50m, 3.00m, null),
        new("2025-0012", "2024-2025", 2, "IT104", "ENROLLED", 1, 2.75m, 3.00m, 3.00m, null),
        new("2025-0012", "2025-2026", 1, "IT202", "PENDING", null, null, null, null, null),
        new("2025-0012", "2025-2026", 1, "IT203", "PENDING", null, null, null, null, null)
    ];
    private static readonly (string Email, string Message, bool IsRead, int HoursAgo)[] Notes = [
        ("mark.delacruz@student.spt.local", "Welcome to the Student Performance Tracker. Your account is ready.", true, 900),
        ("jane.villanueva@student.spt.local", "Welcome to the Student Performance Tracker. Your account is ready.", true, 897),
        ("paolo.ramirez@student.spt.local", "Welcome to the Student Performance Tracker. Your account is ready.", true, 894),
        ("sofia.garcia@student.spt.local", "Welcome to the Student Performance Tracker. Your account is ready.", true, 891),
        ("miguel.torres@student.spt.local", "Welcome to the Student Performance Tracker. Your account is ready.", true, 888),
        ("bianca.flores@student.spt.local", "Welcome to the Student Performance Tracker. Your account is ready.", true, 885),
        ("nathan.aquino@student.spt.local", "Welcome to the Student Performance Tracker. Your account is ready.", true, 882),
        ("isabel.mendoza@student.spt.local", "Welcome to the Student Performance Tracker. Your account is ready.", true, 879),
        ("rafael.bautista@student.spt.local", "Welcome to the Student Performance Tracker. Your account is ready.", true, 876),
        ("camille.navarro@student.spt.local", "Welcome to the Student Performance Tracker. Your account is ready.", true, 873),
        ("joshua.pascual@student.spt.local", "Welcome to the Student Performance Tracker. Your account is ready.", true, 870),
        ("prof.santos@spt.local", "Welcome to the Student Performance Tracker. Your professor account is ready.", true, 867),
        ("prof.reyes@spt.local", "Welcome to the Student Performance Tracker. Your professor account is ready.", true, 864),
        ("prof.cruz@spt.local", "Welcome to the Student Performance Tracker. Your professor account is ready.", true, 861),
        ("prof.lim@spt.local", "Welcome to the Student Performance Tracker. Your professor account is ready.", true, 858),
        ("prof.ocampo@spt.local", "Welcome to the Student Performance Tracker. Your professor account is ready.", true, 855),
        ("prof.santos@spt.local", "New class assigned: IT101 section 1 (MWF 08:00-09:00, Room 101).", true, 600),
        ("prof.reyes@spt.local", "New class assigned: IT101 section 2 (TTh 08:00-09:30, Room 102).", true, 600),
        ("prof.reyes@spt.local", "New class assigned: IT102 section 1 (MWF 09:00-10:00, Lab 1).", true, 600),
        ("prof.ocampo@spt.local", "New class assigned: GE101 section 1 (MW 13:00-14:30, Room 201).", true, 600),
        ("prof.ocampo@spt.local", "New class assigned: GE102 section 1 (TTh 13:00-14:30, Room 202).", true, 600),
        ("prof.ocampo@spt.local", "New class assigned: PE101 section 1 (F 15:00-17:00, Gym).", true, 600),
        ("prof.santos@spt.local", "New class assigned: IT201 section 1 (MWF 10:00-11:00, Lab 2).", true, 600),
        ("prof.reyes@spt.local", "New class assigned: IT202 section 1 (TTh 10:30-12:00, Lab 3).", true, 600),
        ("prof.santos@spt.local", "New class assigned: IT203 section 1 (MW 15:00-16:30, Lab 1).", true, 600),
        ("prof.cruz@spt.local", "New class assigned: CS101 section 1 (MWF 13:00-14:00, Room 301).", true, 600),
        ("prof.cruz@spt.local", "New class assigned: CS102 section 1 (TTh 15:00-16:30, Lab 4).", true, 600),
        ("prof.lim@spt.local", "New class assigned: BA101 section 1 (MWF 14:00-15:00, Room 401).", true, 600),
        ("prof.lim@spt.local", "New class assigned: BA102 section 1 (TTh 08:00-09:30, Room 402).", true, 600),
        ("mark.delacruz@student.spt.local", "Your IT101 grade was updated: prelim 1.50, midterm 1.75, finals 1.50.", false, 200),
        ("mark.delacruz@student.spt.local", "Your IT102 grade was updated: prelim 2.00, midterm 2.25, finals 2.00.", true, 194),
        ("mark.delacruz@student.spt.local", "Your GE101 grade was updated: prelim 1.25, midterm 1.50.", true, 188),
        ("mark.delacruz@student.spt.local", "Your GE102 grade was updated: prelim 2.50, midterm 2.75.", false, 182),
        ("mark.delacruz@student.spt.local", "Your PE101 grade was updated: prelim 1.00, midterm 1.00, finals 1.25.", true, 176),
        ("jane.villanueva@student.spt.local", "Your IT101 grade was updated: prelim 1.25, midterm 1.25, finals 1.50.", true, 170),
        ("jane.villanueva@student.spt.local", "Your IT102 grade was updated: prelim 1.75, midterm 2.00.", false, 164),
        ("jane.villanueva@student.spt.local", "Your GE101 grade was updated: prelim 1.50.", true, 158),
        ("paolo.ramirez@student.spt.local", "Your IT101 grade was updated: prelim 2.75, midterm 3.00, finals 3.00.", true, 152),
        ("paolo.ramirez@student.spt.local", "Your IT102 grade was updated: prelim 3.00, midterm 3.50.", false, 146),
        ("paolo.ramirez@student.spt.local", "Your GE102 grade was updated: prelim 5.00, midterm 4.00.", true, 140),
        ("sofia.garcia@student.spt.local", "Your IT101 grade was updated: prelim 1.00, midterm 1.25, finals 1.25.", true, 134),
        ("sofia.garcia@student.spt.local", "Your IT102 grade was updated: prelim 1.25, midterm 1.50, finals 1.25.", false, 128),
        ("miguel.torres@student.spt.local", "Your IT101 grade was updated: prelim 2.25, midterm 2.50.", true, 122),
        ("nathan.aquino@student.spt.local", "Your CS101 grade was updated: prelim 1.75, midterm 2.00, finals 1.75.", true, 116),
        ("nathan.aquino@student.spt.local", "Your CS102 grade was updated: prelim 2.25.", false, 110),
        ("isabel.mendoza@student.spt.local", "Your CS101 grade was updated: prelim 1.50, midterm 1.50.", true, 104),
        ("isabel.mendoza@student.spt.local", "Your CS102 grade was updated: prelim 1.25, midterm 1.50, finals 1.50.", true, 98),
        ("rafael.bautista@student.spt.local", "Your BA101 grade was updated: prelim 3.00, midterm 3.25.", false, 92),
        ("camille.navarro@student.spt.local", "Your IT201 grade was updated: prelim 1.75, midterm 2.00.", true, 86),
        ("camille.navarro@student.spt.local", "Your IT202 grade was updated: prelim 2.00.", true, 80),
        ("jane.villanueva@student.spt.local", "Your enrollment request for PE101 was approved. Choose a class to finish enrolling.", false, 70),
        ("miguel.torres@student.spt.local", "Your enrollment request for GE101 was rejected by the administrator.", false, 66),
        ("bianca.flores@student.spt.local", "Your enrollment request for IT101 was approved. Choose a class to finish enrolling.", false, 70),
        ("bianca.flores@student.spt.local", "Your enrollment request for IT102 was approved. Choose a class to finish enrolling.", false, 70)
    ];
    private static readonly AuditSeed[] Audit = [
        new(1000, "admin@spt.local", "ADMIN", "COLLEGE_CREATE", "College", "Added college CBA - College of Business Administration", "192.0.2.10"),
        new(998, "admin@spt.local", "ADMIN", "PROGRAM_CREATE", "Program", "Added program BSCS - BS Computer Science", "192.0.2.10"),
        new(996, "admin@spt.local", "ADMIN", "PROGRAM_CREATE", "Program", "Added program BSBA - BS Business Administration", "192.0.2.10"),
        new(994, "admin@spt.local", "ADMIN", "SUBJECT_CREATE", "Subject", "Added subject CS101 - Introduction to Computer Science", "192.0.2.10"),
        new(993, "admin@spt.local", "ADMIN", "SUBJECT_CREATE", "Subject", "Added subject CS102 - Programming Fundamentals", "192.0.2.10"),
        new(992, "admin@spt.local", "ADMIN", "SUBJECT_CREATE", "Subject", "Added subject CS103 - Object-Oriented Programming", "192.0.2.10"),
        new(991, "admin@spt.local", "ADMIN", "SUBJECT_CREATE", "Subject", "Added subject BA101 - Principles of Management", "192.0.2.10"),
        new(990, "admin@spt.local", "ADMIN", "SUBJECT_CREATE", "Subject", "Added subject BA102 - Financial Accounting", "192.0.2.10"),
        new(989, "admin@spt.local", "ADMIN", "TERM_CREATE", "AcademicTerm", "Created term 2024-2025 semester 1", "192.0.2.10"),
        new(987, "admin@spt.local", "ADMIN", "TERM_CREATE", "AcademicTerm", "Created term 2024-2025 semester 2", "192.0.2.10"),
        new(985, "admin@spt.local", "ADMIN", "TERM_CREATE", "AcademicTerm", "Created term 2025-2026 semester 1", "192.0.2.10"),
        new(983, "admin@spt.local", "ADMIN", "TERM_CREATE", "AcademicTerm", "Created term 2025-2026 semester 2", "192.0.2.10"),
        new(981, "admin@spt.local", "ADMIN", "TEACHER_CREATE", "Teacher", "Admin created professor account prof.santos@spt.local", "192.0.2.10"),
        new(978, "admin@spt.local", "ADMIN", "TEACHER_CREATE", "Teacher", "Admin created professor account prof.reyes@spt.local", "192.0.2.10"),
        new(975, "admin@spt.local", "ADMIN", "TEACHER_CREATE", "Teacher", "Admin created professor account prof.cruz@spt.local", "192.0.2.10"),
        new(972, "admin@spt.local", "ADMIN", "TEACHER_CREATE", "Teacher", "Admin created professor account prof.lim@spt.local", "192.0.2.10"),
        new(969, "admin@spt.local", "ADMIN", "TEACHER_CREATE", "Teacher", "Admin created professor account prof.ocampo@spt.local", "192.0.2.10"),
        new(966, "mark.delacruz@student.spt.local", "STUDENT", "REGISTER", "User", "New STUDENT account registered", "192.0.2.21"),
        new(965, "mark.delacruz@student.spt.local", "STUDENT", "EMAIL_VERIFIED", "User", "Email address verified", "192.0.2.21"),
        new(964, "jane.villanueva@student.spt.local", "STUDENT", "REGISTER", "User", "New STUDENT account registered", "192.0.2.22"),
        new(963, "jane.villanueva@student.spt.local", "STUDENT", "EMAIL_VERIFIED", "User", "Email address verified", "192.0.2.22"),
        new(962, "paolo.ramirez@student.spt.local", "STUDENT", "REGISTER", "User", "New STUDENT account registered", "192.0.2.24"),
        new(961, "paolo.ramirez@student.spt.local", "STUDENT", "EMAIL_VERIFIED", "User", "Email address verified", "192.0.2.24"),
        new(960, "sofia.garcia@student.spt.local", "STUDENT", "REGISTER", "User", "New STUDENT account registered", "192.0.2.25"),
        new(959, "sofia.garcia@student.spt.local", "STUDENT", "EMAIL_VERIFIED", "User", "Email address verified", "192.0.2.25"),
        new(958, "miguel.torres@student.spt.local", "STUDENT", "REGISTER", "User", "New STUDENT account registered", "192.0.2.26"),
        new(957, "miguel.torres@student.spt.local", "STUDENT", "EMAIL_VERIFIED", "User", "Email address verified", "192.0.2.26"),
        new(956, "bianca.flores@student.spt.local", "STUDENT", "REGISTER", "User", "New STUDENT account registered", "192.0.2.27"),
        new(955, "bianca.flores@student.spt.local", "STUDENT", "EMAIL_VERIFIED", "User", "Email address verified", "192.0.2.27"),
        new(954, "nathan.aquino@student.spt.local", "STUDENT", "REGISTER", "User", "New STUDENT account registered", "192.0.2.28"),
        new(953, "nathan.aquino@student.spt.local", "STUDENT", "EMAIL_VERIFIED", "User", "Email address verified", "192.0.2.28"),
        new(952, "isabel.mendoza@student.spt.local", "STUDENT", "REGISTER", "User", "New STUDENT account registered", "192.0.2.29"),
        new(951, "isabel.mendoza@student.spt.local", "STUDENT", "EMAIL_VERIFIED", "User", "Email address verified", "192.0.2.29"),
        new(950, "rafael.bautista@student.spt.local", "STUDENT", "REGISTER", "User", "New STUDENT account registered", "192.0.2.30"),
        new(949, "rafael.bautista@student.spt.local", "STUDENT", "EMAIL_VERIFIED", "User", "Email address verified", "192.0.2.30"),
        new(948, "camille.navarro@student.spt.local", "STUDENT", "REGISTER", "User", "New STUDENT account registered", "192.0.2.31"),
        new(947, "camille.navarro@student.spt.local", "STUDENT", "EMAIL_VERIFIED", "User", "Email address verified", "192.0.2.31"),
        new(946, "joshua.pascual@student.spt.local", "STUDENT", "REGISTER", "User", "New STUDENT account registered", "192.0.2.32"),
        new(945, "joshua.pascual@student.spt.local", "STUDENT", "LOGIN", "User", "User logged in", "192.0.2.32"),
        new(944, "admin@spt.local", "ADMIN", "OFFERING_CREATE", "Offering", "Created offering IT101 section 1 (MWF 08:00-09:00)", "192.0.2.10"),
        new(943, "admin@spt.local", "ADMIN", "OFFERING_CREATE", "Offering", "Created offering IT101 section 2 (TTh 08:00-09:30)", "192.0.2.10"),
        new(942, "admin@spt.local", "ADMIN", "OFFERING_CREATE", "Offering", "Created offering IT102 section 1 (MWF 09:00-10:00)", "192.0.2.10"),
        new(941, "admin@spt.local", "ADMIN", "OFFERING_CREATE", "Offering", "Created offering GE101 section 1 (MW 13:00-14:30)", "192.0.2.10"),
        new(940, "admin@spt.local", "ADMIN", "OFFERING_CREATE", "Offering", "Created offering GE102 section 1 (TTh 13:00-14:30)", "192.0.2.10"),
        new(939, "admin@spt.local", "ADMIN", "OFFERING_CREATE", "Offering", "Created offering PE101 section 1 (F 15:00-17:00)", "192.0.2.10"),
        new(938, "admin@spt.local", "ADMIN", "OFFERING_CREATE", "Offering", "Created offering IT201 section 1 (MWF 10:00-11:00)", "192.0.2.10"),
        new(937, "admin@spt.local", "ADMIN", "OFFERING_CREATE", "Offering", "Created offering IT202 section 1 (TTh 10:30-12:00)", "192.0.2.10"),
        new(936, "admin@spt.local", "ADMIN", "OFFERING_CREATE", "Offering", "Created offering IT203 section 1 (MW 15:00-16:30)", "192.0.2.10"),
        new(935, "admin@spt.local", "ADMIN", "OFFERING_CREATE", "Offering", "Created offering CS101 section 1 (MWF 13:00-14:00)", "192.0.2.10"),
        new(934, "admin@spt.local", "ADMIN", "OFFERING_CREATE", "Offering", "Created offering CS102 section 1 (TTh 15:00-16:30)", "192.0.2.10"),
        new(933, "admin@spt.local", "ADMIN", "OFFERING_CREATE", "Offering", "Created offering BA101 section 1 (MWF 14:00-15:00)", "192.0.2.10"),
        new(932, "admin@spt.local", "ADMIN", "OFFERING_CREATE", "Offering", "Created offering BA102 section 1 (TTh 08:00-09:30)", "192.0.2.10"),
        new(931, "mark.delacruz@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested IT101", "192.0.2.21"),
        new(930, "mark.delacruz@student.spt.local", "STUDENT", "ENROLLMENT_CONFIRMED", "Enrollment", "Confirmed IT101 section 1", "192.0.2.21"),
        new(929, "mark.delacruz@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested IT102", "192.0.2.21"),
        new(928, "mark.delacruz@student.spt.local", "STUDENT", "ENROLLMENT_CONFIRMED", "Enrollment", "Confirmed IT102 section 1", "192.0.2.21"),
        new(927, "mark.delacruz@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested GE101", "192.0.2.21"),
        new(926, "mark.delacruz@student.spt.local", "STUDENT", "ENROLLMENT_CONFIRMED", "Enrollment", "Confirmed GE101 section 1", "192.0.2.21"),
        new(925, "mark.delacruz@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested GE102", "192.0.2.21"),
        new(924, "mark.delacruz@student.spt.local", "STUDENT", "ENROLLMENT_CONFIRMED", "Enrollment", "Confirmed GE102 section 1", "192.0.2.21"),
        new(923, "mark.delacruz@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested PE101", "192.0.2.21"),
        new(922, "mark.delacruz@student.spt.local", "STUDENT", "ENROLLMENT_CONFIRMED", "Enrollment", "Confirmed PE101 section 1", "192.0.2.21"),
        new(921, "jane.villanueva@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested IT101", "192.0.2.22"),
        new(920, "jane.villanueva@student.spt.local", "STUDENT", "ENROLLMENT_CONFIRMED", "Enrollment", "Confirmed IT101 section 1", "192.0.2.22"),
        new(919, "jane.villanueva@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested IT102", "192.0.2.22"),
        new(918, "jane.villanueva@student.spt.local", "STUDENT", "ENROLLMENT_CONFIRMED", "Enrollment", "Confirmed IT102 section 1", "192.0.2.22"),
        new(917, "jane.villanueva@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested GE101", "192.0.2.22"),
        new(916, "jane.villanueva@student.spt.local", "STUDENT", "ENROLLMENT_CONFIRMED", "Enrollment", "Confirmed GE101 section 1", "192.0.2.22"),
        new(915, "jane.villanueva@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested GE102", "192.0.2.22"),
        new(914, "jane.villanueva@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested PE101", "192.0.2.22"),
        new(913, "admin@spt.local", "ADMIN", "ENROLLMENT_APPROVE", "Enrollment", "Approved PE101 for 2025-0002", "192.0.2.10"),
        new(912, "paolo.ramirez@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested IT101", "192.0.2.24"),
        new(911, "paolo.ramirez@student.spt.local", "STUDENT", "ENROLLMENT_CONFIRMED", "Enrollment", "Confirmed IT101 section 2", "192.0.2.24"),
        new(910, "paolo.ramirez@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested IT102", "192.0.2.24"),
        new(909, "paolo.ramirez@student.spt.local", "STUDENT", "ENROLLMENT_CONFIRMED", "Enrollment", "Confirmed IT102 section 1", "192.0.2.24"),
        new(908, "paolo.ramirez@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested GE101", "192.0.2.24"),
        new(907, "paolo.ramirez@student.spt.local", "STUDENT", "ENROLLMENT_CONFIRMED", "Enrollment", "Confirmed GE101 section 1", "192.0.2.24"),
        new(906, "paolo.ramirez@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested GE102", "192.0.2.24"),
        new(905, "paolo.ramirez@student.spt.local", "STUDENT", "ENROLLMENT_CONFIRMED", "Enrollment", "Confirmed GE102 section 1", "192.0.2.24"),
        new(904, "sofia.garcia@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested IT101", "192.0.2.25"),
        new(903, "sofia.garcia@student.spt.local", "STUDENT", "ENROLLMENT_CONFIRMED", "Enrollment", "Confirmed IT101 section 2", "192.0.2.25"),
        new(902, "sofia.garcia@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested IT102", "192.0.2.25"),
        new(901, "sofia.garcia@student.spt.local", "STUDENT", "ENROLLMENT_CONFIRMED", "Enrollment", "Confirmed IT102 section 1", "192.0.2.25"),
        new(900, "sofia.garcia@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested GE102", "192.0.2.25"),
        new(899, "sofia.garcia@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested PE101", "192.0.2.25"),
        new(898, "miguel.torres@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested IT101", "192.0.2.26"),
        new(897, "miguel.torres@student.spt.local", "STUDENT", "ENROLLMENT_CONFIRMED", "Enrollment", "Confirmed IT101 section 1", "192.0.2.26"),
        new(896, "miguel.torres@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested IT102", "192.0.2.26"),
        new(895, "miguel.torres@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested GE101", "192.0.2.26"),
        new(894, "admin@spt.local", "ADMIN", "ENROLLMENT_REJECT", "Enrollment", "Rejected GE101 for 2025-0006", "192.0.2.10"),
        new(893, "bianca.flores@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested IT101", "192.0.2.27"),
        new(892, "admin@spt.local", "ADMIN", "ENROLLMENT_APPROVE", "Enrollment", "Approved IT101 for 2025-0007", "192.0.2.10"),
        new(891, "bianca.flores@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested IT102", "192.0.2.27"),
        new(890, "admin@spt.local", "ADMIN", "ENROLLMENT_APPROVE", "Enrollment", "Approved IT102 for 2025-0007", "192.0.2.10"),
        new(889, "bianca.flores@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested GE101", "192.0.2.27"),
        new(888, "nathan.aquino@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested CS101", "192.0.2.28"),
        new(887, "nathan.aquino@student.spt.local", "STUDENT", "ENROLLMENT_CONFIRMED", "Enrollment", "Confirmed CS101 section 1", "192.0.2.28"),
        new(886, "nathan.aquino@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested CS102", "192.0.2.28"),
        new(885, "nathan.aquino@student.spt.local", "STUDENT", "ENROLLMENT_CONFIRMED", "Enrollment", "Confirmed CS102 section 1", "192.0.2.28"),
        new(884, "isabel.mendoza@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested CS101", "192.0.2.29"),
        new(883, "isabel.mendoza@student.spt.local", "STUDENT", "ENROLLMENT_CONFIRMED", "Enrollment", "Confirmed CS101 section 1", "192.0.2.29"),
        new(882, "isabel.mendoza@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested CS102", "192.0.2.29"),
        new(881, "isabel.mendoza@student.spt.local", "STUDENT", "ENROLLMENT_CONFIRMED", "Enrollment", "Confirmed CS102 section 1", "192.0.2.29"),
        new(880, "rafael.bautista@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested BA101", "192.0.2.30"),
        new(879, "rafael.bautista@student.spt.local", "STUDENT", "ENROLLMENT_CONFIRMED", "Enrollment", "Confirmed BA101 section 1", "192.0.2.30"),
        new(878, "camille.navarro@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested IT201", "192.0.2.31"),
        new(877, "camille.navarro@student.spt.local", "STUDENT", "ENROLLMENT_CONFIRMED", "Enrollment", "Confirmed IT201 section 1", "192.0.2.31"),
        new(876, "camille.navarro@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested IT202", "192.0.2.31"),
        new(875, "camille.navarro@student.spt.local", "STUDENT", "ENROLLMENT_CONFIRMED", "Enrollment", "Confirmed IT202 section 1", "192.0.2.31"),
        new(874, "camille.navarro@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested IT203", "192.0.2.31"),
        new(873, "joshua.pascual@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested IT202", "192.0.2.32"),
        new(872, "joshua.pascual@student.spt.local", "STUDENT", "ENROLLMENT_REQUEST", "Enrollment", "Requested IT203", "192.0.2.32"),
        new(871, "prof.santos@spt.local", "PROFESSOR", "GRADE_CREATE", "Grade", "IT101 / 2025-0001: prelim 1.50", "192.0.2.5"),
        new(870, "prof.santos@spt.local", "PROFESSOR", "GRADE_UPDATE", "Grade", "IT101 / 2025-0001: midterm 1.75", "192.0.2.5"),
        new(869, "prof.reyes@spt.local", "PROFESSOR", "GRADE_CREATE", "Grade", "IT102 / 2025-0001: prelim 2.00", "192.0.2.5"),
        new(868, "prof.reyes@spt.local", "PROFESSOR", "GRADE_UPDATE", "Grade", "IT102 / 2025-0001: midterm 2.25", "192.0.2.5"),
        new(867, "prof.ocampo@spt.local", "PROFESSOR", "GRADE_CREATE", "Grade", "GE101 / 2025-0001: prelim 1.25", "192.0.2.5"),
        new(866, "prof.ocampo@spt.local", "PROFESSOR", "GRADE_UPDATE", "Grade", "GE101 / 2025-0001: midterm 1.50", "192.0.2.5"),
        new(865, "prof.ocampo@spt.local", "PROFESSOR", "GRADE_CREATE", "Grade", "GE102 / 2025-0001: prelim 2.50", "192.0.2.5"),
        new(864, "prof.ocampo@spt.local", "PROFESSOR", "GRADE_UPDATE", "Grade", "GE102 / 2025-0001: midterm 2.75", "192.0.2.5"),
        new(863, "prof.ocampo@spt.local", "PROFESSOR", "GRADE_CREATE", "Grade", "PE101 / 2025-0001: prelim 1.00", "192.0.2.5"),
        new(862, "prof.ocampo@spt.local", "PROFESSOR", "GRADE_UPDATE", "Grade", "PE101 / 2025-0001: midterm 1.00", "192.0.2.5"),
        new(861, "prof.santos@spt.local", "PROFESSOR", "GRADE_CREATE", "Grade", "IT101 / 2025-0002: prelim 1.25", "192.0.2.5"),
        new(860, "prof.santos@spt.local", "PROFESSOR", "GRADE_UPDATE", "Grade", "IT101 / 2025-0002: midterm 1.25", "192.0.2.5"),
        new(859, "prof.reyes@spt.local", "PROFESSOR", "GRADE_CREATE", "Grade", "IT102 / 2025-0002: prelim 1.75", "192.0.2.5"),
        new(858, "prof.reyes@spt.local", "PROFESSOR", "GRADE_UPDATE", "Grade", "IT102 / 2025-0002: midterm 2.00", "192.0.2.5"),
        new(857, "prof.ocampo@spt.local", "PROFESSOR", "GRADE_CREATE", "Grade", "GE101 / 2025-0002: prelim 1.50", "192.0.2.5"),
        new(856, "prof.reyes@spt.local", "PROFESSOR", "GRADE_CREATE", "Grade", "IT101 / 2025-0004: prelim 2.75", "192.0.2.5"),
        new(855, "prof.reyes@spt.local", "PROFESSOR", "GRADE_UPDATE", "Grade", "IT101 / 2025-0004: midterm 3.00", "192.0.2.5"),
        new(854, "prof.reyes@spt.local", "PROFESSOR", "GRADE_CREATE", "Grade", "IT102 / 2025-0004: prelim 3.00", "192.0.2.5"),
        new(853, "prof.reyes@spt.local", "PROFESSOR", "GRADE_UPDATE", "Grade", "IT102 / 2025-0004: midterm 3.50", "192.0.2.5"),
        new(852, "prof.ocampo@spt.local", "PROFESSOR", "GRADE_CREATE", "Grade", "GE102 / 2025-0004: prelim 5.00", "192.0.2.5"),
        new(851, "prof.ocampo@spt.local", "PROFESSOR", "GRADE_UPDATE", "Grade", "GE102 / 2025-0004: midterm 4.00", "192.0.2.5"),
        new(850, "prof.reyes@spt.local", "PROFESSOR", "GRADE_CREATE", "Grade", "IT101 / 2025-0005: prelim 1.00", "192.0.2.5"),
        new(849, "prof.reyes@spt.local", "PROFESSOR", "GRADE_UPDATE", "Grade", "IT101 / 2025-0005: midterm 1.25", "192.0.2.5"),
        new(848, "prof.reyes@spt.local", "PROFESSOR", "GRADE_CREATE", "Grade", "IT102 / 2025-0005: prelim 1.25", "192.0.2.5"),
        new(847, "prof.reyes@spt.local", "PROFESSOR", "GRADE_UPDATE", "Grade", "IT102 / 2025-0005: midterm 1.50", "192.0.2.5"),
        new(846, "prof.santos@spt.local", "PROFESSOR", "GRADE_CREATE", "Grade", "IT101 / 2025-0006: prelim 2.25", "192.0.2.5"),
        new(845, "prof.santos@spt.local", "PROFESSOR", "GRADE_UPDATE", "Grade", "IT101 / 2025-0006: midterm 2.50", "192.0.2.5"),
        new(844, "prof.cruz@spt.local", "PROFESSOR", "GRADE_CREATE", "Grade", "CS101 / 2025-0008: prelim 1.75", "192.0.2.5"),
        new(843, "prof.cruz@spt.local", "PROFESSOR", "GRADE_UPDATE", "Grade", "CS101 / 2025-0008: midterm 2.00", "192.0.2.5"),
        new(842, "prof.cruz@spt.local", "PROFESSOR", "GRADE_CREATE", "Grade", "CS102 / 2025-0008: prelim 2.25", "192.0.2.5"),
        new(841, "prof.cruz@spt.local", "PROFESSOR", "GRADE_CREATE", "Grade", "CS101 / 2025-0009: prelim 1.50", "192.0.2.5"),
        new(840, "prof.cruz@spt.local", "PROFESSOR", "GRADE_UPDATE", "Grade", "CS101 / 2025-0009: midterm 1.50", "192.0.2.5"),
        new(839, "prof.cruz@spt.local", "PROFESSOR", "GRADE_CREATE", "Grade", "CS102 / 2025-0009: prelim 1.25", "192.0.2.5"),
        new(838, "prof.cruz@spt.local", "PROFESSOR", "GRADE_UPDATE", "Grade", "CS102 / 2025-0009: midterm 1.50", "192.0.2.5"),
        new(837, "prof.lim@spt.local", "PROFESSOR", "GRADE_CREATE", "Grade", "BA101 / 2025-0010: prelim 3.00", "192.0.2.5"),
        new(836, "prof.lim@spt.local", "PROFESSOR", "GRADE_UPDATE", "Grade", "BA101 / 2025-0010: midterm 3.25", "192.0.2.5"),
        new(835, "prof.santos@spt.local", "PROFESSOR", "GRADE_CREATE", "Grade", "IT201 / 2025-0011: prelim 1.75", "192.0.2.5"),
        new(834, "prof.santos@spt.local", "PROFESSOR", "GRADE_UPDATE", "Grade", "IT201 / 2025-0011: midterm 2.00", "192.0.2.5"),
        new(833, "prof.reyes@spt.local", "PROFESSOR", "GRADE_CREATE", "Grade", "IT202 / 2025-0011: prelim 2.00", "192.0.2.5"),
        new(832, "admin@spt.local", "ADMIN", "REPORT_EXPORT", "Report", "Grade report CSV, 24 row(s)", "192.0.2.10"),
        new(831, null, null, "LOGIN_FAILED", "User", "Failed login for mark.delacruz@student.spt.local", "192.0.2.99"),
        new(830, "jane.villanueva@student.spt.local", "STUDENT", "PASSWORD_RESET_REQUESTED", "User", "Password reset link requested", "192.0.2.22"),
        new(829, "jane.villanueva@student.spt.local", "STUDENT", "PASSWORD_RESET", "User", "Password reset using email link", "192.0.2.22"),
        new(828, "admin@spt.local", "ADMIN", "LOGIN", "User", "User logged in", "192.0.2.10"),
        new(827, "admin@spt.local", "ADMIN", "USER_UPDATE", "User", "Admin updated rafael.bautista@student.spt.local: is_active", "192.0.2.10")
    ];

    // ───────── Seeding ─────────
    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SptDbContext>();

        try
        {
            if (await db.Users.AnyAsync(u => u.Email == DemoMarkerEmail))
            {
                Console.WriteLine("[Seed] Demo data already present - skipping.");
                return;
            }
            await RunAsync(db);
            Console.WriteLine($"[Seed] Demo data created. Demo accounts use the password '{DemoPassword}'.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Seed] Demo data failed: {ex.GetBaseException().Message}");
        }
    }

    private static async Task RunAsync(SptDbContext db)
    {
        var hash = BCrypt.Net.BCrypt.HashPassword(DemoPassword);

        // 1. Colleges, programs
        foreach (var (code, name) in Colleges)
            if (!await db.Colleges.AnyAsync(c => c.Code == code))
                db.Colleges.Add(new College { Code = code, Name = name });
        await db.SaveChangesAsync();
        var college = (await db.Colleges.ToListAsync()).ToDictionary(c => c.Code);

        foreach (var p in Programs)
            if (!await db.Programs.AnyAsync(x => x.Code == p.Code))
                db.Programs.Add(new AcademicProgram { CollegeId = college[p.College].Id, Code = p.Code, Name = p.Name });
        await db.SaveChangesAsync();
        var program = (await db.Programs.ToListAsync()).ToDictionary(p => p.Code);

        // 2. Subjects, prerequisites, semester loads
        foreach (var s in Subjects)
        {
            var programId = program[s.Program].Id;
            if (!await db.Subjects.AnyAsync(x => x.ProgramId == programId && x.Code == s.Code))
                db.Subjects.Add(new Subject { ProgramId = programId, Code = s.Code, Name = s.Name, Units = s.Units, YearLevel = (sbyte)s.Year, Semester = (sbyte)s.Sem });
        }
        await db.SaveChangesAsync();

        var subject = new Dictionary<string, Subject>();
        foreach (var s in await db.Subjects.Include(x => x.Prerequisites).ToListAsync()) subject.TryAdd(s.Code, s);

        foreach (var (code, requires) in Prerequisites)
        {
            var child = subject[code];
            var parent = subject[requires];
            if (!child.Prerequisites.Any(x => x.Id == parent.Id)) child.Prerequisites.Add(parent);
        }

        foreach (var l in Loads)
        {
            var programId = program[l.Program].Id;
            if (!await db.SemesterLoads.AnyAsync(x => x.ProgramId == programId && x.YearLevel == l.Year && x.Semester == l.Sem))
                db.SemesterLoads.Add(new SemesterLoad { ProgramId = programId, YearLevel = (sbyte)l.Year, Semester = (sbyte)l.Sem, MaxUnits = l.MaxUnits });
        }

        // 3. Academic terms (only one may be active; an existing active term is left alone)
        var anyActive = await db.AcademicTerms.AnyAsync(t => t.IsActive);
        foreach (var t in Terms)
            if (!await db.AcademicTerms.AnyAsync(x => x.SchoolYear == t.SchoolYear && x.Semester == t.Sem))
                db.AcademicTerms.Add(new AcademicTerm
                {
                    SchoolYear = t.SchoolYear, Semester = (sbyte)t.Sem,
                    StartDate = DateOnly.Parse(t.Start, CultureInfo.InvariantCulture),
                    EndDate = DateOnly.Parse(t.End, CultureInfo.InvariantCulture),
                    IsActive = t.Active && !anyActive
                });
        await db.SaveChangesAsync();
        var term = (await db.AcademicTerms.ToListAsync()).ToDictionary(t => (t.SchoolYear, (int)t.Semester));

        // 4. Professors
        foreach (var t in Teachers)
        {
            if (await db.Users.AnyAsync(u => u.Email == t.Email)) continue;
            var teacher = new Teacher
            {
                User = NewUser(t.Email, t.First, null, t.Last, Roles.Professor, true, true, hash, 55),
                EmployeeId = t.EmpId,
                CollegeId = college[t.College].Id,
                DepartmentCode = t.Dept
            };
            foreach (var code in t.Subjects) teacher.Subjects.Add(subject[code]);
            db.Teachers.Add(teacher);
        }
        await db.SaveChangesAsync();
        var teacherByEmp = (await db.Teachers.ToListAsync()).ToDictionary(t => t.EmployeeId);

        // 5. Students (pre-registered IDs that already exist are claimed instead of duplicated)
        var knownStudents = (await db.Students.ToListAsync()).ToDictionary(x => x.StudentIdNo);
        foreach (var s in Students)
        {
            if (await db.Users.AnyAsync(u => u.Email == s.Email)) continue;
            var user = NewUser(s.Email, s.First, s.Middle, s.Last, Roles.Student, s.Active, s.Verified, hash, 45);
            if (knownStudents.TryGetValue(s.No, out var row))
            {
                if (row.UserId is not null) continue;   // someone real already owns this ID
                row.User = user;
                row.ProgramId = program[s.Program].Id;
                row.YearLevel = (sbyte)s.Year;
            }
            else
            {
                db.Students.Add(new Student { User = user, StudentIdNo = s.No, ProgramId = program[s.Program].Id, YearLevel = (sbyte)s.Year });
            }
        }
        foreach (var u in Unclaimed)
            if (!knownStudents.ContainsKey(u.No))
                db.Students.Add(new Student { StudentIdNo = u.No, ProgramId = program[u.Program].Id, YearLevel = (sbyte)u.Year });
        await db.SaveChangesAsync();

        // 6. Offerings (same SUBJECT-TERMID-SECTION code format the API generates)
        var offering = new Dictionary<(string Sy, int Sem, string Subject, int Section), Offering>();
        var teacherUserByOffering = new Dictionary<int, int>();
        var newOfferings = new List<(Offering Row, int TeacherUserId)>();
        foreach (var o in Offerings)
        {
            var termId = term[(o.Sy, o.Sem)].Id;
            var code = $"{o.Subject}-{termId}-{o.Section:D2}";
            var teacher = teacherByEmp[o.Emp];
            var row = await db.Offerings.FirstOrDefaultAsync(x => x.OfferCode == code);
            if (row is null)
            {
                row = new Offering
                {
                    TermId = termId, SubjectId = subject[o.Subject].Id, TeacherId = teacher.Id, OfferCode = code,
                    Schedule = o.Schedule, Room = o.Room, MaxSlots = o.Max, CurrentSlots = 0
                };
                db.Offerings.Add(row);
                newOfferings.Add((row, teacher.UserId));
            }
            offering[(o.Sy, o.Sem, o.Subject, o.Section)] = row;
        }
        await db.SaveChangesAsync();
        foreach (var (row, teacherUserId) in newOfferings) teacherUserByOffering[row.Id] = teacherUserId;

        // 7. Enrollments
        var demoNos = Students.Select(s => s.No).ToList();
        var student = (await db.Students.Where(s => demoNos.Contains(s.StudentIdNo)).ToListAsync()).ToDictionary(s => s.StudentIdNo);
        var taken = (await db.Enrollments.Select(e => new { e.StudentId, e.SubjectId, e.TermId }).ToListAsync())
            .Select(e => (e.StudentId, e.SubjectId, e.TermId)).ToHashSet();

        var created = new List<(int Index, EnrollSeed Seed, Enrollment Row, int? TeacherUserId)>();
        for (var i = 0; i < Enrollments.Length; i++)
        {
            var e = Enrollments[i];
            if (!student.TryGetValue(e.No, out var st)) continue;
            var t = term[(e.Sy, e.Sem)];
            var sub = subject[e.Subject];
            if (!taken.Add((st.Id, sub.Id, t.Id))) continue;

            Offering? off = e.Section is int sec ? offering[(e.Sy, e.Sem, e.Subject, sec)] : null;
            var row = new Enrollment
            {
                StudentId = st.Id, SubjectId = sub.Id, TermId = t.Id, OfferingId = off?.Id,
                RequestStatus = e.Status,
                CreatedAt = At(t, 3, i),
                EnrolledAt = e.Status == "ENROLLED" ? At(t, 6, i) : null
            };
            db.Enrollments.Add(row);
            if (off is not null && e.Status == "ENROLLED" && newOfferings.Any(n => n.Row == off)) off.CurrentSlots++;
            created.Add((i, e, row, off is not null && teacherUserByOffering.TryGetValue(off.Id, out var tu) ? (int?)tu : null));
        }
        await db.SaveChangesAsync();

        // 8. Grades + history (CREATE with the prelim, then one UPDATE per later score)
        var grades = new List<(Grade Row, List<(string Action, string? Old, string New, DateTime At)> Steps)>();
        foreach (var (index, e, enrollment, teacherUserId) in created)
        {
            if (e.Status != "ENROLLED" || e.Prelim is null || teacherUserId is null) continue;
            var t = term[(e.Sy, e.Sem)];

            var steps = new List<(string Action, string? Old, string New, DateTime At)>();
            string? previous = null;
            void Step(string action, decimal? m, decimal? f, string? remarks, int day)
            {
                var json = Snapshot(e.Prelim, m, f, remarks);
                steps.Add((action, previous, json, At(t, day, index)));
                previous = json;
            }
            var hasM = e.Midterm is not null; var hasF = e.Finals is not null;
            Step("CREATE", null, null, hasM || hasF ? null : e.Remarks, 35);
            if (hasM) Step("UPDATE", e.Midterm, null, hasF ? null : e.Remarks, 63);
            if (hasF) Step("UPDATE", e.Midterm, e.Finals, e.Remarks, 98);

            var grade = new Grade
            {
                EnrollmentId = enrollment.Id, Prelim = e.Prelim, Midterm = e.Midterm, Finals = e.Finals, Remarks = e.Remarks,
                EnteredBy = teacherUserId.Value, CreatedAt = steps[0].At, UpdatedAt = steps[^1].At
            };
            db.Grades.Add(grade);
            grades.Add((grade, steps));
        }
        await db.SaveChangesAsync();

        foreach (var (grade, steps) in grades)
            foreach (var step in steps)
                db.GradeHistories.Add(new GradeHistory
                {
                    GradeId = grade.Id, ChangedBy = grade.EnteredBy, Action = step.Action,
                    OldValues = step.Old, NewValues = step.New, ChangedAt = step.At
                });
        await db.SaveChangesAsync();

        // 9. Notifications and audit log (timestamps are relative to now, so they always look recent)
        var admin = await db.Users.FirstOrDefaultAsync(u => u.Role == Roles.Admin);
        var emails = Notes.Select(n => n.Email).Concat(Audit.Where(a => a.Email != null).Select(a => a.Email!)).Distinct().ToList();
        var userByEmail = (await db.Users.Where(u => emails.Contains(u.Email)).ToListAsync()).ToDictionary(u => u.Email);

        var now = DateTime.UtcNow;
        foreach (var n in Notes)
            if (userByEmail.TryGetValue(n.Email, out var recipient))
                db.Notifications.Add(new Notification { UserId = recipient.Id, Message = n.Message, IsRead = n.IsRead, CreatedAt = now.AddHours(-n.HoursAgo) });

        foreach (var a in Audit)
        {
            int? actorId = null;
            var email = a.Email;
            if (a.Email == SeedAdminLabel)
            {
                actorId = admin?.Id;
                email = admin?.Email;
            }
            else if (a.Email is not null && userByEmail.TryGetValue(a.Email, out var actor))
            {
                actorId = actor.Id;
            }
            db.AuditLogs.Add(new AuditLog
            {
                ActorId = actorId, ActorType = a.Role, UserEmail = email, Action = a.Action, Entity = a.Entity,
                Details = a.Details, IpAddress = a.Ip, CreatedAt = now.AddHours(-a.HoursAgo)
            });
        }
        await db.SaveChangesAsync();
    }

    // ───────── Helpers ─────────
    private static User NewUser(string email, string first, string? middle, string last, string role, bool active, bool verified, string hash, int daysAgo) => new()
    {
        Email = email, PasswordHash = hash, Role = role, FirstName = first, MiddleName = middle, LastName = last,
        IsActive = active, EmailVerified = verified, DateJoined = DateTime.UtcNow.AddDays(-daysAgo)
    };

    // A timestamp inside a term: start date + days, spread over the working day so rows do not all share one time.
    private static DateTime At(AcademicTerm term, int days, int i) =>
        term.StartDate.ToDateTime(new TimeOnly(9 + i % 8, i * 7 % 60), DateTimeKind.Utc).AddDays(days);

    // Same shape the grades API writes to grade_history: two decimals, null when not graded yet.
    private static string Snapshot(decimal? prelim, decimal? midterm, decimal? finals, string? remarks)
    {
        static string N(decimal? x) => x is null ? "null" : x.Value.ToString("0.00", CultureInfo.InvariantCulture);
        return $"{{\"prelim\": {N(prelim)}, \"midterm\": {N(midterm)}, \"finals\": {N(finals)}, \"remarks\": {JsonSerializer.Serialize(remarks)}}}";
    }
}