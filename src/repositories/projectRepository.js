const { Project, Milestone } = require('../infrastructure/models');

class ProjectRepository {
  async findAll(options = {}) {
    return Project.findAndCountAll({
      include: [{ model: Milestone, as: 'milestones' }],
      order: [['created_at', 'DESC']],
      ...options,
    });
  }

  async findById(id) {
    return Project.findByPk(id, {
      include: [{ model: Milestone, as: 'milestones' }],
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

  async delete(id) {
    return Project.destroy({ where: { id } });
  }
}

module.exports = new ProjectRepository();
