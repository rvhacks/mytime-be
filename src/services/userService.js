const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/AppError');
const { User, Designation, ProjectAssignment, Project } = require('../infrastructure/models');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Ensure upload directory exists
const UPLOAD_DIR = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

class UserService {
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const directReportCount = await User.count({
      where: { reporting_manager_id: userId, status: 'active' },
    });

    const json = user.toJSON();
    let avatarUrl = null;
    if (json.avatar_path) {
      const filename = json.avatar_path.includes('/') ? path.basename(json.avatar_path) : json.avatar_path;
      avatarUrl = `/uploads/avatars/${filename}`;
    }

    // Fetch reporting manager basic info
    let reportingManager = null;
    if (json.reporting_manager_id) {
      const rm = await User.findByPk(json.reporting_manager_id, {
        attributes: ['id', 'first_name', 'last_name', 'email', 'mobile', 'avatar_path'],
        include: [{ model: Designation, as: 'designation', attributes: ['name'] }],
      });
      if (rm) {
        const rmJson = rm.toJSON();
        let rmAvatar = null;
        if (rmJson.avatar_path) {
          const fn = rmJson.avatar_path.includes('/') ? path.basename(rmJson.avatar_path) : rmJson.avatar_path;
          rmAvatar = `/uploads/avatars/${fn}`;
        }
        reportingManager = {
          id: rmJson.id,
          firstName: rmJson.first_name,
          lastName: rmJson.last_name,
          name: `${rmJson.first_name} ${rmJson.last_name}`,
          email: rmJson.email,
          mobile: rmJson.mobile || '',
          avatarUrl: rmAvatar,
          designation: rmJson.designation?.name || '',
        };
      }
    }

    return { ...json, avatarUrl, isManager: directReportCount > 0, reportingManager };
  }

  async updateProfile(userId, data) {
    const updateData = {};
    if (data.firstName) updateData.first_name = data.firstName;
    if (data.lastName) updateData.last_name = data.lastName;
    if (data.mobile) updateData.mobile = data.mobile;
    if (data.department) updateData.department = data.department;
    if (data.dob) updateData.dob = data.dob;
    if (data.designationId) updateData.designation_id = data.designationId;
    return userRepository.update(userId, updateData);
  }

  async uploadAvatar(userId, file) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    if (user.avatar_path) {
      const oldFile = user.avatar_path.includes('/') ? user.avatar_path : path.join(UPLOAD_DIR, user.avatar_path);
      try { fs.unlinkSync(oldFile); } catch { /* ignore */ }
    }

    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `${userId}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(filepath, file.buffer);

    await User.update({ avatar_path: filename }, { where: { id: userId } });
    return { avatarUrl: `/uploads/avatars/${filename}` };
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findByPk(userId);
    if (!user) throw new AppError('User not found', 404);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new AppError('Current password is incorrect', 400);

    const hashed = await bcrypt.hash(newPassword, 12);
    await User.update({ password: hashed }, { where: { id: userId } });
    return { message: 'Password changed successfully' };
  }

  /**
   * Employee report: aggregated per-week timesheet data for a user.
   */
  async getMyReport({ userId, startDate, endDate, projectId, page = 1, limit = 20 }) {
    const { sequelize } = require('../infrastructure/models');
    const { QueryTypes } = require('sequelize');

    const hoursSql = `COALESCE(te.hours_mon,0) + COALESCE(te.hours_tue,0) + COALESCE(te.hours_wed,0) + COALESCE(te.hours_thu,0) + COALESCE(te.hours_fri,0) + COALESCE(te.hours_sat,0) + COALESCE(te.hours_sun,0)`;

    let whereClauses = `t.user_id = :userId AND te.status IN ('submitted', 'resubmitted', 'approved')`;
    const replacements = { userId };

    if (startDate) {
      whereClauses += ` AND t.week_start_date >= :startDate`;
      replacements.startDate = startDate;
    }
    if (endDate) {
      whereClauses += ` AND t.week_start_date <= :endDate`;
      replacements.endDate = endDate;
    }
    if (projectId) {
      whereClauses += ` AND te.project_id = :projectId`;
      replacements.projectId = projectId;
    }

    const baseSql = `
      FROM timesheet_entries te
      JOIN timesheets t ON te.timesheet_id = t.id
      LEFT JOIN projects p ON te.project_id = p.id
      WHERE ${whereClauses}`;

    const countQuery = `SELECT COUNT(DISTINCT t.id) AS total ${baseSql}`;
    const [countResult] = await sequelize.query(countQuery, { replacements, type: QueryTypes.SELECT });
    const total = parseInt(countResult.total, 10);

    const offset = (page - 1) * limit;
    const rowsQuery = `
      SELECT
        t.id AS timesheet_id,
        t.week_start_date,
        t.week_end_date,
        ARRAY_AGG(DISTINCT p.name) AS project_names,
        COALESCE(SUM(${hoursSql}), 0) AS total_submitted_hours,
        COALESCE(SUM(CASE WHEN te.status = 'approved' THEN (${hoursSql}) ELSE 0 END), 0) AS approved_hours,
        COALESCE(SUM(CASE WHEN te.status = 'approved' AND te.billable = true THEN (${hoursSql}) ELSE 0 END), 0) AS billable_hours,
        COALESCE(SUM(CASE WHEN te.status = 'approved' AND te.billable = false THEN (${hoursSql}) ELSE 0 END), 0) AS non_billable_hours
      ${baseSql}
      GROUP BY t.id, t.week_start_date, t.week_end_date
      ORDER BY t.week_start_date DESC
      LIMIT :limit OFFSET :offset`;

    const rows = await sequelize.query(rowsQuery, {
      replacements: { ...replacements, limit, offset },
      type: QueryTypes.SELECT,
    });

    return {
      rows: rows.map(r => ({
        timesheetId: r.timesheet_id,
        weekStartDate: r.week_start_date,
        weekEndDate: r.week_end_date,
        projects: r.project_names || [],
        totalSubmittedHours: parseFloat(r.total_submitted_hours),
        approvedHours: parseFloat(r.approved_hours),
        billableHours: parseFloat(r.billable_hours),
        nonBillableHours: parseFloat(r.non_billable_hours),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * My Team: employees who share projects with the user + direct reports (if RM).
   */
  async getMyTeam(userId) {
    const { Op } = require('sequelize');

    const myAssignments = await ProjectAssignment.findAll({
      where: { user_id: userId },
      attributes: ['project_id'],
    });
    const myProjectIds = myAssignments.map(a => a.project_id);

    let teammateIds = new Set();
    if (myProjectIds.length > 0) {
      const sharedAssignments = await ProjectAssignment.findAll({
        where: { project_id: { [Op.in]: myProjectIds }, user_id: { [Op.ne]: userId } },
        attributes: ['user_id'],
      });
      sharedAssignments.forEach(a => teammateIds.add(a.user_id));
    }

    // If RM, also include direct reports
    const directReports = await User.findAll({
      where: { reporting_manager_id: userId, status: 'active' },
      attributes: ['id'],
    });
    directReports.forEach(u => teammateIds.add(u.id));

    if (teammateIds.size === 0) {
      // Still return projects even if no team members
      let projects = [];
      if (myProjectIds.length > 0) {
        projects = await Project.findAll({
          where: { id: { [Op.in]: myProjectIds } },
          attributes: ['id', 'name', 'project_code'],
          order: [['name', 'ASC']],
        });
      }
      return { members: [], projects: projects.map(p => ({ id: p.id, name: p.name, code: p.project_code })) };
    }

    const members = await User.findAll({
      where: { id: { [Op.in]: [...teammateIds] }, status: 'active' },
      attributes: ['id', 'employee_id', 'first_name', 'last_name', 'email', 'mobile', 'avatar_path', 'role'],
      include: [{ model: Designation, as: 'designation', attributes: ['name'] }],
      order: [['first_name', 'ASC'], ['last_name', 'ASC']],
    });

    // Gather all project IDs (user + direct reports if RM)
    const allProjectIds = new Set(myProjectIds);
    if (directReports.length > 0) {
      const reportAssignments = await ProjectAssignment.findAll({
        where: { user_id: { [Op.in]: directReports.map(u => u.id) } },
        attributes: ['project_id'],
      });
      reportAssignments.forEach(a => allProjectIds.add(a.project_id));
    }

    let projects = [];
    if (allProjectIds.size > 0) {
      projects = await Project.findAll({
        where: { id: { [Op.in]: [...allProjectIds] } },
        attributes: ['id', 'name', 'project_code'],
        order: [['name', 'ASC']],
      });
    }

    return {
      members: members.map(m => {
        const j = m.toJSON();
        let avatarUrl = null;
        if (j.avatar_path) {
          const fn = j.avatar_path.includes('/') ? path.basename(j.avatar_path) : j.avatar_path;
          avatarUrl = `/uploads/avatars/${fn}`;
        }
        return {
          id: j.id,
          employeeId: j.employee_id,
          firstName: j.first_name,
          lastName: j.last_name,
          name: `${j.first_name} ${j.last_name}`,
          email: j.email,
          mobile: j.mobile || '',
          avatarUrl,
          designation: j.designation?.name || '',
          isDirectReport: directReports.some(d => d.id === j.id),
        };
      }),
      projects: projects.map(p => ({ id: p.id, name: p.name, code: p.project_code })),
    };
  }
}

module.exports = new UserService();
