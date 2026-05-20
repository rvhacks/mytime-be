const catchAsync = require('../utils/catchAsync');
const adminService = require('../services/adminService');
const { buildPaginationQuery, buildPaginationResponse } = require('../utils/helpers');

// ---- DESIGNATIONS ----
exports.getDesignations = catchAsync(async (req, res) => {
  const { page, limit, offset, search, sortBy, sortOrder } = buildPaginationQuery(req.query);
  const data = await adminService.getDesignations({ limit, offset, search, order: [[sortBy, sortOrder]] });
  res.json({ status: 'success', data: buildPaginationResponse(data, page, limit) });
});

exports.createDesignation = catchAsync(async (req, res) => {
  const data = await adminService.createDesignation(req.body.name);
  res.status(201).json({ status: 'success', data });
});

exports.updateDesignation = catchAsync(async (req, res) => {
  const data = await adminService.updateDesignation(req.params.id, req.body.name);
  res.json({ status: 'success', data });
});

exports.deleteDesignation = catchAsync(async (req, res) => {
  await adminService.deleteDesignation(req.params.id);
  res.json({ status: 'success', message: 'Designation deleted' });
});

// ---- EMPLOYEES ----
exports.getEmployees = catchAsync(async (req, res) => {
  const { page, limit, offset, search, sortBy, sortOrder } = buildPaginationQuery(req.query);
  const status = req.query.status || 'all'; // active, inactive, all
  const data = await adminService.getEmployees({ limit, offset, search, status, order: [[sortBy, sortOrder]] });
  res.json({ status: 'success', data: buildPaginationResponse(data, page, limit) });
});

exports.createEmployee = catchAsync(async (req, res) => {
  const data = await adminService.createEmployee(req.body);
  res.status(201).json({ status: 'success', data });
});

exports.updateEmployee = catchAsync(async (req, res) => {
  const data = await adminService.updateEmployee(req.params.id, req.body);
  res.json({ status: 'success', data });
});

exports.resetEmployeePassword = catchAsync(async (req, res) => {
  const data = await adminService.resetEmployeePassword(req.params.id);
  res.json({ status: 'success', data });
});

exports.deactivateEmployee = catchAsync(async (req, res) => {
  const data = await adminService.deactivateEmployee(req.params.id);
  res.json({ status: 'success', data, message: 'Employee deactivated' });
});

exports.activateEmployee = catchAsync(async (req, res) => {
  const data = await adminService.activateEmployee(req.params.id);
  res.json({ status: 'success', data, message: 'Employee activated' });
});

// Keep deleteEmployee for backward compat — it now deactivates
exports.deleteEmployee = catchAsync(async (req, res) => {
  await adminService.deleteEmployee(req.params.id);
  res.json({ status: 'success', message: 'Employee deactivated' });
});

// ---- PROJECTS ----
exports.getProjects = catchAsync(async (req, res) => {
  const { page, limit, offset, search, sortBy, sortOrder } = buildPaginationQuery(req.query);
  const status = req.query.status || 'all';
  const data = await adminService.getProjects({ limit, offset, search, status, order: [[sortBy, sortOrder]] });
  res.json({ status: 'success', data: buildPaginationResponse(data, page, limit) });
});

exports.createProject = catchAsync(async (req, res) => {
  const data = await adminService.createProject(req.body);
  res.status(201).json({ status: 'success', data });
});

exports.updateProject = catchAsync(async (req, res) => {
  const data = await adminService.updateProject(req.params.id, req.body);
  res.json({ status: 'success', data });
});

exports.deleteProject = catchAsync(async (req, res) => {
  await adminService.deleteProject(req.params.id);
  res.json({ status: 'success', message: 'Project archived' });
});

// ---- ASSIGNMENTS ----
exports.getAssignments = catchAsync(async (req, res) => {
  const { page, limit, offset, search, sortBy, sortOrder } = buildPaginationQuery(req.query);
  const data = await adminService.getAssignments({ limit, offset, search, order: [[sortBy, sortOrder]] });
  res.json({ status: 'success', data: buildPaginationResponse(data, page, limit) });
});

exports.createAssignment = catchAsync(async (req, res) => {
  const data = await adminService.createAssignment(req.body);
  res.status(201).json({ status: 'success', data });
});

exports.deleteAssignment = catchAsync(async (req, res) => {
  await adminService.deleteAssignment(req.params.id);
  res.json({ status: 'success', message: 'Assignment removed' });
});

// ---- MILESTONES ----
exports.getMilestones = catchAsync(async (req, res) => {
  const { page, limit, offset, search, sortBy, sortOrder } = buildPaginationQuery(req.query);
  const data = await adminService.getMilestones({ limit, offset, search, order: [[sortBy, sortOrder]] });
  res.json({ status: 'success', data: buildPaginationResponse(data, page, limit) });
});

exports.getMilestonesByRole = catchAsync(async (req, res) => {
  const data = await adminService.getMilestonesByRole(req.params.role);
  res.json({ status: 'success', data });
});

exports.createMilestone = catchAsync(async (req, res) => {
  const data = await adminService.createMilestone(req.body);
  res.status(201).json({ status: 'success', data });
});

exports.updateMilestone = catchAsync(async (req, res) => {
  const data = await adminService.updateMilestone(req.params.id, req.body);
  res.json({ status: 'success', data });
});

exports.deleteMilestone = catchAsync(async (req, res) => {
  await adminService.deleteMilestone(req.params.id);
  res.json({ status: 'success', message: 'Milestone deleted' });
});

// ---- DASHBOARD STATS ----
exports.getDashboardStats = catchAsync(async (req, res) => {
  const data = await adminService.getDashboardStats(req.user);
  res.json({ status: 'success', data });
});

// ---- RECENT ACTIVITY (DB-driven) ----
exports.getRecentActivity = catchAsync(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const data = await adminService.getRecentActivity(req.user.id, isAdmin);
  res.json({ status: 'success', data });
});

// ---- ROLE CONSTANTS ----
exports.getRoleConstants = catchAsync(async (req, res) => {
  const { PROJECT_ROLES } = require('../constants');
  res.json({ status: 'success', data: PROJECT_ROLES });
});

// ---- ADMIN APPROVALS: Manager Dashboard ----
exports.getManagersWithPendingApprovals = catchAsync(async (req, res) => {
  const data = await adminService.getManagersWithPendingApprovals();
  res.json({ status: 'success', data });
});

exports.getManagerDirectReportEntries = catchAsync(async (req, res) => {
  const { month } = req.query;
  const data = await adminService.getManagerDirectReportEntries(req.params.managerId, month);
  res.json({ status: 'success', data });
});

exports.sendBulkReminders = catchAsync(async (req, res) => {
  const { managerIds } = req.body;
  if (!managerIds || !Array.isArray(managerIds) || managerIds.length === 0) {
    return res.status(400).json({ status: 'error', message: 'managerIds array is required' });
  }
  const data = await adminService.sendBulkReminders(managerIds);
  res.json({ status: 'success', data, message: 'Reminders sent' });
});
