const catchAsync = require('../utils/catchAsync');
const timesheetService = require('../services/timesheetService');
const { buildPaginationQuery, buildPaginationResponse } = require('../utils/helpers');

// ===========================
// EMPLOYEE: Get week's timesheet
// ===========================

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

// ===========================
// EMPLOYEE: Save entries (draft)
// ===========================

exports.saveEntries = catchAsync(async (req, res) => {
  const data = await timesheetService.saveEntries(req.user.id, req.body);
  res.json({ status: 'success', data });
});

// ===========================
// EMPLOYEE: Delete a draft entry
// ===========================

exports.deleteEntry = catchAsync(async (req, res) => {
  const { entryId } = req.params;
  const { TimesheetEntry, Timesheet } = require('../infrastructure/models');
  const AppError = require('../utils/AppError');

  const entry = await TimesheetEntry.findByPk(entryId, {
    include: [{ model: Timesheet, as: 'timesheet' }],
  });

  if (!entry) throw new AppError('Entry not found', 404);
  if (entry.timesheet.user_id !== req.user.id) throw new AppError('Not authorized', 403);
  if (!['draft', 'recalled'].includes(entry.status)) {
    throw new AppError('Only draft or recalled entries can be deleted', 400);
  }

  await entry.destroy();
  res.json({ status: 'success', message: 'Entry deleted' });
});

// ===========================
// EMPLOYEE: Submit entries
// ===========================

exports.submitEntries = catchAsync(async (req, res) => {
  const { entryIds } = req.body;
  if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
    return res.status(400).json({ status: 'fail', message: 'entryIds array required' });
  }
  const data = await timesheetService.submitEntries(req.user.id, entryIds);
  res.json({ status: 'success', data });
});

// ===========================
// EMPLOYEE: Recall entries
// ===========================

exports.recallEntries = catchAsync(async (req, res) => {
  const { entryIds } = req.body;
  if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
    return res.status(400).json({ status: 'fail', message: 'entryIds array required' });
  }
  const data = await timesheetService.recallEntries(req.user.id, entryIds);
  res.json({ status: 'success', data });
});

// ===========================
// MANAGER: Get pending approvals (scoped to direct reports)
// ===========================

exports.getPendingApprovals = catchAsync(async (req, res) => {
  const { page, limit, offset } = buildPaginationQuery(req.query);

  // Admin sees all submitted; manager sees only direct reports
  let data;
  if (req.user.role === 'admin') {
    const { TimesheetEntry, Timesheet, User, Project, Milestone } = require('../infrastructure/models');
    data = await TimesheetEntry.findAndCountAll({
      where: { status: 'submitted' },
      include: [
        {
          model: Timesheet, as: 'timesheet',
          include: [{ model: User, as: 'user', attributes: { exclude: ['password'] } }],
        },
        { model: Project, as: 'project', attributes: ['id', 'name', 'project_code', 'color'] },
        { model: Milestone, as: 'milestone', attributes: ['id', 'name'] },
      ],
      order: [['submitted_at', 'DESC']],
      limit, offset,
    });
  } else {
    data = await timesheetService.getPendingApprovalsForManager(req.user.id, { limit, offset });
  }

  res.json({ status: 'success', data: buildPaginationResponse(data, page, limit) });
});

// ===========================
// MANAGER: Approve/Reject entries
// ===========================

exports.approvalAction = catchAsync(async (req, res) => {
  const { entryIds, action, comments } = req.body;
  if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
    return res.status(400).json({ status: 'fail', message: 'entryIds array required' });
  }

  let data;
  if (action === 'approve') {
    data = await timesheetService.approveEntries(req.user.id, entryIds, comments);
  } else {
    data = await timesheetService.rejectEntries(req.user.id, entryIds, comments);
  }
  res.json({ status: 'success', data });
});

// ===========================
// TIMESHEET DETAIL
// ===========================

exports.getTimesheetDetail = catchAsync(async (req, res) => {
  const { Timesheet, TimesheetEntry, User, Project, Milestone } = require('../infrastructure/models');
  const data = await Timesheet.findByPk(req.params.id, {
    include: [
      {
        model: TimesheetEntry, as: 'entries',
        include: [
          { model: Project, as: 'project', attributes: ['id', 'name', 'project_code', 'color'] },
          { model: Milestone, as: 'milestone', attributes: ['id', 'name'] },
          { model: User, as: 'reviewer', attributes: ['id', 'first_name', 'last_name'] },
        ],
      },
      { model: User, as: 'user', attributes: { exclude: ['password'] } },
    ],
  });
  if (!data) return res.status(404).json({ status: 'fail', message: 'Timesheet not found' });
  res.json({ status: 'success', data });
});

// ===========================
// ADMIN: view employee timesheets
// ===========================

exports.getEmployeeTimesheets = catchAsync(async (req, res) => {
  const { page, limit, offset } = buildPaginationQuery(req.query);
  const data = await timesheetService.getEmployeeTimesheets(req.params.employeeId, { limit, offset });
  res.json({ status: 'success', data: buildPaginationResponse(data, page, limit) });
});

// ===========================
// ASSIGNED PROJECTS (employee)
// ===========================

exports.getMyAssignedProjects = catchAsync(async (req, res) => {
  const { ProjectAssignment, Project, User } = require('../infrastructure/models');
  const { Op } = require('sequelize');

  // Get user's own assignments
  const assignments = await ProjectAssignment.findAll({
    where: { user_id: req.user.id },
    include: [{ model: Project, as: 'project' }],
    raw: false,
  });

  // If user is RM, also include direct reports' project assignments
  const directReports = await User.findAll({
    where: { reporting_manager_id: req.user.id, status: 'active' },
    attributes: ['id'],
  });

  let reportAssignments = [];
  if (directReports.length > 0) {
    reportAssignments = await ProjectAssignment.findAll({
      where: { user_id: { [Op.in]: directReports.map(u => u.id) } },
      include: [{ model: Project, as: 'project' }],
      raw: false,
    });
  }

  // Merge and deduplicate by project ID
  const projectMap = new Map();
  const addProject = (a) => {
    if (a.project && !projectMap.has(a.project.id)) {
      const p = a.project.toJSON();
      projectMap.set(p.id, {
        ...p,
        assignment_role: a.role,
        assignment_id: a.id,
      });
    }
  };
  assignments.forEach(addProject);
  reportAssignments.forEach(addProject);

  const projects = [...projectMap.values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  res.json({ status: 'success', data: projects });
});

// ===========================
// MILESTONES BY ROLE
// ===========================

exports.getMilestonesByRole = catchAsync(async (req, res) => {
  const { Milestone } = require('../infrastructure/models');
  const milestones = await Milestone.findAll({
    where: { role: req.params.role },
    order: [['name', 'ASC']],
  });
  res.json({ status: 'success', data: milestones });
});

// ===========================
// PROJECT DETAIL (for employees)
// ===========================

exports.getProjectDetail = catchAsync(async (req, res) => {
  const { Project, ProjectAssignment, User, Milestone } = require('../infrastructure/models');
  const project = await Project.findByPk(req.params.projectId, {
    include: [
      {
        model: ProjectAssignment,
        as: 'assignments',
        include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email', 'mobile', 'avatar_path'] }],
      },
    ],
  });
  if (!project) return res.status(404).json({ status: 'fail', message: 'Project not found' });

  // Fetch milestones for the roles used in this project's assignments
  const roles = [...new Set(project.assignments.map(a => a.role).filter(Boolean))];
  let milestones = [];
  if (roles.length > 0) {
    milestones = await Milestone.findAll({
      where: { role: { [require('sequelize').Op.in]: roles } },
      attributes: ['id', 'name', 'role'],
    });
  }

  const data = project.toJSON();
  data.milestones = milestones.map(m => ({ id: m.id, name: m.name, role: m.role, status: 'pending' }));
  res.json({ status: 'success', data });
});

// ===========================
// REJECTED TIMESHEETS (for employee dashboard alert)
// ===========================

exports.getRejectedEntries = catchAsync(async (req, res) => {
  const { TimesheetEntry, Timesheet, Project, User } = require('../infrastructure/models');
  const entries = await TimesheetEntry.findAll({
    where: { status: 'rejected' },
    include: [
      {
        model: Timesheet, as: 'timesheet',
        where: { user_id: req.user.id },
        attributes: ['id', 'week_start_date', 'week_end_date'],
      },
      { model: Project, as: 'project', attributes: ['id', 'name', 'project_code'] },
      { model: User, as: 'reviewer', attributes: ['id', 'first_name', 'last_name'] },
    ],
    order: [['reviewed_at', 'DESC']],
  });
  res.json({ status: 'success', data: entries });
});

// ===========================
// REJECTION HISTORY
// ===========================

exports.getEntryRejectionHistory = catchAsync(async (req, res) => {
  const { entryId } = req.params;
  const { RejectionHistory, User, Project, Milestone } = require('../infrastructure/models');
  const history = await RejectionHistory.findAll({
    where: { entry_id: entryId },
    include: [
      { model: User, as: 'rejectedByUser', attributes: ['id', 'first_name', 'last_name'] },
      { model: Project, as: 'project', attributes: ['id', 'name'] },
      { model: Milestone, as: 'milestone', attributes: ['id', 'name'] },
    ],
    order: [['rejected_at', 'DESC']],
  });
  res.json({ status: 'success', data: history });
});

// ===========================
// REPORTS
// ===========================

exports.getReports = catchAsync(async (req, res) => {
  const { startDate, endDate, userId, projectId } = req.query;
  const data = await timesheetService.getReportsData({ startDate, endDate, userId, projectId });
  res.json({ status: 'success', data });
});
