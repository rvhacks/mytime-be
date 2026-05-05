const timesheetRepository = require('../repositories/timesheetRepository');
const AppError = require('../utils/AppError');
const { TIMESHEET_STATUS } = require('../constants');

class TimesheetService {
  async getTimesheetByWeek(userId, weekStartDate) {
    return timesheetRepository.findByUserAndWeek(userId, weekStartDate);
  }

  async getUserTimesheets(userId, options) {
    return timesheetRepository.findByUser(userId, options);
  }

  async saveTimesheet(userId, data) {
    const existing = await timesheetRepository.findByUserAndWeek(userId, data.weekStartDate);

    const entries = data.entries.map((e) => ({
      project_id: e.projectId,
      milestone_id: e.milestoneId || null,
      task_description: e.taskDescription || '',
      billable: e.billable !== false,
      hours_mon: e.hours.mon || 0,
      hours_tue: e.hours.tue || 0,
      hours_wed: e.hours.wed || 0,
      hours_thu: e.hours.thu || 0,
      hours_fri: e.hours.fri || 0,
      hours_sat: e.hours.sat || 0,
      hours_sun: e.hours.sun || 0,
    }));

    const totalHours = entries.reduce((sum, e) =>
      sum + e.hours_mon + e.hours_tue + e.hours_wed + e.hours_thu + e.hours_fri + e.hours_sat + e.hours_sun
    , 0);

    if (existing) {
      if (existing.status === TIMESHEET_STATUS.APPROVED) {
        throw new AppError('Cannot edit an approved timesheet', 400);
      }
      if (existing.status === TIMESHEET_STATUS.SUBMITTED) {
        throw new AppError('Cannot edit a submitted timesheet. Recall it first.', 400);
      }
      return timesheetRepository.update(existing.id, {
        total_hours: totalHours,
        status: TIMESHEET_STATUS.DRAFT,
      }, entries);
    }

    return timesheetRepository.create({
      user_id: userId,
      week_start_date: data.weekStartDate,
      week_end_date: data.weekEndDate,
      total_hours: totalHours,
      status: TIMESHEET_STATUS.DRAFT,
    }, entries);
  }

  async submitTimesheet(userId, timesheetId) {
    const ts = await timesheetRepository.findById(timesheetId);
    if (!ts) throw new AppError('Timesheet not found', 404);
    if (ts.user_id !== userId) throw new AppError('Unauthorized', 403);
    if (ts.status !== TIMESHEET_STATUS.DRAFT && ts.status !== TIMESHEET_STATUS.REJECTED) {
      throw new AppError('Only draft or rejected timesheets can be submitted', 400);
    }

    return timesheetRepository.updateStatus(timesheetId, {
      status: TIMESHEET_STATUS.SUBMITTED,
      submitted_at: new Date(),
    });
  }

  async recallTimesheet(userId, timesheetId) {
    const ts = await timesheetRepository.findById(timesheetId);
    if (!ts) throw new AppError('Timesheet not found', 404);
    if (ts.user_id !== userId) throw new AppError('Unauthorized', 403);
    if (ts.status !== TIMESHEET_STATUS.SUBMITTED) {
      throw new AppError('Only submitted timesheets can be recalled', 400);
    }

    return timesheetRepository.updateStatus(timesheetId, {
      status: TIMESHEET_STATUS.DRAFT,
      submitted_at: null,
    });
  }

  // ---- MANAGER ----
  async getPendingApprovals(options) {
    return timesheetRepository.findPendingApprovals(options);
  }

  async approveTimesheet(reviewerId, timesheetId, comments) {
    const ts = await timesheetRepository.findById(timesheetId);
    if (!ts) throw new AppError('Timesheet not found', 404);
    if (ts.status !== TIMESHEET_STATUS.SUBMITTED) {
      throw new AppError('Only submitted timesheets can be approved', 400);
    }

    return timesheetRepository.updateStatus(timesheetId, {
      status: TIMESHEET_STATUS.APPROVED,
      reviewed_by: reviewerId,
      reviewed_at: new Date(),
      comments: comments || null,
    });
  }

  async rejectTimesheet(reviewerId, timesheetId, comments) {
    const ts = await timesheetRepository.findById(timesheetId);
    if (!ts) throw new AppError('Timesheet not found', 404);
    if (ts.status !== TIMESHEET_STATUS.SUBMITTED) {
      throw new AppError('Only submitted timesheets can be rejected', 400);
    }

    return timesheetRepository.updateStatus(timesheetId, {
      status: TIMESHEET_STATUS.REJECTED,
      reviewed_by: reviewerId,
      reviewed_at: new Date(),
      comments: comments || 'Rejected',
    });
  }

  // ---- REPORTS ----
  async getReportsData(filters) {
    return timesheetRepository.findAllForReports(filters);
  }
}

module.exports = new TimesheetService();
