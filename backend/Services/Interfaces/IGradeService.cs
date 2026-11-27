using System.Text.Json.Nodes;
using SptApi.Common;

namespace SptApi.Services;

// Grade entry and lookup.
//   Student   - own grades
//   Professor - grades in their own sections, active term only
//   Admin     - every grade, any term (grade override)
public interface IGradeService
{
    Task<ServiceResult> GetMineAsync();
    Task<ServiceResult> SearchAsync(int? offeringId, int? studentId, int? termId, int? subjectId, string? period);
    // JsonObject is used so "field not sent" can be told apart from "field sent as null" (null clears a score).
    Task<ServiceResult> CreateAsync(JsonObject body);
    Task<ServiceResult> UpdateAsync(int gradeId, JsonObject body);
    Task<ServiceResult> DeleteAsync(int gradeId);
}
