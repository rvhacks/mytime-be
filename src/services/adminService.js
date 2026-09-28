const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const designationRepository = require('../repositories/designationRepository');
const projectRepository = require('../repositories/projectRepository');
const assignmentRepository = require('../repositories/assignmentRepository');
const milestoneRepository = require('../repositories/milestoneRepository');
const notificationService = require('./notificationService');
const { generateAutoPassword, generateProjectCode, generateAutoColor } = require('../utils/helpers');
const AppError = require('../utils/AppError');

/**
 * Format a Date as a local "YYYY-MM-DD" string — deliberately NOT `.toISOString().slice(0, 10)`,
 * which converts to UTC first. On a server whose local timezone is ahead of UTC (e.g. IST,
 * UTC+5:30), that conversion rolls local midnight back to the previous day, silently shifting
 * "today"/month boundaries a day earlier. Used wherever we need "the 1st/last day of this month"
 * in the server's own local calendar, not a date the browser already sent us.
 */
function toLocalDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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
      joining_date: data.joiningDate,
      reporting_manager_id: data.reportingManagerId || null,
      status: 'active',
      must_change_password: true,
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

    await userRepository.update(id, { password: hashedPassword, must_change_password: true });

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
    if (options.userId) {
      where.user_id = options.userId;
    }
    if (options.projectId) {
      where.project_id = options.projectId;
    }
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

  /**
   * Export: every employee (excluding admin) with their assigned projects
   * as a comma-separated list, sorted alphabetically by name.
   * Archived (soft-deleted) projects are excluded from the list, matching
   * what the Assignments page itself shows.
   */
  async exportEmployeeAssignments() {
    const { sequelize } = require('../infrastructure/models');
    const { QueryTypes } = require('sequelize');

    const rows = await sequelize.query(
      `SELECT
         u.employee_id,
         u.first_name,
         u.last_name,
         COALESCE(STRING_AGG(p.name, ', ' ORDER BY p.name), '') AS project_names
       FROM users u
       LEFT JOIN project_assignments pa ON pa.user_id = u.id
       LEFT JOIN projects p ON p.id = pa.project_id AND p.deleted_at IS NULL
       WHERE u.role != 'admin'
       GROUP BY u.id, u.employee_id, u.first_name, u.last_name
       ORDER BY u.first_name ASC, u.last_name ASC`,
      { type: QueryTypes.SELECT }
    );

    return rows.map(r => ({
      employeeId: r.employee_id,
      employeeName: `${r.first_name} ${r.last_name}`.trim(),
      projects: r.project_names || '',
    }));
  }

  // ---- MILESTONES (Role-based templates) ----
  async getMilestones(options) {
    if (options.role) {
      options.where = { ...(options.where || {}), role: options.role };
    }
    return milestoneRepository.findAll(options);
  }

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
  /**
   * Hours are computed with the exact same date-range-aware, day-level-clipped SQL as
   * getTimesheetReport() below, scoped to the current calendar month. This keeps the
   * Dashboard's "Hours Logged" in sync with the Reports page's default (this month) view —
   * they used to diverge because this method summed whole weeks with `week_start_date >=
   * monthStart` (no upper bound, no day clipping), which double-counted/over-counted hours
   * that fall in a week straddling the month boundary.
   */
  async getDashboardStats(requestingUser) {
    const { TimesheetEntry, Timesheet, User, Project, ProjectAssignment, sequelize } = require('../infrastructure/models');
    const { Op, QueryTypes } = require('sequelize');

    const isAdmin = requestingUser.role === 'admin';
    const userId = requestingUser.id;

    const now = new Date();
    const monthStart = toLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
    const monthEnd = toLocalDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0));

    const dayColumns = [
      { col: 'hours_mon', offset: 0 }, { col: 'hours_tue', offset: 1 }, { col: 'hours_wed', offset: 2 },
      { col: 'hours_thu', offset: 3 }, { col: 'hours_fri', offset: 4 }, { col: 'hours_sat', offset: 5 },
      { col: 'hours_sun', offset: 6 },
    ];
    const hoursSql = dayColumns.map(d =>
      `(CASE WHEN (t.week_start_date + INTERVAL '${d.offset} days')::date >= :monthStart::date AND (t.week_start_date + INTERVAL '${d.offset} days')::date <= :monthEnd::date THEN COALESCE(te.${d.col}, 0) ELSE 0 END)`
    ).join(' + ');

    const replacements = { monthStart, monthEnd };
    let userFilter = '';
    if (!isAdmin) {
      userFilter = ' AND u.id = :userId';
      replacements.userId = userId;
    }

    const hoursQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN te.status IN ('submitted','resubmitted','approved','rejected') THEN (${hoursSql}) ELSE 0 END), 0) AS total_hours,
        -- Billable/non-billable are approved-only, matching the Reports page's definition —
        -- billing status is only meaningful once a manager has confirmed the hours.
        COALESCE(SUM(CASE WHEN te.status = 'approved' AND te.billable = true THEN (${hoursSql}) ELSE 0 END), 0) AS billable_hours,
        COALESCE(SUM(CASE WHEN te.status = 'approved' AND te.billable = false THEN (${hoursSql}) ELSE 0 END), 0) AS non_billable_hours,
        COALESCE(SUM(CASE WHEN te.status = 'approved' THEN (${hoursSql}) ELSE 0 END), 0) AS approved_hours,
        COALESCE(SUM(CASE WHEN te.status IN ('submitted','resubmitted') THEN (${hoursSql}) ELSE 0 END), 0) AS unapproved_hours
      FROM timesheet_entries te
      JOIN timesheets t ON t.id = te.timesheet_id
      JOIN users u ON u.id = t.user_id
      WHERE u.role != 'admin'
        AND t.week_start_date <= :monthEnd AND (t.week_start_date + INTERVAL '6 days')::date >= :monthStart::date
        ${userFilter}`;

    const [hoursResult] = await sequelize.query(hoursQuery, { replacements, type: QueryTypes.SELECT });

    const totalHoursLogged = parseFloat(hoursResult.total_hours);
    const billableHours = parseFloat(hoursResult.billable_hours);
    const nonBillableHours = parseFloat(hoursResult.non_billable_hours);
    const approvedHours = parseFloat(hoursResult.approved_hours);
    const unapprovedHours = parseFloat(hoursResult.unapproved_hours);

    // Pending-approval backlog (entry count): NOT month-scoped on purpose — this mirrors the
    // manager/admin approval queues, which also surface the full backlog regardless of when the
    // entry was submitted. Includes 'resubmitted' so it matches those same queues.
    const pendingApprovals = await TimesheetEntry.count({
      where: { status: { [Op.in]: ['submitted', 'resubmitted'] } },
      ...(!isAdmin
        ? { include: [{ model: Timesheet, as: 'timesheet', where: { user_id: userId }, attributes: [] }] }
        : {}),
    });

    if (!isAdmin) {
      const activeProjects = await ProjectAssignment.count({ where: { user_id: userId } });
      return {
        totalEmployees: 0, // not relevant for employee view
        activeProjects,
        totalHoursLogged,
        billableHours,
        nonBillableHours,
        approvedHours,
        unapprovedHours,
        pendingApprovals,
        isPersonal: true,
      };
    }

    const totalEmployees = await User.count({ where: { status: 'active', role: { [Op.ne]: 'admin' } } });
    const activeProjects = await Project.count({ where: { status: 'active' } });

    return {
      totalEmployees,
      activeProjects,
      totalHoursLogged,
      billableHours,
      nonBillableHours,
      approvedHours,
      unapprovedHours,
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
        where: { status: { [Op.in]: ['submitted', 'resubmitted'] } },
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
        avatarUrl: manager.avatar_path || null,
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
      attributes: ['id', 'first_name', 'last_name', 'email', 'employee_id', 'avatar_path'],
    });
    const drIds = directReports.map(u => u.id);
    if (drIds.length === 0) return { directReports: [], entries: [] };

    // Fetch ALL pending (submitted/resubmitted) entries across all dates
    const entries = await TimesheetEntry.findAll({
      where: { status: { [Op.in]: ['submitted', 'resubmitted'] } },
      include: [
        {
          model: Timesheet, as: 'timesheet',
          where: {
            user_id: { [Op.in]: drIds },
          },
          include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email', 'employee_id', 'avatar_path'] }],
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

  // ---- REPORTS ----
  async getTimesheetReport({ startDate, endDate, employeeId, projectId, selectedEmployeeIds, maxApprovedHours, managerId, page = 1, limit = 20 }) {
    const { sequelize } = require('../infrastructure/models');
    const { QueryTypes } = require('sequelize');

    const now = new Date();
    if (!startDate) startDate = toLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
    if (!endDate) endDate = toLocalDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0));

    // Build date-range-aware hours SQL: only count a day's hours if that day falls within [startDate, endDate]
    // week_start_date is Monday, so: mon=+0, tue=+1, wed=+2, thu=+3, fri=+4, sat=+5, sun=+6
    const dayColumns = [
      { col: 'hours_mon', offset: 0 },
      { col: 'hours_tue', offset: 1 },
      { col: 'hours_wed', offset: 2 },
      { col: 'hours_thu', offset: 3 },
      { col: 'hours_fri', offset: 4 },
      { col: 'hours_sat', offset: 5 },
      { col: 'hours_sun', offset: 6 },
    ];
    const hoursSql = dayColumns.map(d =>
      `(CASE WHEN (t.week_start_date + INTERVAL '${d.offset} days')::date >= :startDate::date AND (t.week_start_date + INTERVAL '${d.offset} days')::date <= :endDate::date THEN COALESCE(te.${d.col}, 0) ELSE 0 END)`
    ).join(' + ');

    // Build optional JOIN conditions for timesheet_entries
    // Use week_end_date overlap: a week overlaps with [startDate, endDate] if week_start <= endDate AND week_end >= startDate
    let teConds = `te.status IN ('submitted', 'resubmitted', 'approved', 'rejected')
      AND t.week_start_date <= :endDate AND (t.week_start_date + INTERVAL '6 days')::date >= :startDate::date`;
    const replacements = { startDate, endDate };

    if (projectId) {
      // Accepts a single id or a comma-separated list (multi-select filter) — IN() works fine
      // for a single value too, so there's no need to special-case the count.
      const projectIds = Array.isArray(projectId) ? projectId : String(projectId).split(',').map((s) => s.trim()).filter(Boolean);
      if (projectIds.length > 0) {
        teConds += ` AND te.project_id IN (:projectIds)`;
        replacements.projectIds = projectIds;
      }
    }

    // User-level WHERE: always show currently-active employees (even with 0 hours in range),
    // PLUS anyone who has qualifying entries in this exact date range even if they were later
    // deactivated — otherwise hours genuinely submitted while active vanish retroactively from
    // a report covering the period when they submitted them (the "active" filter is meant to
    // control headcount, not erase history). Past Submitted Timesheets already works this way.
    let userWhere = `u.role != 'admin' AND (
      u.status = 'active'
      OR EXISTS (
        SELECT 1 FROM timesheets t2
        JOIN timesheet_entries te2 ON te2.timesheet_id = t2.id
        WHERE t2.user_id = u.id
          AND te2.status IN ('submitted', 'resubmitted', 'approved', 'rejected')
          AND t2.week_start_date <= :endDate
          AND (t2.week_start_date + INTERVAL '6 days')::date >= :startDate::date
      )
    )`;
    // Manager scope: the manager's own hours, plus their direct reports. Used by the
    // manager-facing "team report" endpoints, which reuse this exact function so their numbers
    // are always defined identically to the admin Employee Summary report.
    if (managerId) {
      userWhere += ` AND (u.id = :managerId OR u.reporting_manager_id = :managerId)`;
      replacements.managerId = managerId;
    }
    if (employeeId) {
      // Accepts a single id or a comma-separated list (multi-select filter)
      const employeeIds = Array.isArray(employeeId) ? employeeId : String(employeeId).split(',').map((s) => s.trim()).filter(Boolean);
      if (employeeIds.length > 0) {
        userWhere += ` AND u.id IN (:employeeIds)`;
        replacements.employeeIds = employeeIds;
      }
    }
    if (selectedEmployeeIds && selectedEmployeeIds.length > 0) {
      userWhere += ` AND u.employee_id IN (:selectedEmployeeIds)`;
      replacements.selectedEmployeeIds = selectedEmployeeIds;
    }

    // LEFT JOIN so ALL active employees appear even with 0 hours
    const baseSql = `
      FROM users u
      LEFT JOIN timesheets t ON t.user_id = u.id AND t.week_start_date <= :endDate AND (t.week_start_date + INTERVAL '6 days')::date >= :startDate::date
      LEFT JOIN timesheet_entries te ON te.timesheet_id = t.id AND ${teConds}
      WHERE ${userWhere}`;

    // Summary: totals across ALL matching users (not just current page)
    const summaryQuery = `
      SELECT
        COALESCE(SUM(${hoursSql}), 0) AS total_submitted_hours,
        COALESCE(SUM(CASE WHEN te.status = 'approved' THEN (${hoursSql}) ELSE 0 END), 0) AS approved_hours,
        COALESCE(SUM(CASE WHEN te.status IN ('submitted', 'resubmitted') THEN (${hoursSql}) ELSE 0 END), 0) AS unapproved_hours,
        COALESCE(SUM(CASE WHEN te.status = 'approved' AND te.billable = true THEN (${hoursSql}) ELSE 0 END), 0) AS billable_hours,
        COALESCE(SUM(CASE WHEN te.status = 'approved' AND te.billable = false THEN (${hoursSql}) ELSE 0 END), 0) AS non_billable_hours
      ${baseSql}`;

    const [summaryResult] = await sequelize.query(summaryQuery, {
      replacements,
      type: QueryTypes.SELECT,
    });

    // Optional HAVING clause for approved hours filter
    let havingClause = '';
    if (maxApprovedHours !== undefined && maxApprovedHours !== null && maxApprovedHours !== '') {
      havingClause = ` HAVING COALESCE(SUM(CASE WHEN te.status = 'approved' THEN (${hoursSql}) ELSE 0 END), 0) <= :maxApprovedHours`;
      replacements.maxApprovedHours = parseFloat(maxApprovedHours);
    }

    // Count distinct users (with HAVING if applicable)
    const countQuery = havingClause
      ? `SELECT COUNT(*) AS total FROM (SELECT u.id ${baseSql} GROUP BY u.id${havingClause}) sub`
      : `SELECT COUNT(DISTINCT u.id) AS total ${baseSql}`;
    const [countResult] = await sequelize.query(countQuery, {
      replacements,
      type: QueryTypes.SELECT,
    });
    const total = parseInt(countResult.total, 10);

    const offset = (page - 1) * limit;
    const rowsQuery = `
      SELECT
        u.employee_id,
        u.first_name,
        u.last_name,
        COALESCE(SUM(${hoursSql}), 0) AS total_submitted_hours,
        COALESCE(SUM(CASE WHEN te.status = 'approved' THEN (${hoursSql}) ELSE 0 END), 0) AS approved_hours,
        COALESCE(SUM(CASE WHEN te.status IN ('submitted', 'resubmitted') THEN (${hoursSql}) ELSE 0 END), 0) AS unapproved_hours,
        COALESCE(SUM(CASE WHEN te.status = 'approved' AND te.billable = true THEN (${hoursSql}) ELSE 0 END), 0) AS billable_hours,
        COALESCE(SUM(CASE WHEN te.status = 'approved' AND te.billable = false THEN (${hoursSql}) ELSE 0 END), 0) AS non_billable_hours
      ${baseSql}
      GROUP BY u.id, u.employee_id, u.first_name, u.last_name
      ${havingClause}
      ORDER BY u.first_name ASC, u.last_name ASC
      LIMIT :limit OFFSET :offset`;

    const rows = await sequelize.query(rowsQuery, {
      replacements: { ...replacements, limit, offset },
      type: QueryTypes.SELECT,
    });

    return {
      summary: {
        totalSubmittedHours: parseFloat(summaryResult.total_submitted_hours),
        approvedHours: parseFloat(summaryResult.approved_hours),
        // Same definition as the Dashboard's "Unapproved Hours" card: submitted + resubmitted
        // only. Rejected hours are excluded — they've already been reviewed and are waiting on
        // the employee to resubmit, not on a manager's approval decision.
        unapprovedHours: parseFloat(summaryResult.unapproved_hours),
        billableHours: parseFloat(summaryResult.billable_hours),
        nonBillableHours: parseFloat(summaryResult.non_billable_hours),
      },
      rows: rows.map(r => ({
        employeeId: r.employee_id,
        employeeName: `${r.first_name} ${r.last_name}`,
        totalSubmittedHours: parseFloat(r.total_submitted_hours),
        approvedHours: parseFloat(r.approved_hours),
        unapprovedHours: parseFloat(r.unapproved_hours),
        billableHours: parseFloat(r.billable_hours),
        nonBillableHours: parseFloat(r.non_billable_hours),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ---- Past Submitted Timesheets (all employees) ----
  async getPastSubmittedTimesheets({ startDate, endDate, employeeId, projectId, status, page = 1, limit = 20 }) {
    const { sequelize } = require('../infrastructure/models');
    const { QueryTypes } = require('sequelize');

    const hoursSql = `COALESCE(te.hours_mon,0) + COALESCE(te.hours_tue,0) + COALESCE(te.hours_wed,0) + COALESCE(te.hours_thu,0) + COALESCE(te.hours_fri,0) + COALESCE(te.hours_sat,0) + COALESCE(te.hours_sun,0)`;

    let whereClauses = `te.status IN ('submitted', 'resubmitted', 'approved', 'rejected') AND u.role != 'admin'`;
    const replacements = {};

    // Status filter
    if (status) {
      if (status === 'pending_approval') {
        whereClauses = `te.status IN ('submitted', 'resubmitted') AND u.role != 'admin'`;
      } else {
        whereClauses = `te.status = :statusFilter AND u.role != 'admin'`;
        replacements.statusFilter = status;
      }
    }

    if (startDate) {
      whereClauses += ` AND t.week_start_date >= :startDate`;
      replacements.startDate = startDate;
    }
    if (endDate) {
      whereClauses += ` AND t.week_start_date <= :endDate`;
      replacements.endDate = endDate;
    }
    if (employeeId) {
      // Accepts a single id or a comma-separated list (multi-select filter). Also supports
      // both UUID and employee_id format (e.g. CT26-0001) — the deep-link "view this employee"
      // links elsewhere in the app pass the employee_id string, not the UUID — detected from
      // the first id in the list (a request never mixes both formats in practice).
      const employeeIds = Array.isArray(employeeId) ? employeeId : String(employeeId).split(',').map((s) => s.trim()).filter(Boolean);
      if (employeeIds.length > 0) {
        const isUuid = /^[0-9a-f]{8}-/i.test(employeeIds[0]);
        whereClauses += isUuid ? ` AND u.id IN (:employeeIds)` : ` AND u.employee_id IN (:employeeIds)`;
        replacements.employeeIds = employeeIds;
      }
    }
    if (projectId) {
      const projectIds = Array.isArray(projectId) ? projectId : String(projectId).split(',').map((s) => s.trim()).filter(Boolean);
      if (projectIds.length > 0) {
        whereClauses += ` AND te.project_id IN (:projectIds)`;
        replacements.projectIds = projectIds;
      }
    }

    const baseSql = `
      FROM timesheet_entries te
      JOIN timesheets t ON t.id = te.timesheet_id
      JOIN users u ON u.id = t.user_id
      JOIN projects p ON p.id = te.project_id
      WHERE ${whereClauses}`;

    // Count
    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) AS total ${baseSql}`,
      { replacements, type: QueryTypes.SELECT }
    );
    const total = parseInt(countResult.total, 10);

    const offset = (page - 1) * limit;
    const rowsQuery = `
      SELECT
        te.id,
        u.employee_id,
        CONCAT(u.first_name, ' ', u.last_name) AS employee_name,
        p.name AS project_name,
        p.project_code,
        t.week_start_date,
        t.week_end_date,
        te.status,
        te.billable,
        te.task_description,
        (${hoursSql}) AS total_hours,
        te.submitted_at,
        te.reviewed_at,
        te.review_comments
      ${baseSql}
      ORDER BY employee_name ASC, t.week_start_date DESC
      LIMIT :limit OFFSET :offset`;

    const rows = await sequelize.query(rowsQuery, {
      replacements: { ...replacements, limit, offset },
      type: QueryTypes.SELECT,
    });

    return {
      rows: rows.map(r => ({
        id: r.id,
        employeeId: r.employee_id,
        employeeName: r.employee_name,
        projectName: r.project_name,
        projectCode: r.project_code,
        weekStartDate: r.week_start_date,
        weekEndDate: r.week_end_date,
        status: r.status,
        billable: r.billable,
        taskDescription: r.task_description,
        totalHours: parseFloat(r.total_hours),
        submittedAt: r.submitted_at,
        reviewedAt: r.reviewed_at,
        reviewComments: r.review_comments,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new AdminService();
