const { Timesheet, TimesheetEntry, User, Project, Milestone, RejectionHistory, sequelize } = require('../infrastructure/models');
const { Op } = require('sequelize');
const notificationService = require('./notificationService');
const AppError = require('../utils/AppError');
const { ENTRY_STATUS } = require('../constants');

/**
 * Standard includes for loading a timesheet with all entry details.
 */
const ENTRY_INCLUDES = [
  { model: Project, as: 'project', attributes: ['id', 'name', 'project_code', 'color'] },
  { model: Milestone, as: 'milestone', attributes: ['id', 'name'] },
  { model: User, as: 'reviewer', attributes: ['id', 'first_name', 'last_name'] },
];

const TIMESHEET_INCLUDES = [
  { model: TimesheetEntry, as: 'entries', include: ENTRY_INCLUDES },
  { model: User, as: 'user', attributes: { exclude: ['password'] } },
];

class TimesheetService {

  // ===========================
  // EMPLOYEE: Read
  // ===========================

  async getTimesheetByWeek(userId, weekStartDate) {
    // Exact match first
    let ts = await Timesheet.findOne({
      where: { user_id: userId, week_start_date: weekStartDate },
      include: TIMESHEET_INCLUDES,
    });
    // Fallback: ±1 day range to handle timezone/date-format differences
    if (!ts) {
      const target = new Date(weekStartDate + 'T00:00:00');
      const dayBefore = new Date(target); dayBefore.setDate(dayBefore.getDate() - 1);
      const dayAfter = new Date(target); dayAfter.setDate(dayAfter.getDate() + 1);
      ts = await Timesheet.findOne({
        where: {
          user_id: userId,
          week_start_date: { [Op.between]: [dayBefore.toISOString().slice(0, 10), dayAfter.toISOString().slice(0, 10)] },
        },
        include: TIMESHEET_INCLUDES,
      });
    }
    return ts;
  }

  async getUserTimesheets(userId, options = {}) {
    return Timesheet.findAndCountAll({
      where: { user_id: userId },
      include: TIMESHEET_INCLUDES,
      order: [['week_start_date', 'DESC']],
      ...options,
    });
  }

  // ===========================
  // EMPLOYEE: Save Draft
  // ===========================

  /**
   * Save entries for a week. Only draft/recalled/rejected entries can be updated.
   * Submitted/approved entries are NOT touched — employee can add new rows alongside them.
   */
  async saveEntries(userId, data) {
    const { weekStartDate, weekEndDate, entries } = data;

    await sequelize.transaction(async (t) => {
      // Get or create the week container
      let ts = await Timesheet.findOne({
        where: { user_id: userId, week_start_date: weekStartDate },
        transaction: t,
      });

      if (!ts) {
        ts = await Timesheet.create({
          user_id: userId,
          week_start_date: weekStartDate,
          week_end_date: weekEndDate,
        }, { transaction: t });
      }

      // Get existing entries that are locked (submitted/approved)
      const existingEntries = await TimesheetEntry.findAll({
        where: { timesheet_id: ts.id },
        transaction: t,
      });

      const lockedEntryIds = existingEntries
        .filter((e) => [ENTRY_STATUS.SUBMITTED, ENTRY_STATUS.APPROVED, ENTRY_STATUS.REJECTED, ENTRY_STATUS.RESUBMITTED].includes(e.status))
        .map((e) => e.id);

      // Delete only editable (draft/recalled/rejected) entries — locked ones stay
      await TimesheetEntry.destroy({
        where: {
          timesheet_id: ts.id,
          id: { [Op.notIn]: lockedEntryIds },
        },
        transaction: t,
      });

      // Insert new entries (these are the editable rows from the frontend)
      if (entries && entries.length > 0) {
        const entryData = entries
          .filter((e) => e.projectId) // skip empty rows
          .map((e) => ({
            timesheet_id: ts.id,
            project_id: e.projectId,
            milestone_id: e.milestoneId || null,
            task_description: e.taskDescription || '',
            billable: e.billable !== false,
            hours_mon: e.hours?.mon || 0,
            hours_tue: e.hours?.tue || 0,
            hours_wed: e.hours?.wed || 0,
            hours_thu: e.hours?.thu || 0,
            hours_fri: e.hours?.fri || 0,
            hours_sat: e.hours?.sat || 0,
            hours_sun: e.hours?.sun || 0,
            status: ENTRY_STATUS.DRAFT,
          }));

        if (entryData.length > 0) {
          await TimesheetEntry.bulkCreate(entryData, { transaction: t });
        }
      }
    });

    // Return full timesheet AFTER transaction commits
    return this.getTimesheetByWeek(userId, weekStartDate);
  }

  // ===========================
  // EMPLOYEE: Submit entries (per-entry)
  // ===========================

  /**
   * Submit specific entry IDs. Only draft/recalled/rejected entries can be submitted.
   */
  async submitEntries(userId, entryIds) {
    let weekStart;
    await sequelize.transaction(async (t) => {
      const entries = await TimesheetEntry.findAll({
        where: { id: { [Op.in]: entryIds } },
        include: [
          { model: Timesheet, as: 'timesheet', attributes: ['user_id', 'week_start_date'] },
          { model: User, as: 'reviewer', attributes: ['id', 'first_name', 'last_name'] },
        ],
        transaction: t,
      });

      for (const entry of entries) {
        if (entry.timesheet.user_id !== userId) {
          throw new AppError('Unauthorized: entry does not belong to you', 403);
        }
        if (![ENTRY_STATUS.DRAFT, ENTRY_STATUS.RECALLED, ENTRY_STATUS.REJECTED].includes(entry.status)) {
          throw new AppError(`Entry ${entry.id} cannot be submitted (status: ${entry.status})`, 400);
        }

        // If resubmitting a rejected entry, track rejection history
        if (entry.status === ENTRY_STATUS.REJECTED) {
          const history = entry.rejection_history || [];
          history.push({
            rejectedAt: entry.reviewed_at ? new Date(entry.reviewed_at).toISOString() : new Date().toISOString(),
            reviewerName: entry.reviewer ? `${entry.reviewer.first_name} ${entry.reviewer.last_name}` : 'Unknown',
            comments: entry.review_comments || '',
          });
          await entry.update({
            status: ENTRY_STATUS.RESUBMITTED,
            submitted_at: new Date(),
            resubmission_count: (entry.resubmission_count || 0) + 1,
            rejection_history: history,
            review_comments: null,
            reviewed_by: null,
            reviewed_at: null,
          }, { transaction: t });
        } else {
          await entry.update({
            status: ENTRY_STATUS.SUBMITTED,
            submitted_at: new Date(),
          }, { transaction: t });
        }
      }

      weekStart = entries[0]?.timesheet?.week_start_date;

      if (entries.length > 0) {
        try { await notificationService.onTimesheetSubmitted(userId, weekStart); } catch { /* silent */ }
      }
    });

    return weekStart ? this.getTimesheetByWeek(userId, weekStart) : null;
  }

  // ===========================
  // EMPLOYEE: Recall entries (per-entry)
  // ===========================

  async recallEntries(userId, entryIds) {
    let weekStart;
    await sequelize.transaction(async (t) => {
      const entries = await TimesheetEntry.findAll({
        where: { id: { [Op.in]: entryIds } },
        include: [{ model: Timesheet, as: 'timesheet', attributes: ['user_id', 'week_start_date'] }],
        transaction: t,
      });

      for (const entry of entries) {
        if (entry.timesheet.user_id !== userId) {
          throw new AppError('Unauthorized', 403);
        }
        if (![ENTRY_STATUS.SUBMITTED, ENTRY_STATUS.RESUBMITTED].includes(entry.status)) {
          throw new AppError(`Entry ${entry.id} can only be recalled when submitted (status: ${entry.status})`, 400);
        }
      }

      await TimesheetEntry.update(
        { status: ENTRY_STATUS.DRAFT, submitted_at: null },
        { where: { id: { [Op.in]: entryIds } }, transaction: t }
      );

      weekStart = entries[0]?.timesheet?.week_start_date;

      if (entries.length > 0) {
        try { await notificationService.onTimesheetRecalled(userId, weekStart); } catch { /* silent */ }
      }
    });

    return weekStart ? this.getTimesheetByWeek(userId, weekStart) : null;
  }

  // ===========================
  // MANAGER: Get pending approvals (scoped to direct reports)
  // ===========================

  async getPendingApprovalsForManager(managerId, options = {}) {
    // Find direct report IDs
    const directReports = await User.findAll({
      where: { reporting_manager_id: managerId, status: 'active' },
      attributes: ['id'],
      raw: true,
    });
    const reportIds = directReports.map((u) => u.id);

    if (reportIds.length === 0) return { count: 0, rows: [] };

    // Find all submitted entries from direct reports
    return TimesheetEntry.findAndCountAll({
      where: { status: { [Op.in]: [ENTRY_STATUS.SUBMITTED, ENTRY_STATUS.RESUBMITTED] } },
      include: [
        {
          model: Timesheet,
          as: 'timesheet',
          where: { user_id: { [Op.in]: reportIds } },
          include: [{ model: User, as: 'user', attributes: { exclude: ['password'] } }],
        },
        { model: Project, as: 'project', attributes: ['id', 'name', 'project_code', 'color'] },
        { model: Milestone, as: 'milestone', attributes: ['id', 'name'] },
      ],
      order: [['submitted_at', 'DESC']],
      ...options,
    });
  }

  // ===========================
  // MANAGER: Approve/Reject entries (per-entry)
  // ===========================

  async approveEntries(reviewerId, entryIds, comments) {
    return sequelize.transaction(async (t) => {
      const entries = await TimesheetEntry.findAll({
        where: { id: { [Op.in]: entryIds }, status: { [Op.in]: [ENTRY_STATUS.SUBMITTED, ENTRY_STATUS.RESUBMITTED] } },
        include: [{ model: Timesheet, as: 'timesheet', include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'reporting_manager_id'] }] }],
        transaction: t,
      });

      // Verify manager is the reporting manager of the employee
      const reviewer = await User.findByPk(reviewerId, { attributes: ['id', 'first_name', 'last_name'], transaction: t });
      for (const entry of entries) {
        const employee = entry.timesheet?.user;
        if (!employee) throw new AppError('Employee not found', 404);
        if (employee.reporting_manager_id !== reviewerId) {
          // Allow admin override
          const reviewerUser = await User.findByPk(reviewerId, { transaction: t });
          if (reviewerUser.role !== 'admin') {
            throw new AppError('You are not the reporting manager of this employee', 403);
          }
        }
      }

      await TimesheetEntry.update(
        {
          status: ENTRY_STATUS.APPROVED,
          reviewed_by: reviewerId,
          reviewed_at: new Date(),
          review_comments: comments || null,
        },
        { where: { id: { [Op.in]: entryIds } }, transaction: t }
      );

      // Notify each affected employee
      const employeeIds = [...new Set(entries.map((e) => e.timesheet.user_id))];
      const reviewerName = reviewer ? `${reviewer.first_name} ${reviewer.last_name}` : 'Manager';
      for (const empId of employeeIds) {
        try {
          const weekStart = entries.find((e) => e.timesheet.user_id === empId)?.timesheet.week_start_date;
          await notificationService.onTimesheetApproved(empId, weekStart, reviewerName);
        } catch { /* silent */ }
      }

      return { message: `${entryIds.length} entries approved` };
    });
  }

  async rejectEntries(reviewerId, entryIds, comments) {
    return sequelize.transaction(async (t) => {
      const entries = await TimesheetEntry.findAll({
        where: { id: { [Op.in]: entryIds }, status: { [Op.in]: [ENTRY_STATUS.SUBMITTED, ENTRY_STATUS.RESUBMITTED] } },
        include: [{ model: Timesheet, as: 'timesheet', include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'reporting_manager_id'] }] }],
        transaction: t,
      });

      const reviewer = await User.findByPk(reviewerId, { attributes: ['id', 'first_name', 'last_name'], transaction: t });
      for (const entry of entries) {
        const employee = entry.timesheet?.user;
        if (!employee) throw new AppError('Employee not found', 404);
        if (employee.reporting_manager_id !== reviewerId) {
          const reviewerUser = await User.findByPk(reviewerId, { transaction: t });
          if (reviewerUser.role !== 'admin') {
            throw new AppError('You are not the reporting manager of this employee', 403);
          }
        }
      }

      // Insert rejection history records
      const rejectionRecords = entries.map(entry => ({
        entry_id: entry.id,
        timesheet_id: entry.timesheet_id,
        employee_id: entry.timesheet.user_id,
        project_id: entry.project_id,
        milestone_id: entry.milestone_id,
        task_description: entry.task_description,
        billable: entry.billable,
        hours_mon: entry.hours_mon,
        hours_tue: entry.hours_tue,
        hours_wed: entry.hours_wed,
        hours_thu: entry.hours_thu,
        hours_fri: entry.hours_fri,
        hours_sat: entry.hours_sat,
        hours_sun: entry.hours_sun,
        total_hours: parseFloat(entry.hours_mon || 0) + parseFloat(entry.hours_tue || 0) + parseFloat(entry.hours_wed || 0) + parseFloat(entry.hours_thu || 0) + parseFloat(entry.hours_fri || 0) + parseFloat(entry.hours_sat || 0) + parseFloat(entry.hours_sun || 0),
        rejected_by: reviewerId,
        rejected_at: new Date(),
        rejection_reason: comments || 'Rejected',
        week_start_date: entry.timesheet.week_start_date,
        week_end_date: entry.timesheet.week_end_date,
      }));
      await RejectionHistory.bulkCreate(rejectionRecords, { transaction: t });

      await TimesheetEntry.update(
        {
          status: ENTRY_STATUS.REJECTED,
          reviewed_by: reviewerId,
          reviewed_at: new Date(),
          review_comments: comments || 'Rejected',
        },
        { where: { id: { [Op.in]: entryIds } }, transaction: t }
      );

      const employeeIds = [...new Set(entries.map((e) => e.timesheet.user_id))];
      const reviewerName = reviewer ? `${reviewer.first_name} ${reviewer.last_name}` : 'Manager';
      for (const empId of employeeIds) {
        try {
          const weekStart = entries.find((e) => e.timesheet.user_id === empId)?.timesheet.week_start_date;
          await notificationService.onTimesheetRejected(empId, weekStart, reviewerName, comments);
        } catch { /* silent */ }
      }

      return { message: `${entryIds.length} entries rejected` };
    });
  }

  // ===========================
  // ADMIN: view employee timesheets
  // ===========================

  async getEmployeeTimesheets(employeeId, options = {}) {
    return Timesheet.findAndCountAll({
      where: { user_id: employeeId },
      include: TIMESHEET_INCLUDES,
      order: [['week_start_date', 'DESC']],
      ...options,
    });
  }

  // ===========================
  // REPORTS
  // ===========================

  async getReportsData(filters = {}) {
    const entryWhere = { status: { [Op.ne]: ENTRY_STATUS.DRAFT } };
    const timesheetWhere = {};

    if (filters.startDate) timesheetWhere.week_start_date = { [Op.gte]: filters.startDate };
    if (filters.endDate) {
      timesheetWhere.week_end_date = timesheetWhere.week_end_date || {};
      timesheetWhere.week_end_date[Op.lte] = filters.endDate;
    }
    if (filters.userId) timesheetWhere.user_id = filters.userId;
    if (filters.projectId) entryWhere.project_id = filters.projectId;

    return Timesheet.findAll({
      where: Object.keys(timesheetWhere).length ? timesheetWhere : undefined,
      include: [
        { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name'] },
        {
          model: TimesheetEntry,
          as: 'entries',
          where: entryWhere,
          required: true,
          include: [
            { model: Project, as: 'project', attributes: ['id', 'name', 'project_code', 'color'] },
            { model: Milestone, as: 'milestone', attributes: ['id', 'name'] },
          ],
        },
      ],
      order: [['week_start_date', 'DESC']],
    });
  }
}

module.exports = new TimesheetService();
