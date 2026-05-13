const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const designationRepository = require('../repositories/designationRepository');
const projectRepository = require('../repositories/projectRepository');
const assignmentRepository = require('../repositories/assignmentRepository');
const milestoneRepository = require('../repositories/milestoneRepository');
const notificationService = require('./notificationService');
const { generateAutoPassword, generateProjectCode, generateAutoColor } = require('../utils/helpers');
const AppError = require('../utils/AppError');

class AdminService {
  // ---- DESIGNATIONS ----
  async getDesignations(options) { return designationRepository.findAll(options); }

  async createDesignation(name) {
    const existing = await designationRepository.findByName(name);
    if (existing) throw new AppError('Designation already exists', 409);
    return designationRepository.create({ name });
  }

  async updateDesignation(id, name) {
    const existing = await designationRepository.findById(id);
    if (!existing) throw new AppError('Designation not found', 404);
    return designationRepository.update(id, { name });
  }

  async deleteDesignation(id) {
    const existing = await designationRepository.findById(id);
    if (!existing) throw new AppError('Designation not found', 404);
    return designationRepository.delete(id);
  }

  // ---- EMPLOYEES ----
  async getEmployees(options) { return userRepository.findAll(options); }

  async createEmployee(data) {
    const existingEmail = await userRepository.findByEmail(data.email);
    if (existingEmail) throw new AppError('Email already exists', 409);

    const autoPassword = generateAutoPassword(data.firstName, data.mobile, data.dob);
    const hashedPassword = await bcrypt.hash(autoPassword, 12);

    const user = await userRepository.create({
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      mobile: data.mobile,
      dob: data.dob,
      password: hashedPassword,
      role: data.role || 'employee',
      designation_id: data.designationId,
      department: data.department,
      joining_date: data.joiningDate,
      reporting_manager_id: data.reportingManagerId || null,
      status: 'active',
    });

    const userData = await userRepository.findById(user.id);

    // Notify new employee
    try { await notificationService.onEmployeeCreated(user); } catch (e) { /* silent */ }

    return { user: userData, generatedPassword: autoPassword };
  }

  async updateEmployee(id, data) {
    const existing = await userRepository.findById(id);
    if (!existing) throw new AppError('Employee not found', 404);

    const updateData = {};
    if (data.firstName) updateData.first_name = data.firstName;
    if (data.lastName) updateData.last_name = data.lastName;
    if (data.email) updateData.email = data.email;
    if (data.mobile) updateData.mobile = data.mobile;
    if (data.dob) updateData.dob = data.dob;
    if (data.designationId) updateData.designation_id = data.designationId;
    if (data.department) updateData.department = data.department;
    if (data.joiningDate) updateData.joining_date = data.joiningDate;
    if (data.role) updateData.role = data.role;
    if (data.reportingManagerId !== undefined) updateData.reporting_manager_id = data.reportingManagerId || null;

    return userRepository.update(id, updateData);
  }

  async resetEmployeePassword(id) {
    const existing = await userRepository.findById(id);
    if (!existing) throw new AppError('Employee not found', 404);

    // Get full record with password field for data
    const fullUser = await userRepository.findByEmail(existing.email);
    const autoPassword = generateAutoPassword(fullUser.first_name, fullUser.mobile, fullUser.dob);
    const hashedPassword = await bcrypt.hash(autoPassword, 12);

    await userRepository.update(id, { password: hashedPassword });

    // Notify employee
    try { await notificationService.onPasswordReset(id, fullUser.first_name); } catch (e) { /* silent */ }

    return { generatedPassword: autoPassword };
  }

  async deleteEmployee(id) {
    const existing = await userRepository.findById(id);
    if (!existing) throw new AppError('Employee not found', 404);
    return userRepository.delete(id);
  }

  // ---- PROJECTS ----
  async getProjects(options) { return projectRepository.findAll(options); }

  async createProject(data) {
    let code = data.projectCode || '';

    // Auto-generate unique 3-char code if empty
    if (!code) {
      let attempts = 0;
      do {
        code = generateProjectCode();
        const existing = await projectRepository.findByCode(code);
        if (!existing) break;
        attempts++;
      } while (attempts < 20);
    }

    const existingCode = await projectRepository.findByCode(code);
    if (existingCode) throw new AppError('Project code already exists', 409);

    return projectRepository.create({
      project_code: code,
      name: data.name,
      description: data.description,
      color: data.color || generateAutoColor(),
      start_date: data.startDate,
      end_date: data.endDate,
      status: data.status || 'active',
    });
  }

  async updateProject(id, data) {
    const existing = await projectRepository.findById(id);
    if (!existing) throw new AppError('Project not found', 404);

    const updateData = {};
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.color) updateData.color = data.color;
    if (data.startDate) updateData.start_date = data.startDate;
    if (data.endDate) updateData.end_date = data.endDate;
    if (data.status) updateData.status = data.status;

    return projectRepository.update(id, updateData);
  }

  // Soft delete (handled by paranoid mode)
  async deleteProject(id) {
    const existing = await projectRepository.findById(id);
    if (!existing) throw new AppError('Project not found', 404);
    return projectRepository.delete(id);
  }

  // ---- ASSIGNMENTS ----
  async getAssignments(options) { return assignmentRepository.findAll(options); }

  async createAssignment(data) {
    const existing = await assignmentRepository.findByUserAndProject(data.userId, data.projectId);
    if (existing) throw new AppError('Employee is already assigned to this project', 409);

    const assignment = await assignmentRepository.create({
      user_id: data.userId,
      project_id: data.projectId,
      role: data.role,
    });

    // Notify the assigned employee
    try {
      const project = await projectRepository.findById(data.projectId);
      if (project) {
        await notificationService.onProjectAssigned(data.userId, project.name, data.role);
      }
    } catch (e) { /* silent */ }

    return assignment;
  }

  async deleteAssignment(id) {
    const existing = await assignmentRepository.findById(id);
    if (!existing) throw new AppError('Assignment not found', 404);
    return assignmentRepository.delete(id);
  }

  // ---- MILESTONES (Role-based templates) ----
  async getMilestones(options) { return milestoneRepository.findAll(options); }

  async getMilestonesByRole(role) { return milestoneRepository.findByRole(role); }

  async createMilestone(data) {
    return milestoneRepository.create({
      name: data.name,
      description: data.description || null,
      role: data.role,
    });
  }

  async updateMilestone(id, data) {
    const existing = await milestoneRepository.findById(id);
    if (!existing) throw new AppError('Milestone not found', 404);
    const updateData = {};
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.role) updateData.role = data.role;
    return milestoneRepository.update(id, updateData);
  }

  async deleteMilestone(id) {
    const existing = await milestoneRepository.findById(id);
    if (!existing) throw new AppError('Milestone not found', 404);
    return milestoneRepository.delete(id);
  }

  // ---- DASHBOARD STATS ----
  async getDashboardStats() {
    const { Timesheet, TimesheetEntry, User, Project, ProjectAssignment } = require('../infrastructure/models');
    const { Op, fn, col, literal } = require('sequelize');

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Total employees
    const totalEmployees = await User.count({ where: { status: 'active' } });

    // Active projects
    const activeProjects = await Project.count({ where: { status: 'active' } });

    // Total hours logged (last 30 days) — EXCLUDE drafts
    const nonDraftStatuses = ['submitted', 'approved', 'rejected'];
    const hoursResult = await Timesheet.findAll({
      where: {
        week_start_date: { [Op.gte]: thirtyDaysAgo },
        status: { [Op.in]: nonDraftStatuses },
      },
      attributes: [[fn('COALESCE', fn('SUM', col('total_hours')), 0), 'totalHours']],
      raw: true,
    });
    const totalHoursLogged = parseFloat(hoursResult[0]?.totalHours || 0);

    // Billable hours (last 30 days) — EXCLUDE drafts
    const billableResult = await TimesheetEntry.findAll({
      where: { billable: true },
      include: [{
        model: Timesheet,
        as: 'timesheet',
        where: {
          week_start_date: { [Op.gte]: thirtyDaysAgo },
          status: { [Op.in]: nonDraftStatuses },
        },
        attributes: [],
      }],
      attributes: [
        [literal('COALESCE(SUM(hours_mon + hours_tue + hours_wed + hours_thu + hours_fri + hours_sat + hours_sun), 0)'), 'billableHours'],
      ],
      raw: true,
    });
    const billableHours = parseFloat(billableResult[0]?.billableHours || 0);

    // Non-billable hours (last 30 days) — EXCLUDE drafts
    const nonBillableResult = await TimesheetEntry.findAll({
      where: { billable: false },
      include: [{
        model: Timesheet,
        as: 'timesheet',
        where: {
          week_start_date: { [Op.gte]: thirtyDaysAgo },
          status: { [Op.in]: nonDraftStatuses },
        },
        attributes: [],
      }],
      attributes: [
        [literal('COALESCE(SUM(hours_mon + hours_tue + hours_wed + hours_thu + hours_fri + hours_sat + hours_sun), 0)'), 'nonBillableHours'],
      ],
      raw: true,
    });
    const nonBillableHours = parseFloat(nonBillableResult[0]?.nonBillableHours || 0);

    // Approval rate (last 30 days)
    const totalTimesheets = await Timesheet.count({
      where: { week_start_date: { [Op.gte]: thirtyDaysAgo }, status: { [Op.ne]: 'draft' } },
    });
    const approvedTimesheets = await Timesheet.count({
      where: { week_start_date: { [Op.gte]: thirtyDaysAgo }, status: 'approved' },
    });
    const approvalRate = totalTimesheets > 0 ? Math.round((approvedTimesheets / totalTimesheets) * 100) : 0;

    // Pending approvals count
    const pendingApprovals = await Timesheet.count({ where: { status: 'submitted' } });

    return {
      totalEmployees,
      activeProjects,
      totalHoursLogged,
      billableHours,
      nonBillableHours,
      approvalRate,
      pendingApprovals,
    };
  }
  // ---- RECENT ACTIVITY (DB-driven from notifications) ----
  async getRecentActivity(userId) {
    const { Notification } = require('../infrastructure/models');
    const where = userId ? { user_id: userId } : {};
    const activities = await Notification.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: 10,
      raw: true,
    });
    return activities.map((n) => ({
      id: n.id,
      action: n.title,
      description: n.message,
      timestamp: n.created_at,
      type: n.type || 'info',
      category: n.category || 'general',
    }));
  }
}

module.exports = new AdminService();
