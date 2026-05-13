const catchAsync = require('../utils/catchAsync');
const timesheetService = require('../services/timesheetService');
const { buildPaginationQuery, buildPaginationResponse } = require('../utils/helpers');

exports.getMyTimesheet = catchAsync(async (req, res) => {
  const { weekStartDate } = req.query;
  const data = await timesheetService.getTimesheetByWeek(req.user.id, weekStartDate);
  res.json({ status: 'success', data });
});

exports.getMyTimesheets = catchAsync(async (req, res) => {
  const { page, limit, offset } = buildPaginationQuery(req.query);
  const data = await timesheetService.getUserTimesheets(req.user.id, { limit, offset });
  res.json({ status: 'success', data: buildPaginationResponse(data, page, limit) });
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

// ---- APPROVALS (Manager/Admin) ----
exports.getPendingApprovals = catchAsync(async (req, res) => {
  const { page, limit, offset } = buildPaginationQuery(req.query);
  const data = await timesheetService.getPendingApprovals({ limit, offset });
  res.json({ status: 'success', data: buildPaginationResponse(data, page, limit) });
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

// Admin: view any employee's timesheets
exports.getEmployeeTimesheets = catchAsync(async (req, res) => {
  const { page, limit, offset } = buildPaginationQuery(req.query);
  const data = await timesheetService.getEmployeeTimesheets(req.params.employeeId, { limit, offset });
  res.json({ status: 'success', data: buildPaginationResponse(data, page, limit) });
});

// ---- ASSIGNED PROJECTS (for employee's My Projects + Timesheet dropdown) ----
// ROOT FIX: Flatten the nested assignment→project structure into project-level objects
// with the assignment role included. This is what the frontend expects.
exports.getMyAssignedProjects = catchAsync(async (req, res) => {
  const { ProjectAssignment, Project } = require('../infrastructure/models');
  
  const assignments = await ProjectAssignment.findAll({
    where: { user_id: req.user.id },
    include: [{ model: Project, as: 'project' }],
    raw: false,
  });

  // Flatten: return project data with assignment role at root level
  const projects = assignments
    .filter((a) => a.project) // guard against orphaned assignments
    .map((a) => {
      const p = a.project.toJSON();
      return {
        ...p,
        assignment_role: a.role,          // role this user has on this project
        assignment_id: a.id,              // the assignment ID
      };
    });

  res.json({ status: 'success', data: projects });
});

// ---- MILESTONES BY ROLE (for timesheet milestone dropdown filtering) ----
exports.getMilestonesByRole = catchAsync(async (req, res) => {
  const { Milestone } = require('../infrastructure/models');
  const milestones = await Milestone.findAll({
    where: { role: req.params.role },
    order: [['name', 'ASC']],
  });
  res.json({ status: 'success', data: milestones });
});

// ---- REPORTS ----
exports.getReports = catchAsync(async (req, res) => {
  const { startDate, endDate, userId, projectId } = req.query;
  const data = await timesheetService.getReportsData({ startDate, endDate, userId, projectId });
  res.json({ status: 'success', data });
});
