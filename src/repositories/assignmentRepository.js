const { ProjectAssignment, User, Project } = require('../infrastructure/models');
const { Op } = require('sequelize');

class AssignmentRepository {
  async findAll(options = {}) {
    const { where = {}, search, ...rest } = options;
    const finalWhere = { ...where };

    // Server-side search across user and project fields
    if (search) {
      const matchingUsers = await User.findAll({
        where: { [Op.or]: [
          { first_name: { [Op.iLike]: `%${search}%` } },
          { last_name: { [Op.iLike]: `%${search}%` } },
          { employee_id: { [Op.iLike]: `%${search}%` } },
        ] },
        attributes: ['id'],
      });
      const matchingProjects = await Project.findAll({
        where: { [Op.or]: [
          { name: { [Op.iLike]: `%${search}%` } },
          { project_code: { [Op.iLike]: `%${search}%` } },
        ] },
        attributes: ['id'],
      });
      const userIds = matchingUsers.map(u => u.id);
      const projectIds = matchingProjects.map(p => p.id);
      const orConditions = [];
      if (userIds.length > 0) orConditions.push({ user_id: { [Op.in]: userIds } });
      if (projectIds.length > 0) orConditions.push({ project_id: { [Op.in]: projectIds } });
      if (orConditions.length > 0) {
        finalWhere[Op.or] = orConditions;
      } else {
        // No matches — return empty
        finalWhere.id = null;
      }
    }

    return ProjectAssignment.findAndCountAll({
      where: finalWhere,
      include: [
        { model: User, as: 'user', attributes: { exclude: ['password'] } },
        { model: Project, as: 'project' },
      ],
      distinct: true,
      order: [
        [{ model: User, as: 'user' }, 'first_name', 'ASC'],
        [{ model: User, as: 'user' }, 'last_name', 'ASC'],
        ['created_at', 'DESC'],
      ],
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
