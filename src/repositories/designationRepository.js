const { Designation } = require('../infrastructure/models');
const { Op } = require('sequelize');

class DesignationRepository {
  async findAll(options = {}) {
    const { where = {}, search, order, ...rest } = options;
    const finalWhere = { ...where };

    if (search) {
      finalWhere.name = { [Op.iLike]: `%${search}%` };
    }

    return Designation.findAndCountAll({
      where: finalWhere,
      ...rest,
      order: [['name', 'ASC']],
    });
  }

  async findById(id) {
    return Designation.findByPk(id);
  }

  async findByName(name) {
    return Designation.findOne({ where: { name } });
  }

  async create(data) {
    return Designation.create(data);
  }

  async update(id, data) {
    await Designation.update(data, { where: { id } });
    return this.findById(id);
  }

  async delete(id) {
    return Designation.destroy({ where: { id } });
  }
}

module.exports = new DesignationRepository();
