using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Pomelo.EntityFrameworkCore.MySql.Scaffolding.Internal;
using SptApi.Models;

namespace SptApi.Data;

public partial class SptDbContext : DbContext
{
    public SptDbContext()
    {
    }

    public SptDbContext(DbContextOptions<SptDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<AcademicTerm> AcademicTerms { get; set; }

    public virtual DbSet<AuditLog> AuditLogs { get; set; }

    public virtual DbSet<College> Colleges { get; set; }

    public virtual DbSet<EmailToken> EmailTokens { get; set; }

    public virtual DbSet<Enrollment> Enrollments { get; set; }

    public virtual DbSet<Grade> Grades { get; set; }

    public virtual DbSet<GradeHistory> GradeHistories { get; set; }

    public virtual DbSet<Notification> Notifications { get; set; }

    public virtual DbSet<Offering> Offerings { get; set; }

    public virtual DbSet<AcademicProgram> Programs { get; set; }

    public virtual DbSet<SemesterLoad> SemesterLoads { get; set; }

    public virtual DbSet<Student> Students { get; set; }

    public virtual DbSet<Subject> Subjects { get; set; }

    public virtual DbSet<Teacher> Teachers { get; set; }

    public virtual DbSet<User> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .UseCollation("utf8mb4_unicode_ci")
            .HasCharSet("utf8mb4");

        modelBuilder.Entity<AcademicTerm>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("academic_terms");

            entity.HasIndex(e => new { e.SchoolYear, e.Semester }, "uq_term").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.EndDate).HasColumnName("end_date");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.SchoolYear)
                .HasMaxLength(20)
                .HasColumnName("school_year");
            entity.Property(e => e.Semester).HasColumnName("semester");
            entity.Property(e => e.StartDate).HasColumnName("start_date");
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("audit_logs");

            entity.HasIndex(e => e.Action, "idx_audit_action");

            entity.HasIndex(e => e.ActorId, "idx_audit_actor");

            entity.HasIndex(e => e.CreatedAt, "idx_audit_date");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Action)
                .HasMaxLength(60)
                .HasColumnName("action");
            entity.Property(e => e.ActorId).HasColumnName("actor_id");
            entity.Property(e => e.ActorType)
                .HasMaxLength(20)
                .HasColumnName("actor_type");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Details)
                .HasColumnType("text")
                .HasColumnName("details");
            entity.Property(e => e.Entity)
                .HasMaxLength(60)
                .HasColumnName("entity");
            entity.Property(e => e.EntityId).HasColumnName("entity_id");
            entity.Property(e => e.IpAddress)
                .HasMaxLength(45)
                .HasColumnName("ip_address");
            entity.Property(e => e.UserEmail)
                .HasMaxLength(190)
                .HasColumnName("user_email");
        });

        modelBuilder.Entity<College>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("colleges");

            entity.HasIndex(e => e.Code, "code").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Code)
                .HasMaxLength(20)
                .HasColumnName("code");
            entity.Property(e => e.Name)
                .HasMaxLength(150)
                .HasColumnName("name");
        });

        modelBuilder.Entity<EmailToken>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("email_tokens");

            entity.HasIndex(e => e.Token, "token").IsUnique();

            entity.HasIndex(e => e.UserId, "user_id");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ExpiresAt)
                .HasColumnType("datetime")
                .HasColumnName("expires_at");
            entity.Property(e => e.Purpose)
                .HasColumnType("enum('VERIFY_EMAIL','RESET_PASSWORD')")
                .HasColumnName("purpose");
            entity.Property(e => e.Token)
                .HasMaxLength(100)
                .HasColumnName("token");
            entity.Property(e => e.UsedAt)
                .HasColumnType("datetime")
                .HasColumnName("used_at");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.EmailTokens)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("email_tokens_ibfk_1");
        });

        modelBuilder.Entity<Enrollment>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("enrollments");

            entity.HasIndex(e => e.OfferingId, "offering_id");

            entity.HasIndex(e => e.SubjectId, "subject_id");

            entity.HasIndex(e => e.TermId, "term_id");

            entity.HasIndex(e => new { e.StudentId, e.SubjectId, e.TermId }, "uq_enroll").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.EnrolledAt)
                .HasColumnType("datetime")
                .HasColumnName("enrolled_at");
            entity.Property(e => e.OfferingId).HasColumnName("offering_id");
            entity.Property(e => e.RequestStatus)
                .HasDefaultValueSql("'PENDING'")
                .HasColumnType("enum('PENDING','APPROVED','REJECTED','ENROLLED')")
                .HasColumnName("request_status");
            entity.Property(e => e.StudentId).HasColumnName("student_id");
            entity.Property(e => e.SubjectId).HasColumnName("subject_id");
            entity.Property(e => e.TermId).HasColumnName("term_id");

            entity.HasOne(d => d.Offering).WithMany(p => p.Enrollments)
                .HasForeignKey(d => d.OfferingId)
                .HasConstraintName("enrollments_ibfk_4");

            entity.HasOne(d => d.Student).WithMany(p => p.Enrollments)
                .HasForeignKey(d => d.StudentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("enrollments_ibfk_1");

            entity.HasOne(d => d.Subject).WithMany(p => p.Enrollments)
                .HasForeignKey(d => d.SubjectId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("enrollments_ibfk_2");

            entity.HasOne(d => d.Term).WithMany(p => p.Enrollments)
                .HasForeignKey(d => d.TermId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("enrollments_ibfk_3");
        });

        modelBuilder.Entity<Grade>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("grades");

            entity.HasIndex(e => e.EnrollmentId, "enrollment_id").IsUnique();

            entity.HasIndex(e => e.EnteredBy, "entered_by");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.EnrollmentId).HasColumnName("enrollment_id");
            entity.Property(e => e.EnteredBy).HasColumnName("entered_by");
            entity.Property(e => e.Finals)
                .HasPrecision(3, 2)
                .HasColumnName("finals");
            entity.Property(e => e.Midterm)
                .HasPrecision(3, 2)
                .HasColumnName("midterm");
            entity.Property(e => e.Prelim)
                .HasPrecision(3, 2)
                .HasColumnName("prelim");
            entity.Property(e => e.Remarks)
                .HasMaxLength(500)
                .HasColumnName("remarks");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Enrollment).WithOne(p => p.Grade)
                .HasForeignKey<Grade>(d => d.EnrollmentId)
                .HasConstraintName("grades_ibfk_1");

            entity.HasOne(d => d.EnteredByNavigation).WithMany(p => p.Grades)
                .HasForeignKey(d => d.EnteredBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("grades_ibfk_2");
        });

        modelBuilder.Entity<GradeHistory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("grade_history");

            entity.HasIndex(e => e.ChangedBy, "changed_by");

            entity.HasIndex(e => e.GradeId, "idx_gh_grade");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Action)
                .HasColumnType("enum('CREATE','UPDATE','DELETE')")
                .HasColumnName("action");
            entity.Property(e => e.ChangedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("changed_at");
            entity.Property(e => e.ChangedBy).HasColumnName("changed_by");
            entity.Property(e => e.GradeId).HasColumnName("grade_id");
            entity.Property(e => e.NewValues)
                .HasColumnType("json")
                .HasColumnName("new_values");
            entity.Property(e => e.OldValues)
                .HasColumnType("json")
                .HasColumnName("old_values");

            entity.HasOne(d => d.ChangedByNavigation).WithMany(p => p.GradeHistories)
                .HasForeignKey(d => d.ChangedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("grade_history_ibfk_1");
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("notifications");

            entity.HasIndex(e => new { e.UserId, e.IsRead }, "idx_notif_user");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.IsRead).HasColumnName("is_read");
            entity.Property(e => e.Message)
                .HasMaxLength(500)
                .HasColumnName("message");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.Notifications)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("notifications_ibfk_1");
        });

        modelBuilder.Entity<Offering>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("offerings");

            entity.HasIndex(e => e.OfferCode, "offer_code").IsUnique();

            entity.HasIndex(e => e.SubjectId, "subject_id");

            entity.HasIndex(e => e.TeacherId, "teacher_id");

            entity.HasIndex(e => e.TermId, "term_id");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CurrentSlots).HasColumnName("current_slots");
            entity.Property(e => e.MaxSlots)
                .HasDefaultValueSql("'40'")
                .HasColumnName("max_slots");
            entity.Property(e => e.OfferCode)
                .HasMaxLength(30)
                .HasColumnName("offer_code");
            entity.Property(e => e.SubjectId).HasColumnName("subject_id");
            entity.Property(e => e.TeacherId).HasColumnName("teacher_id");
            entity.Property(e => e.TermId).HasColumnName("term_id");

            entity.HasOne(d => d.Subject).WithMany(p => p.Offerings)
                .HasForeignKey(d => d.SubjectId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("offerings_ibfk_2");

            entity.HasOne(d => d.Teacher).WithMany(p => p.Offerings)
                .HasForeignKey(d => d.TeacherId)
                .HasConstraintName("offerings_ibfk_3");

            entity.HasOne(d => d.Term).WithMany(p => p.Offerings)
                .HasForeignKey(d => d.TermId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("offerings_ibfk_1");
        });

        modelBuilder.Entity<AcademicProgram>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("programs");

            entity.HasIndex(e => e.Code, "code").IsUnique();

            entity.HasIndex(e => e.CollegeId, "college_id");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Code)
                .HasMaxLength(20)
                .HasColumnName("code");
            entity.Property(e => e.CollegeId).HasColumnName("college_id");
            entity.Property(e => e.Name)
                .HasMaxLength(150)
                .HasColumnName("name");

            entity.HasOne(d => d.College).WithMany(p => p.Programs)
                .HasForeignKey(d => d.CollegeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("programs_ibfk_1");
        });

        modelBuilder.Entity<SemesterLoad>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("semester_loads");

            entity.HasIndex(e => new { e.ProgramId, e.YearLevel, e.Semester }, "uq_load").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.MaxUnits)
                .HasDefaultValueSql("'27'")
                .HasColumnName("max_units");
            entity.Property(e => e.ProgramId).HasColumnName("program_id");
            entity.Property(e => e.Semester).HasColumnName("semester");
            entity.Property(e => e.YearLevel).HasColumnName("year_level");

            entity.HasOne(d => d.Program).WithMany(p => p.SemesterLoads)
                .HasForeignKey(d => d.ProgramId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("semester_loads_ibfk_1");
        });

        modelBuilder.Entity<Student>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("students");

            entity.HasIndex(e => e.ProgramId, "program_id");

            entity.HasIndex(e => e.StudentIdNo, "student_id_no").IsUnique();

            entity.HasIndex(e => e.UserId, "user_id").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ProgramId).HasColumnName("program_id");
            entity.Property(e => e.StudentIdNo)
                .HasMaxLength(30)
                .HasColumnName("student_id_no");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.YearLevel)
                .HasDefaultValueSql("'1'")
                .HasColumnName("year_level");

            entity.HasOne(d => d.Program).WithMany(p => p.Students)
                .HasForeignKey(d => d.ProgramId)
                .HasConstraintName("students_ibfk_2");

            entity.HasOne(d => d.User).WithOne(p => p.Student)
                .HasForeignKey<Student>(d => d.UserId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("students_ibfk_1");
        });

        modelBuilder.Entity<Subject>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("subjects");

            entity.HasIndex(e => new { e.ProgramId, e.Code }, "uq_subject").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Code)
                .HasMaxLength(20)
                .HasColumnName("code");
            entity.Property(e => e.Name)
                .HasMaxLength(150)
                .HasColumnName("name");
            entity.Property(e => e.ProgramId).HasColumnName("program_id");
            entity.Property(e => e.Semester).HasColumnName("semester");
            entity.Property(e => e.Units)
                .HasDefaultValueSql("'3'")
                .HasColumnName("units");
            entity.Property(e => e.YearLevel).HasColumnName("year_level");

            entity.HasOne(d => d.Program).WithMany(p => p.Subjects)
                .HasForeignKey(d => d.ProgramId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("subjects_ibfk_1");

            entity.HasMany(d => d.Prerequisites).WithMany(p => p.Subjects)
                .UsingEntity<Dictionary<string, object>>(
                    "SubjectPrerequisite",
                    r => r.HasOne<Subject>().WithMany()
                        .HasForeignKey("PrerequisiteId")
                        .HasConstraintName("subject_prerequisites_ibfk_2"),
                    l => l.HasOne<Subject>().WithMany()
                        .HasForeignKey("SubjectId")
                        .HasConstraintName("subject_prerequisites_ibfk_1"),
                    j =>
                    {
                        j.HasKey("SubjectId", "PrerequisiteId")
                            .HasName("PRIMARY")
                            .HasAnnotation("MySql:IndexPrefixLength", new[] { 0, 0 });
                        j.ToTable("subject_prerequisites");
                        j.HasIndex(new[] { "PrerequisiteId" }, "prerequisite_id");
                        j.IndexerProperty<int>("SubjectId").HasColumnName("subject_id");
                        j.IndexerProperty<int>("PrerequisiteId").HasColumnName("prerequisite_id");
                    });

            entity.HasMany(d => d.Subjects).WithMany(p => p.Prerequisites)
                .UsingEntity<Dictionary<string, object>>(
                    "SubjectPrerequisite",
                    r => r.HasOne<Subject>().WithMany()
                        .HasForeignKey("SubjectId")
                        .HasConstraintName("subject_prerequisites_ibfk_1"),
                    l => l.HasOne<Subject>().WithMany()
                        .HasForeignKey("PrerequisiteId")
                        .HasConstraintName("subject_prerequisites_ibfk_2"),
                    j =>
                    {
                        j.HasKey("SubjectId", "PrerequisiteId")
                            .HasName("PRIMARY")
                            .HasAnnotation("MySql:IndexPrefixLength", new[] { 0, 0 });
                        j.ToTable("subject_prerequisites");
                        j.HasIndex(new[] { "PrerequisiteId" }, "prerequisite_id");
                        j.IndexerProperty<int>("SubjectId").HasColumnName("subject_id");
                        j.IndexerProperty<int>("PrerequisiteId").HasColumnName("prerequisite_id");
                    });
        });

        modelBuilder.Entity<Teacher>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("teachers");

            entity.HasIndex(e => e.CollegeId, "college_id");

            entity.HasIndex(e => e.EmployeeId, "employee_id").IsUnique();

            entity.HasIndex(e => e.UserId, "user_id").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CollegeId).HasColumnName("college_id");
            entity.Property(e => e.DepartmentCode)
                .HasMaxLength(20)
                .HasColumnName("department_code");
            entity.Property(e => e.EmployeeId)
                .HasMaxLength(30)
                .HasColumnName("employee_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.College).WithMany(p => p.Teachers)
                .HasForeignKey(d => d.CollegeId)
                .HasConstraintName("teachers_ibfk_2");

            entity.HasOne(d => d.User).WithOne(p => p.Teacher)
                .HasForeignKey<Teacher>(d => d.UserId)
                .HasConstraintName("teachers_ibfk_1");

            entity.HasMany(d => d.Subjects).WithMany(p => p.Teachers)
                .UsingEntity<Dictionary<string, object>>(
                    "TeacherSubject",
                    r => r.HasOne<Subject>().WithMany()
                        .HasForeignKey("SubjectId")
                        .HasConstraintName("teacher_subjects_ibfk_2"),
                    l => l.HasOne<Teacher>().WithMany()
                        .HasForeignKey("TeacherId")
                        .HasConstraintName("teacher_subjects_ibfk_1"),
                    j =>
                    {
                        j.HasKey("TeacherId", "SubjectId")
                            .HasName("PRIMARY")
                            .HasAnnotation("MySql:IndexPrefixLength", new[] { 0, 0 });
                        j.ToTable("teacher_subjects");
                        j.HasIndex(new[] { "SubjectId" }, "subject_id");
                        j.IndexerProperty<int>("TeacherId").HasColumnName("teacher_id");
                        j.IndexerProperty<int>("SubjectId").HasColumnName("subject_id");
                    });
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("users");

            entity.HasIndex(e => e.Email, "email").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.DateJoined)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("date_joined");
            entity.Property(e => e.Email)
                .HasMaxLength(190)
                .HasColumnName("email");
            entity.Property(e => e.EmailVerified).HasColumnName("email_verified");
            entity.Property(e => e.FcmToken)
                .HasMaxLength(255)
                .HasColumnName("fcm_token");
            entity.Property(e => e.FirstName)
                .HasMaxLength(80)
                .HasColumnName("first_name");
            entity.Property(e => e.IsActive)
                .IsRequired()
                .HasDefaultValueSql("'1'")
                .HasColumnName("is_active");
            entity.Property(e => e.LastName)
                .HasMaxLength(80)
                .HasColumnName("last_name");
            entity.Property(e => e.MiddleName)
                .HasMaxLength(80)
                .HasColumnName("middle_name");
            entity.Property(e => e.PasswordHash)
                .HasMaxLength(255)
                .HasColumnName("password_hash");
            entity.Property(e => e.Role)
                .HasColumnType("enum('ADMIN','PROFESSOR','STUDENT')")
                .HasColumnName("role");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}