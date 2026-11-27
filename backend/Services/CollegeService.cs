using SptApi.Common;
using SptApi.Dtos.Requests;
using SptApi.Mappers;
using SptApi.Models;
using SptApi.Repositories;

namespace SptApi.Services;

public class CollegeService(ICollegeRepository colleges, IAuditService audit) : ICollegeService
{
    public async Task<ServiceResult> GetAllAsync()
    {
        var rows = await colleges.GetAllAsync();
        return ServiceResult.Ok(rows.Select(AcademicMapper.ToDto));
    }

    public async Task<ServiceResult> CreateAsync(CollegeRequest request)
    {
        var code = (request.Code ?? "").Trim().ToUpperInvariant();
        var name = (request.Name ?? "").Trim();

        var errors = new Dictionary<string, string[]>();
        Validation.CheckCodeAndName(errors, code, name);
        if (errors.Count > 0) return ServiceResult.Invalid(errors);

        if (await colleges.CodeExistsAsync(code))
            return ServiceResult.Invalid("code", "A college with this code already exists.");

        var college = new College { Code = code, Name = name };
        await colleges.AddAsync(college);

        await audit.LogAsync("COLLEGE_CREATE", "College", college.Id, $"Added college {code} - {name}");
        return ServiceResult.Created(AcademicMapper.ToDto(college));
    }
}
