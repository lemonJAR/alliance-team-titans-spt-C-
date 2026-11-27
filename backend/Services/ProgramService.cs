using SptApi.Common;
using SptApi.Dtos.Requests;
using SptApi.Mappers;
using SptApi.Models;
using SptApi.Repositories;

namespace SptApi.Services;

public class ProgramService(IProgramRepository programs, ICollegeRepository colleges, IAuditService audit) : IProgramService
{
    public async Task<ServiceResult> GetAllAsync(int? collegeId)
    {
        var rows = await programs.GetAllAsync(collegeId);
        return ServiceResult.Ok(rows.Select(AcademicMapper.ToDto));
    }

    public async Task<ServiceResult> CreateAsync(ProgramRequest request)
    {
        var code = (request.Code ?? "").Trim().ToUpperInvariant();
        var name = (request.Name ?? "").Trim();

        var errors = new Dictionary<string, string[]>();
        if (request.College is null) errors["college"] = ["College is required."];
        else if (!await colleges.ExistsAsync(request.College.Value)) errors["college"] = ["College not found."];
        Validation.CheckCodeAndName(errors, code, name);
        if (errors.Count > 0) return ServiceResult.Invalid(errors);

        if (await programs.CodeExistsAsync(code))
            return ServiceResult.Invalid("code", "A program with this code already exists.");

        var program = new AcademicProgram { CollegeId = request.College!.Value, Code = code, Name = name };
        await programs.AddAsync(program);

        await audit.LogAsync("PROGRAM_CREATE", "Program", program.Id, $"Added program {code} - {name}");
        return ServiceResult.Created(new { id = program.Id, college = program.CollegeId, code = program.Code, name = program.Name });
    }
}
