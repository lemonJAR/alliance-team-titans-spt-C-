import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../components/Icons';
import { notify, confirmDialog } from '../../components/toastBus';
import { PageHeader, PanelTitle, Field, SectionHeader, StatCard } from '../../components/ui';
import { s, c, fmtGrade, parseCsv, UserPagination, escapeHtml, MultiSelect } from './AdminShared';
import {
  addCollege, addDegreeProgram, addSubject,
  fetchCollege, fetchProgram, fetchSubjects,
  adminCreateTeacher, fetchTeachers,
  adminCreateStudent, fetchStudents,
  fetchSemesterLoads, addSemesterLoad,
  fetchTerms, createTerm, fetchOfferings, createOffering,
  fetchTeachers as fetchAllTeachers,
  getEnrollmentQueue, approveRejectEnrollments,
  fetchGrades, updateGrade, deleteGrade,
  fetchGradeReport, exportGradeReportCsv, exportGradeReportExcel,
  fetchAuditLogs, adminUpdateUser, adminDeleteUser, adminDeleteStudentRecord,
  fetchNotifications,
} from '../../controllers/adminController';
import { TeacherTab } from './TeacherTab';
import { StudentTab } from './StudentTab';
import { UserManagementTab } from './UserManagementTab';

const PEOPLE_TABS = [
  { key: 'teachers', label: 'Teachers' },
  { key: 'students', label: 'Students' },
  { key: 'users',    label: 'All Users' },
];

export function PeopleTab() {
  const [sub, setSub] = useState('teachers');
  return (
    <>
      <div className="subtabs" role="tablist">
        {PEOPLE_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={sub === tab.key}
            className={`subtab${sub === tab.key ? ' active' : ''}`}
            onClick={() => setSub(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {sub === 'teachers' && <TeacherTab />}
      {sub === 'students' && <StudentTab />}
      {sub === 'users'    && <UserManagementTab />}
    </>
  );
}

//  Main component
