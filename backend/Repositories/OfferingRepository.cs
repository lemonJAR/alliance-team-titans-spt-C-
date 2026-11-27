using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Dtos.Queries;
using SptApi.Models;

namespace SptApi.Repositories;

public class OfferingRepository(SptDbContext db) : IOfferingRepository
{
    private IQueryable<Offering> WithDetails() => db.Offerings
        .Include(o => o.Term)
        .Include(o => o.Subject).ThenInclude(s => s.Program)
        .Include(o => o.Teacher).ThenInclude(t => t!.User);

    public Task<Offering?> GetByIdAsync(int id) =>
        db.Offerings.FirstOrDefaultAsync(o => o.Id == id);

    public Task<Offering?> GetByIdWithDetailsAsync(int id) =>
        WithDetails().FirstOrDefaultAsync(o => o.Id == id);

    // "Semester" and "YearLevel" describe the SUBJECT's place in the curriculum, not the term.
    public Task<List<Offering>> GetFilteredAsync(OfferingFilter filter)
    {
        var q = WithDetails();
        if (filter.TermId != null) q = q.Where(o => o.TermId == filter.TermId);
        if (filter.ProgramId != null) q = q.Where(o => o.Subject.ProgramId == filter.ProgramId);
        if (filter.YearLevel != null) q = q.Where(o => o.Subject.YearLevel == filter.YearLevel);
        if (filter.Semester != null) q = q.Where(o => o.Subject.Semester == filter.Semester);
        return q.OrderBy(o => o.Subject.Code).ThenBy(o => o.OfferCode).ToListAsync();
    }

    public Task<List<Offering>> GetForTeacherAsync(int teacherId, int? termId)
    {
        var q = WithDetails().Where(o => o.TeacherId == teacherId);
        q = termId != null ? q.Where(o => o.TermId == termId) : q.Where(o => o.Term.IsActive);
        return q.OrderBy(o => o.Subject.Code).ThenBy(o => o.OfferCode).ToListAsync();
    }

    public Task<List<Offering>> GetForSubjectsInTermAsync(int termId, IEnumerable<int> subjectIds)
    {
        var ids = subjectIds.ToList();
        return db.Offerings.Include(o => o.Teacher).ThenInclude(t => t!.User)
            .Where(o => o.TermId == termId && ids.Contains(o.SubjectId))
            .OrderBy(o => o.OfferCode).ToListAsync();
    }

    public Task<bool> IsOwnedByTeacherAsync(int offeringId, int teacherId) =>
        db.Offerings.AnyAsync(o => o.Id == offeringId && o.TeacherId == teacherId);

    public Task<int> CountForSubjectInTermAsync(int termId, int subjectId) =>
        db.Offerings.CountAsync(o => o.TermId == termId && o.SubjectId == subjectId);

    public Task<bool> CodeExistsAsync(string offerCode) =>
        db.Offerings.AnyAsync(o => o.OfferCode == offerCode);

    public async Task<bool> TryClaimSlotAsync(int offeringId)
    {
        var updated = await db.Offerings
            .Where(o => o.Id == offeringId && o.CurrentSlots < o.MaxSlots)
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.CurrentSlots, o => o.CurrentSlots + 1));
        return updated > 0;
    }

    public async Task AddAsync(Offering offering)
    {
        db.Offerings.Add(offering);
        await db.SaveChangesAsync();
    }
}
