namespace SptApi.Services;

// Generates the next student ID number (2026-0001) and employee ID (EMP-0001).
public interface IIdNumberService
{
    Task<string> NextStudentIdAsync();
    Task<string> NextEmployeeIdAsync();
}
