const { Timesheet, TimesheetEntry, User, Project, Milestone, sequelize } = require('../infrastructure/models');
const { Op } = require('sequelize');

class TimesheetRepository {
  async findById(id) {
    return Timesheet.findByPk(id, {
      include: [
        {
          model: TimesheetEntry, as: 'entries',
          include: [
            { model: Project, as: 'project', attributes: ['id', 'name', 'project_code', 'color'] },
            { model: Milestone, as: 'milestone', attributes: ['id', 'name'] },
          ],
        },
        { model: User, as: 'user', attributes: { exclude: ['password'] } },
        { model: User, as: 'reviewer', attributes: ['id', 'first_name', 'last_name'] },
      ],
    });
  }

  async findByUserAndWeek(userId, weekStartDate) {
    return Timesheet.findOne({
      where: { user_id: userId, week_start_date: weekStartDate },
      include: [{
        model: TimesheetEntry, as: 'entries',
        include: [
          { model: Project, as: 'project', attributes: ['id', 'name', 'project_code', 'color'] },
          { model: Milestone, as: 'milestone', attributes: ['id', 'name'] },
        ],
      }],
    });
  }

  async findByUser(userId, options = {}) {
    return Timesheet.findAndCountAll({
      where: { user_id: userId },
      include: [{
        model: TimesheetEntry, as: 'entries',
        include: [
          { model: Project, as: 'project', attributes: ['id', 'name', 'project_code', 'color'] },
          { model: Milestone, as: 'milestone', attributes: ['id', 'name'] },
        ],
      }],
      order: [['week_start_date', 'DESC']],
      ...options,
    });
  }

  async findPendingApprovals(options = {}) {
    const { where = {}, ...rest } = options;
    return Timesheet.findAndCountAll({
      where: { status: 'submitted', ...where },
      include: [
        { model: User, as: 'user', attributes: { exclude: ['password'] } },
        {
          model: TimesheetEntry, as: 'entries',
          include: [
            { model: Project, as: 'project', attributes: ['id', 'name', 'project_code', 'color'] },
            { model: Milestone, as: 'milestone', attributes: ['id', 'name'] },
          ],
        },
      ],
      order: [['submitted_at', 'DESC']],
      ...rest,
    });
  }

  async findAllForReports(filters = {}) {
    const where = {};
    if (filters.startDate) where.week_start_date = { [Op.gte]: filters.startDate };
    if (filters.endDate) {
      where.week_end_date = where.week_end_date || {};
      where.week_end_date = { ...where.week_end_date, [Op.lte]: filters.endDate };
    }
    if (filters.userId) where.user_id = filters.userId;

    const projectWhere = {};
    if (filters.projectId) projectWhere.project_id = filters.projectId;

    return Timesheet.findAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name'] },
        {
          model: TimesheetEntry, as: 'entries',
          where: Object.keys(projectWhere).length ? projectWhere : undefined,
          required: Object.keys(projectWhere).length > 0,
          include: [
            { model: Project, as: 'project', attributes: ['id', 'name', 'project_code', 'color'] },
            { model: Milestone, as: 'milestone', attributes: ['id', 'name'] },
          ],
        },
      ],
      order: [['week_start_date', 'DESC']],
    });
  }

  async create(data, entries) {
    return sequelize.transaction(async (t) => {
      const timesheet = await Timesheet.create(data, { transaction: t });
      if (entries && entries.length > 0) {
        const entryData = entries.map((e) => ({ ...e, timesheet_id: timesheet.id }));
        await TimesheetEntry.bulkCreate(entryData, { transaction: t });
      }
      return this.findById(timesheet.id);
    });
  }

  async update(id, data, entries) {
    return sequelize.transaction(async (t) => {
      await Timesheet.update(data, { where: { id }, transaction: t });
      if (entries) {
        await TimesheetEntry.destroy({ where: { timesheet_id: id }, transaction: t });
        if (entries.length > 0) {
          const entryData = entries.map((e) => ({ ...e, timesheet_id: id }));
          await TimesheetEntry.bulkCreate(entryData, { transaction: t });
        }
      }
      return this.findById(id);
    });
  }

  async updateStatus(id, data) {
    await Timesheet.update(data, { where: { id } });
    return this.findById(id);
  }
}

module.exports = new TimesheetRepository();
