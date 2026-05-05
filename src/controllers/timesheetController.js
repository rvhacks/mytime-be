const catchAsync = require('../utils/catchAsync');
const timesheetService = require('../services/timesheetService');

exports.getMyTimesheet = catchAsync(async (req, res) => {
  const { weekStartDate } = req.query;
  const data = await timesheetService.getTimesheetByWeek(req.user.id, weekStartDate);
  res.json({ status: 'success', data });
});

exports.getMyTimesheets = catchAsync(async (req, res) => {
  const data = await timesheetService.getUserTimesheets(req.user.id);
  res.json({ status: 'success', data });
});

exports.saveTimesheet = catchAsync(async (req, res) => {
  const data = await timesheetService.saveTimesheet(req.user.id, req.body);
  res.json({ status: 'success', data });
});

exports.submitTimesheet = catchAsync(async (req, res) => {
  const data = await timesheetService.submitTimesheet(req.user.id, req.body.timesheetId);
  res.json({ status: 'success', data });
});

exports.recallTimesheet = catchAsync(async (req, res) => {
  const data = await timesheetService.recallTimesheet(req.user.id, req.params.id);
  res.json({ status: 'success', data });
});

// ---- APPROVALS (Manager) ----
exports.getPendingApprovals = catchAsync(async (req, res) => {
  const data = await timesheetService.getPendingApprovals();
  res.json({ status: 'success', data });
});

exports.approvalAction = catchAsync(async (req, res) => {
  const { timesheetId, action, comments } = req.body;
  let data;
  if (action === 'approve') {
    data = await timesheetService.approveTimesheet(req.user.id, timesheetId, comments);
  } else {
    data = await timesheetService.rejectTimesheet(req.user.id, timesheetId, comments);
  }
  res.json({ status: 'success', data });
});

exports.getTimesheetDetail = catchAsync(async (req, res) => {
  const timesheetRepository = require('../repositories/timesheetRepository');
  const data = await timesheetRepository.findById(req.params.id);
  if (!data) return res.status(404).json({ status: 'fail', message: 'Timesheet not found' });
  res.json({ status: 'success', data });
});

// ---- REPORTS ----
exports.getReports = catchAsync(async (req, res) => {
  const { startDate, endDate, userId, projectId } = req.query;
  const data = await timesheetService.getReportsData({ startDate, endDate, userId, projectId });
  res.json({ status: 'success', data });
});
