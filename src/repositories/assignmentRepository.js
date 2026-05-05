const { ProjectAssignment, User, Project } = require('../infrastructure/models');

class AssignmentRepository {
  async findAll(options = {}) {
    return ProjectAssignment.findAndCountAll({
      include: [
        { model: User, as: 'user', attributes: { exclude: ['password'] } },
        { model: Project, as: 'project' },
        { model: User, as: 'reportingManager', attributes: { exclude: ['password'] } },
      ],
      order: [['created_at', 'DESC']],
      ...options,
    });
  }

  async findById(id) {
    return ProjectAssignment.findByPk(id, {
      include: [
        { model: User, as: 'user', attributes: { exclude: ['password'] } },
        { model: Project, as: 'project' },
        { model: User, as: 'reportingManager', attributes: { exclude: ['password'] } },
      ],
    });
  }

  async findByUserAndProject(userId, projectId) {
    return ProjectAssignment.findOne({
      where: { user_id: userId, project_id: projectId },
    });
  }

  async findByProject(projectId) {
    return ProjectAssignment.findAll({
      where: { project_id: projectId },
      include: [
        { model: User, as: 'user', attributes: { exclude: ['password'] } },
        { model: User, as: 'reportingManager', attributes: { exclude: ['password'] } },
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
