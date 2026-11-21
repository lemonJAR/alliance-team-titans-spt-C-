// Student grade records: own grades with remarks, prospectus, and the grade history timeline.
import { getMyGrades, getMyProspectus, fetchGradeTimeline } from '../services/api';

export async function loadMyGradeRecords() {
  const [gradesRes, prospectusRes] = await Promise.all([getMyGrades(), getMyProspectus()]);
  return { grades: gradesRes.data, prospectus: prospectusRes.data };
}

export async function loadGradeTimeline() {
  const { data } = await fetchGradeTimeline();
  return data;
}

// Every ENROLLED subject from the prospectus, with its grade merged in when one exists,
// so a subject is listed even before it is graded.
export function mergeEnrolledSubjects(prospectus, grades) {
  const enrolledMap = new Map();

  prospectus.forEach((p) => {
    if (p.request_status === 'ENROLLED') {
      enrolledMap.set(p.subject_id, { ...p, source: 'prospectus' });
    }
  });

  grades.forEach((g) => {
    if (enrolledMap.has(g.subject_id)) {
      enrolledMap.set(g.subject_id, { ...enrolledMap.get(g.subject_id), ...g, source: 'merged' });
    } else {
      enrolledMap.set(g.subject_id, { ...g, source: 'grades-only' });
    }
  });

  return Array.from(enrolledMap.values());
}
