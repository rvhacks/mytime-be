const { Project, ProjectAssignment } = require('../infrastructure/models');
const { Op } = require('sequelize');

class ProjectRepository {
  async findAll(options = {}) {
    const { where = {}, search, ...rest } = options;
    const finalWhere = { ...where };

    if (search) {
      finalWhere[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { project_code: { [Op.iLike]: `%${search}%` } },
      ];
    }

    return Project.findAndCountAll({
      where: finalWhere,
      include: [{ model: ProjectAssignment, as: 'assignments' }],
      order: [['created_at', 'DESC']],
      ...rest,
    });
  }

  async findById(id) {
    return Project.findByPk(id, {
      include: [{ model: ProjectAssignment, as: 'assignments' }],
    });
  }

  async findByCode(code) {
    return Project.findOne({ where: { project_code: code } });
  }

  async create(data) {
    return Project.create(data);
  }

  async update(id, data) {
    await Project.update(data, { where: { id } });
    return this.findById(id);
  }

  // Soft delete — handled by Sequelize paranoid mode
  async delete(id) {
    return Project.destroy({ where: { id } });
  }
}

module.exports = new ProjectRepository();
