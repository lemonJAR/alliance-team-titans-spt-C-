using SptApi.Common;
using SptApi.Dtos.Requests;
using SptApi.Mappers;
using SptApi.Models;
using SptApi.Repositories;

namespace SptApi.Services;

public class SemesterLoadService(
    ISemesterLoadRepository loads,
    IProgramRepository programs,
    ISubjectRepository subjects,
    IAuditService audit) : ISemesterLoadService
{
    // Each load also lists the curriculum subjects for its program + year + semester.
    public async Task<ServiceResult> GetAllAsync(int? programId)
    {
        var rows = await loads.GetAllAsync(programId);
        var curriculum = await subjects.GetByProgramIdsAsync(rows.Select(l => l.ProgramId).Distinct());

        return ServiceResult.Ok(rows.Select(l => AcademicMapper.ToDto(l, curriculum.Where(s =>
            s.ProgramId == l.ProgramId && s.YearLevel == l.YearLevel && s.Semester == l.Semester))));
    }

    public async Task<ServiceResult> SetAsync(SemesterLoadRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.Program is null) errors["program"] = ["Program is required."];
        else if (!await programs.ExistsAsync(request.Program.Value)) errors["program"] = ["Program not found."];
        if (request.YearLevel is null or < 1 or > 6) errors["year_level"] = ["Year level must be between 1 and 6."];
        if (request.Semester is null or < 1 or > 2) errors["semester"] = ["Semester must be 1 or 2."];
        if (request.MaxUnits is null or < 1 or > 40) errors["max_units"] = ["Max units must be between 1 and 40."];
        if (errors.Count > 0) return ServiceResult.Invalid(errors);

        var programId = request.Program!.Value;
        var year = (sbyte)request.YearLevel!.Value;
        var sem = (sbyte)request.Semester!.Value;

        var load = await loads.FindAsync(programId, year, sem);
        var created = load is null;
        if (load is null)
        {
            load = new SemesterLoad { ProgramId = programId, YearLevel = year, Semester = sem, MaxUnits = request.MaxUnits!.Value };
            await loads.AddAsync(load);
        }
        else
        {
            load.MaxUnits = request.MaxUnits!.Value;
            await loads.UpdateAsync(load);
        }

        await audit.LogAsync(created ? "SEMESTER_LOAD_CREATE" : "SEMESTER_LOAD_UPDATE", "SemesterLoad", load.Id,
            $"Program {programId}, year {year}, sem {sem}: max {load.MaxUnits} units");

        var body = new { id = load.Id, max_units = load.MaxUnits };
        return created ? ServiceResult.Created(body) : ServiceResult.Ok(body);
    }
}
