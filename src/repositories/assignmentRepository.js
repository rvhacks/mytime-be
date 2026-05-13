const { ProjectAssignment, User, Project } = require('../infrastructure/models');
const { Op } = require('sequelize');

class AssignmentRepository {
  async findAll(options = {}) {
    const { where = {}, search, ...rest } = options;

    return ProjectAssignment.findAndCountAll({
      where,
      include: [
        { model: User, as: 'user', attributes: { exclude: ['password'] } },
        { model: Project, as: 'project' },
      ],
      order: [['created_at', 'DESC']],
      ...rest,
    });
  }

  async findById(id) {
    return ProjectAssignment.findByPk(id, {
      include: [
        { model: User, as: 'user', attributes: { exclude: ['password'] } },
        { model: Project, as: 'project' },
      ],
    });
  }

  async findByUserAndProject(userId, projectId) {
    return ProjectAssignment.findOne({
      where: { user_id: userId, project_id: projectId },
    });
  }

  async findByUser(userId) {
    return ProjectAssignment.findAll({
      where: { user_id: userId },
      include: [
        { model: Project, as: 'project' },
      ],
    });
  }

  async findByProject(projectId) {
    return ProjectAssignment.findAll({
      where: { project_id: projectId },
      include: [
        { model: User, as: 'user', attributes: { exclude: ['password'] } },
      ],
    });
  }

  async create(data) {
    return ProjectAssignment.create(data);
  }

  async delete(id) {
    return ProjectAssignment.destroy({ where: { id } });
  }
}

module.exports = new AssignmentRepository();
