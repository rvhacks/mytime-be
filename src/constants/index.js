module.exports = {
  USER_ROLES: {
    ADMIN: 'admin',
    MANAGER: 'manager',
    EMPLOYEE: 'employee',
  },

  PROJECT_ROLES: ['IC', 'MS', 'TPM', 'PM', 'QA', 'BA'],

  PROJECT_STATUS: ['active', 'completed', 'on-hold'],

  MILESTONE_STATUS: ['pending', 'in-progress', 'completed'],

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
