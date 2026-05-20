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
  async getEmployees(options) {
    const { Op } = require('sequelize');
    // Exclude admin from employee list
    const where = { ...(options.where || {}), role: { [Op.ne]: 'admin' } };
    // Status filter
    if (options.status && options.status !== 'all') {
      where.status = options.status;
    }
    return userRepository.findAll({ ...options, where });
  }

  /** Auto-generate employee_id: CT(YY)-NNNN e.g. CT26-0001 */
  async _generateEmployeeId() {
    const { User } = require('../infrastructure/models');
    const { Op } = require('sequelize');
    const yy = String(new Date().getFullYear()).slice(-2);
    const prefix = `CT${yy}-`;
    // Find the highest existing employee_id for this year
    const last = await User.findOne({
      where: { employee_id: { [Op.like]: `${prefix}%` } },
      order: [['employee_id', 'DESC']],
      attributes: ['employee_id'],
    });
    let nextNum = 1;
    if (last && last.employee_id) {
      const match = last.employee_id.match(/CT\d{2}-(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  }

  async createEmployee(data) {
    const existingEmail = await userRepository.findByEmail(data.email);
    if (existingEmail) throw new AppError('Email already exists', 409);

    // Employee ID: use provided or auto-generate
    let employeeId = data.employeeId;
    if (!employeeId) {
      employeeId = await this._generateEmployeeId();
    } else {
      // Check uniqueness
      const { User } = require('../infrastructure/models');
      const existing = await User.findOne({ where: { employee_id: employeeId } });
      if (existing) throw new AppError('Employee ID already exists', 409);
    }

    const autoPassword = generateAutoPassword(data.firstName, data.mobile, data.dob);
    const hashedPassword = await bcrypt.hash(autoPassword, 12);

    const user = await userRepository.create({
      employee_id: employeeId,
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
    if (data.employeeId !== undefined) updateData.employee_id = data.employeeId || null;

    return userRepository.update(id, updateData);
  }

  async resetEmployeePassword(id) {
    const existing = await userRepository.findById(id);
    if (!existing) throw new AppError('Employee not found', 404);

    const fullUser = await userRepository.findByEmail(existing.email);
    const autoPassword = generateAutoPassword(fullUser.first_name, fullUser.mobile, fullUser.dob);
    const hashedPassword = await bcrypt.hash(autoPassword, 12);

    await userRepository.update(id, { password: hashedPassword });

    try { await notificationService.onPasswordReset(id, fullUser.first_name); } catch (e) { /* silent */ }

    return { generatedPassword: autoPassword };
  }

  async deactivateEmployee(id) {
    const existing = await userRepository.findById(id);
    if (!existing) throw new AppError('Employee not found', 404);
    return userRepository.update(id, { status: 'inactive' });
  }

  async activateEmployee(id) {
    const existing = await userRepository.findById(id);
    if (!existing) throw new AppError('Employee not found', 404);
    return userRepository.update(id, { status: 'active' });
  }

  // Keep deleteEmployee for backward compat — but it just deactivates
  async deleteEmployee(id) {
    return this.deactivateEmployee(id);
  }

  // ---- PROJECTS ----
  async getProjects(options) {
    const { Op } = require('sequelize');
    const where = { ...(options.where || {}) };
    // Status filter
    if (options.status && options.status !== 'all') {
      where.status = options.status;
    }
    // Allow search by project_id too
    if (options.search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${options.search}%` } },
        { project_code: { [Op.iLike]: `%${options.search}%` } },
        { project_id: { [Op.iLike]: `%${options.search}%` } },
      ];
    }
    return projectRepository.findAll({ ...options, where, search: null });
  }

  /** Auto-generate project_id: CT-YYSSSS */
  async _generateProjectId(startDate) {
    const { Project } = require('../infrastructure/models');
    const { Op } = require('sequelize');
    const year = startDate ? new Date(startDate).getFullYear().toString().slice(-2) : new Date().getFullYear().toString().slice(-2);
    const prefix = `CT-${year}`;
    // Find highest existing for this year
    const last = await Project.findOne({
      where: { project_id: { [Op.like]: `${prefix}%` } },
      order: [['project_id', 'DESC']],
      attributes: ['project_id'],
      paranoid: false,
    });
    let nextNum = 1;
    if (last && last.project_id) {
      const match = last.project_id.match(/CT-\d{2}(\d{4})/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  }

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

    // Auto-generate project_id
    const projectId = await this._generateProjectId(data.startDate);

    return projectRepository.create({
      project_id: projectId,
      project_code: code,
      name: data.name,
      description: data.description,
      color: data.color || generateAutoColor(),
      partner_project_id: data.partnerProjectId || null,
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
    if (data.partnerProjectId !== undefined) updateData.partner_project_id = data.partnerProjectId || null;
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
  async getAssignments(options) {
    const { Op } = require('sequelize');
    const where = { ...(options.where || {}) };
    // Search handled via include filters in repository
    return assignmentRepository.findAll({ ...options, where });
  }

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
  async getDashboardStats(requestingUser) {
    const { TimesheetEntry, Timesheet, User, Project, ProjectAssignment } = require('../infrastructure/models');
    const { Op, fn, col, literal } = require('sequelize');

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const isAdmin = requestingUser.role === 'admin';
    const userId = requestingUser.id;

    if (!isAdmin) {
      // --- Employee personal stats ---
      const userTimesheets = await Timesheet.findAll({
        where: { user_id: userId, week_start_date: { [Op.gte]: thirtyDaysAgo } },
        attributes: ['id'],
        raw: true,
      });
      const tsIds = userTimesheets.map(t => t.id);
      const nonDraftStatuses = ['submitted', 'approved', 'rejected'];

      const totalResult = await TimesheetEntry.findAll({
        where: { timesheet_id: { [Op.in]: tsIds }, status: { [Op.in]: nonDraftStatuses } },
        attributes: [[literal('COALESCE(SUM(hours_mon + hours_tue + hours_wed + hours_thu + hours_fri + hours_sat + hours_sun), 0)'), 'totalHours']],
        raw: true,
      });
      const totalHoursLogged = parseFloat(totalResult[0]?.totalHours || 0);

      const billableResult = await TimesheetEntry.findAll({
        where: { timesheet_id: { [Op.in]: tsIds }, status: { [Op.in]: nonDraftStatuses }, billable: true },
        attributes: [[literal('COALESCE(SUM(hours_mon + hours_tue + hours_wed + hours_thu + hours_fri + hours_sat + hours_sun), 0)'), 'billableHours']],
        raw: true,
      });
      const billableHours = parseFloat(billableResult[0]?.billableHours || 0);
      const nonBillableHours = totalHoursLogged - billableHours;

      const totalEntries = await TimesheetEntry.count({
        where: { timesheet_id: { [Op.in]: tsIds }, status: { [Op.in]: nonDraftStatuses } },
      });
      const approvedEntries = await TimesheetEntry.count({
        where: { timesheet_id: { [Op.in]: tsIds }, status: 'approved' },
      });
      const approvalRate = totalEntries > 0 ? Math.round((approvedEntries / totalEntries) * 100) : 0;

      const pendingApprovals = await TimesheetEntry.count({
        where: { timesheet_id: { [Op.in]: tsIds }, status: 'submitted' },
      });

      const activeProjects = await ProjectAssignment.count({ where: { user_id: userId } });

      return {
        totalEmployees: 0, // not relevant for employee view
        activeProjects,
        totalHoursLogged,
        billableHours,
        nonBillableHours,
        approvalRate,
        pendingApprovals,
        isPersonal: true,
      };
    }

    // --- Admin company-wide stats ---
    const totalEmployees = await User.count({ where: { status: 'active' } });
    const activeProjects = await Project.count({ where: { status: 'active' } });
    const nonDraftStatuses = ['submitted', 'approved', 'rejected'];

    const totalResult = await TimesheetEntry.findAll({
      where: { status: { [Op.in]: nonDraftStatuses } },
      include: [{ model: Timesheet, as: 'timesheet', where: { week_start_date: { [Op.gte]: thirtyDaysAgo } }, attributes: [] }],
      attributes: [[literal('COALESCE(SUM(hours_mon + hours_tue + hours_wed + hours_thu + hours_fri + hours_sat + hours_sun), 0)'), 'totalHours']],
      raw: true,
    });
    const totalHoursLogged = parseFloat(totalResult[0]?.totalHours || 0);

    const billableResult = await TimesheetEntry.findAll({
      where: { status: { [Op.in]: nonDraftStatuses }, billable: true },
      include: [{ model: Timesheet, as: 'timesheet', where: { week_start_date: { [Op.gte]: thirtyDaysAgo } }, attributes: [] }],
      attributes: [[literal('COALESCE(SUM(hours_mon + hours_tue + hours_wed + hours_thu + hours_fri + hours_sat + hours_sun), 0)'), 'billableHours']],
      raw: true,
    });
    const billableHours = parseFloat(billableResult[0]?.billableHours || 0);

    const nonBillableResult = await TimesheetEntry.findAll({
      where: { status: { [Op.in]: nonDraftStatuses }, billable: false },
      include: [{ model: Timesheet, as: 'timesheet', where: { week_start_date: { [Op.gte]: thirtyDaysAgo } }, attributes: [] }],
      attributes: [[literal('COALESCE(SUM(hours_mon + hours_tue + hours_wed + hours_thu + hours_fri + hours_sat + hours_sun), 0)'), 'nonBillableHours']],
      raw: true,
    });
    const nonBillableHours = parseFloat(nonBillableResult[0]?.nonBillableHours || 0);

    const totalEntries = await TimesheetEntry.count({
      where: { status: { [Op.in]: nonDraftStatuses } },
      include: [{ model: Timesheet, as: 'timesheet', where: { week_start_date: { [Op.gte]: thirtyDaysAgo } }, attributes: [] }],
    });
    const approvedEntries = await TimesheetEntry.count({
      where: { status: 'approved' },
      include: [{ model: Timesheet, as: 'timesheet', where: { week_start_date: { [Op.gte]: thirtyDaysAgo } }, attributes: [] }],
    });
    const approvalRate = totalEntries > 0 ? Math.round((approvedEntries / totalEntries) * 100) : 0;

    const pendingApprovals = await TimesheetEntry.count({ where: { status: 'submitted' } });

    return {
      totalEmployees,
      activeProjects,
      totalHoursLogged,
      billableHours,
      nonBillableHours,
      approvalRate,
      pendingApprovals,
      isPersonal: false,
    };
  }

  // ---- ADMIN APPROVALS: Manager Dashboard ----
  async getManagersWithPendingApprovals() {
    const { User, TimesheetEntry, Timesheet } = require('../infrastructure/models');
    const { Op, literal } = require('sequelize');

    // Find all users who have direct reports (exclude admin)
    const managers = await User.findAll({
      where: { status: 'active', role: { [Op.ne]: 'admin' } },
      attributes: { exclude: ['password'] },
      include: [{
        model: User, as: 'directReports',
        attributes: ['id'],
        where: { status: 'active' },
        required: true,
      }],
    });

    const result = [];
    for (const manager of managers) {
      const directReportIds = manager.directReports.map(dr => dr.id);
      // Count pending (submitted) entries from direct reports
      const pendingCount = await TimesheetEntry.count({
        where: { status: 'submitted' },
        include: [{
          model: Timesheet, as: 'timesheet',
          where: { user_id: { [Op.in]: directReportIds } },
          attributes: [],
        }],
      });

      result.push({
        id: manager.id,
        firstName: manager.first_name,
        lastName: manager.last_name,
        email: manager.email,
        employeeId: manager.employee_id,
        pendingCount,
        totalDirectReports: directReportIds.length,
      });
    }
    // Sort: highest pending count first, then alphabetical
    result.sort((a, b) => {
      if (b.pendingCount !== a.pendingCount) return b.pendingCount - a.pendingCount;
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    });

    return result;
  }

  async getManagerDirectReportEntries(managerId, month) {
    const { User, TimesheetEntry, Timesheet, Project, Milestone } = require('../infrastructure/models');
    const { Op } = require('sequelize');

    // Get manager's direct reports
    const directReports = await User.findAll({
      where: { reporting_manager_id: managerId, status: 'active' },
      attributes: ['id', 'first_name', 'last_name', 'email', 'employee_id'],
    });
    const drIds = directReports.map(u => u.id);
    if (drIds.length === 0) return { directReports: [], entries: [] };

    // Parse month (e.g., "2026-05")
    let startDate, endDate;
    if (month) {
      const [y, m] = month.split('-').map(Number);
      startDate = new Date(y, m - 1, 1).toISOString().slice(0, 10);
      endDate = new Date(y, m, 0).toISOString().slice(0, 10);
    } else {
      // Default: current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    }

    const entries = await TimesheetEntry.findAll({
      include: [
        {
          model: Timesheet, as: 'timesheet',
          where: {
            user_id: { [Op.in]: drIds },
            week_start_date: { [Op.between]: [startDate, endDate] },
          },
          include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email', 'employee_id'] }],
        },
        { model: Project, as: 'project', attributes: ['id', 'name', 'project_code', 'project_id'] },
        { model: Milestone, as: 'milestone', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    });

    return { directReports, entries };
  }

  async sendBulkReminders(managerIds) {
    const { User } = require('../infrastructure/models');
    const results = [];
    for (const managerId of managerIds) {
      const manager = await User.findByPk(managerId, { attributes: ['id', 'first_name', 'last_name'] });
      if (manager) {
        try {
          await notificationService.notify(managerId, {
            title: 'Pending Timesheet Approvals',
            message: 'You have pending timesheet approvals from your team. Please review and take action.',
            type: 'warning',
            category: 'timesheet',
          });
          results.push({ managerId, status: 'sent' });
        } catch (e) {
          results.push({ managerId, status: 'failed' });
        }
      }
    }
    return results;
  }

  // ---- RECENT ACTIVITY (DB-driven from notifications) ----
  async getRecentActivity(userId, isAdmin = false) {
    const { Notification, User } = require('../infrastructure/models');
    const where = isAdmin ? {} : { user_id: userId };
    const activities = await Notification.findAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name'] }],
      order: [['created_at', 'DESC']],
      limit: 15,
      raw: false,
    });
    return activities.map((n) => {
      const userName = n.user ? `${n.user.first_name} ${n.user.last_name}` : 'Unknown';
      let description = n.message;
      if (isAdmin && n.user) {
        description = description.replace(/^Your?\s/i, `${userName}'s `);
      }

      return {
        id: n.id,
        action: n.title,
        description,
        timestamp: n.created_at ? new Date(n.created_at).toISOString() : new Date().toISOString(),
        type: n.type || 'info',
        category: n.category || 'general',
      };
    });
  }
}

module.exports = new AdminService();
