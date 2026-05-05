const { Milestone, Project } = require('../infrastructure/models');

class MilestoneRepository {
  async findAll(options = {}) {
    return Milestone.findAndCountAll({
      include: [{ model: Project, as: 'project', attributes: ['id', 'name', 'color'] }],
      order: [['created_at', 'DESC']],
      ...options,
    });
  }

  async findById(id) {
    return Milestone.findByPk(id, {
      include: [{ model: Project, as: 'project' }],
    });
  }

  async findByProject(projectId) {
    return Milestone.findAll({
      where: { project_id: projectId },
      order: [['name', 'ASC']],
    });
  }

  async create(data) {
    return Milestone.create(data);
  }

  async update(id, data) {
    await Milestone.update(data, { where: { id } });
    return this.findById(id);
  }

  async delete(id) {
    return Milestone.destroy({ where: { id } });
  }
}

module.exports = new MilestoneRepository();
