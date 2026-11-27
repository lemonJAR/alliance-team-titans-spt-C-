using SptApi.Common;
using SptApi.Dtos.Requests;
using SptApi.Mappers;
using SptApi.Models;
using SptApi.Repositories;

namespace SptApi.Services;

public class SubjectService(ISubjectRepository subjects, IProgramRepository programs, IAuditService audit) : ISubjectService
{
    public async Task<ServiceResult> GetAllAsync(int? programId, int? collegeId)
    {
        var rows = await subjects.GetFilteredAsync(programId, collegeId);
        return ServiceResult.Ok(rows.Select(AcademicMapper.ToDto));
    }

    public async Task<ServiceResult> CreateAsync(SubjectRequest request)
    {
        var code = (request.Code ?? "").Trim().ToUpperInvariant();
        var name = (request.Name ?? "").Trim();

        var errors = new Dictionary<string, string[]>();
        if (request.Program is null) errors["program"] = ["Program is required."];
        else if (!await programs.ExistsAsync(request.Program.Value)) errors["program"] = ["Program not found."];
        Validation.CheckCodeAndName(errors, code, name);
        if (request.Units is null or < 1 or > 12) errors["units"] = ["Units must be between 1 and 12."];
        if (request.YearLevel is null or < 1 or > 6) errors["year_level"] = ["Year level must be between 1 and 6."];
        if (request.Semester is null or < 1 or > 2) errors["semester"] = ["Semester must be 1 or 2."];
        if (errors.Count > 0) return ServiceResult.Invalid(errors);

        var programId = request.Program!.Value;
        if (await subjects.CodeExistsInProgramAsync(programId, code))
            return ServiceResult.Invalid("code", "This program already has a subject with that code.");

        // Prerequisites must exist and belong to the same program.
        var prereqIds = (request.Prerequisites ?? []).Distinct().ToList();
        var prereqs = await subjects.GetByIdsAsync(prereqIds);
        if (prereqs.Count != prereqIds.Count)
            return ServiceResult.Invalid("prerequisites", "One or more prerequisites were not found.");
        if (prereqs.Any(p => p.ProgramId != programId))
            return ServiceResult.Invalid("prerequisites", "Prerequisites must belong to the same program.");

        var subject = new Subject
        {
            ProgramId = programId,
            Code = code,
            Name = name,
            Units = request.Units!.Value,
            YearLevel = (sbyte)request.YearLevel!.Value,
            Semester = (sbyte)request.Semester!.Value
        };
        foreach (var p in prereqs) subject.Prerequisites.Add(p);
        await subjects.AddAsync(subject);

        await audit.LogAsync("SUBJECT_CREATE", "Subject", subject.Id, $"Added subject {code} - {name}");
        return ServiceResult.Created(AcademicMapper.ToCreatedDto(subject));
    }
}
