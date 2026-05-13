const { Milestone } = require('../infrastructure/models');
const { Op } = require('sequelize');

class MilestoneRepository {
  async findAll(options = {}) {
    const { where = {}, search, ...rest } = options;
    const finalWhere = { ...where };

    if (search) {
      finalWhere.name = { [Op.iLike]: `%${search}%` };
    }

    return Milestone.findAndCountAll({
      where: finalWhere,
      order: [['name', 'ASC']],
      ...rest,
    });
  }

  async findById(id) {
    return Milestone.findByPk(id);
  }

  async findByRole(role) {
    return Milestone.findAll({
      where: { role },
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
