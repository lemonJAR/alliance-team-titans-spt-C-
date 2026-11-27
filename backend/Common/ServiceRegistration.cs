using SptApi.Repositories;
using SptApi.Services;

namespace SptApi.Common;

// Dependency-injection setup, one method per layer, so Program.cs stays short and every
// interface -> implementation pair is listed in one place.
public static class ServiceRegistration
{
    // Data access: the ONLY classes that use SptDbContext.
    public static IServiceCollection AddRepositories(this IServiceCollection services)
    {
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IStudentRepository, StudentRepository>();
        services.AddScoped<ITeacherRepository, TeacherRepository>();
        services.AddScoped<ICollegeRepository, CollegeRepository>();
        services.AddScoped<IProgramRepository, ProgramRepository>();
        services.AddScoped<ISubjectRepository, SubjectRepository>();
        services.AddScoped<ISemesterLoadRepository, SemesterLoadRepository>();
        services.AddScoped<ITermRepository, TermRepository>();
        services.AddScoped<IOfferingRepository, OfferingRepository>();
        services.AddScoped<IEnrollmentRepository, EnrollmentRepository>();
        services.AddScoped<IGradeRepository, GradeRepository>();
        services.AddScoped<IGradeHistoryRepository, GradeHistoryRepository>();
        services.AddScoped<IGradeReportRepository, GradeReportRepository>();
        services.AddScoped<INotificationRepository, NotificationRepository>();
        services.AddScoped<IAuditLogRepository, AuditLogRepository>();
        services.AddScoped<IEmailTokenRepository, EmailTokenRepository>();
        return services;
    }

    // Business logic: everything controllers call.
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // Shared building blocks
        services.AddScoped<ICurrentUser, CurrentUser>();
        services.AddSingleton<IPasswordHasher, BcryptPasswordHasher>();
        services.AddScoped<ITokenService, JwtTokenService>();
        services.AddScoped<IAuditService, AuditService>();
        services.AddSingleton<IEmailSender, ConsoleEmailSender>();   // swap for a real sender later
        services.AddScoped<IEmailTokenService, EmailTokenService>();
        services.AddScoped<IAccountEmailService, AccountEmailService>();
        services.AddScoped<IIdNumberService, IdNumberService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IUserNameService, UserNameService>();

        // Accounts
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IRegistrationService, RegistrationService>();
        services.AddScoped<IPasswordService, PasswordService>();
        services.AddScoped<IProfileService, ProfileService>();

        // People (admin)
        services.AddScoped<ITeacherService, TeacherService>();
        services.AddScoped<IStudentService, StudentService>();
        services.AddScoped<IUserAccountService, UserAccountService>();
        services.AddScoped<IAuditLogService, AuditLogService>();

        // School setup
        services.AddScoped<ICollegeService, CollegeService>();
        services.AddScoped<IProgramService, ProgramService>();
        services.AddScoped<ISubjectService, SubjectService>();
        services.AddScoped<ISemesterLoadService, SemesterLoadService>();
        services.AddScoped<ITermService, TermService>();

        // Enrollment
        services.AddScoped<IOfferingService, OfferingService>();
        services.AddScoped<IEnrollmentService, EnrollmentService>();
        services.AddScoped<IEnrollmentQueueService, EnrollmentQueueService>();

        // Grades
        services.AddScoped<IGradeAccessPolicy, GradeAccessPolicy>();
        services.AddScoped<IGradeService, GradeService>();
        services.AddScoped<IGradeHistoryService, GradeHistoryService>();
        services.AddScoped<IGradeReportService, GradeReportService>();

        // Misc
        services.AddScoped<INotificationInboxService, NotificationInboxService>();
        services.AddScoped<IHealthService, HealthService>();
        return services;
    }
}
