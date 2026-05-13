module.exports = {
  USER_ROLES: {
    ADMIN: 'admin',
    MANAGER: 'manager',
    EMPLOYEE: 'employee',
  },

  // Centralized project roles with full labels – single source of truth
  PROJECT_ROLES: {
    IC:  { key: 'IC',  label: 'Implementation Consultant' },
    TC:  { key: 'TC',  label: 'Technical Consultant' },
    TPM: { key: 'TPM', label: 'Technical Project Manager' },
    MS:  { key: 'MS',  label: 'Managed Services' },
    QA:  { key: 'QA',  label: 'Quality Analyst' },
    BA:  { key: 'BA',  label: 'Business Analyst' },
    PM:  { key: 'PM',  label: 'Project Manager' },
  },

  PROJECT_ROLE_KEYS: ['IC', 'TC', 'TPM', 'MS', 'QA', 'BA', 'PM'],

  PROJECT_STATUS: ['active', 'completed', 'on-hold'],

  TIMESHEET_STATUS: {
    DRAFT: 'draft',
    SUBMITTED: 'submitted',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  },

  DAYS_OF_WEEK: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],

  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },
};
