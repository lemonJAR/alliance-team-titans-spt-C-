import { useUrlState } from '../../hooks/useUrlState';
import { TeacherTab } from './TeacherTab';
import { StudentTab } from './StudentTab';
import { UserManagementTab } from './UserManagementTab';

const PEOPLE_TABS = [
  { key: 'teachers', label: 'Teachers' },
  { key: 'students', label: 'Students' },
  { key: 'users',    label: 'All Users' },
];

export function PeopleTab() {
  const [sub, changeSubTab] = useUrlState('people', 'teachers', PEOPLE_TABS.map((t) => t.key));

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
            onClick={() => changeSubTab(tab.key)}
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

