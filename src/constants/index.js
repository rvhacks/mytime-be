module.exports = {
  USER_ROLES: {
    ADMIN: 'admin',
    EMPLOYEE: 'employee',
    // NOTE: 'manager' role removed. Manager status is dynamic:
    // A user is a manager if they have at least one direct report.
  },

  // Project roles are now stored in the `roles` table (master data).
  // Use the /api/roles endpoint or Role model to query them.

  PROJECT_STATUS: ['active', 'completed', 'on-hold'],

  // Entry-level statuses (not timesheet-level)
  ENTRY_STATUS: {
    DRAFT: 'draft',
    SUBMITTED: 'submitted',
    RESUBMITTED: 'resubmitted',
    RECALLED: 'recalled',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  },

  // Legacy: kept for backward compat but unused in new flow
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
