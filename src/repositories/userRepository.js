const { User, Designation } = require('../infrastructure/models');
const { Op } = require('sequelize');

class UserRepository {
  async findById(id) {
    return User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Designation, as: 'designation' },
        { model: User, as: 'reportingManager', attributes: ['id', 'first_name', 'last_name', 'email'] },
      ],
    });
  }

  async findByEmail(email) {
    return User.findOne({ where: { email } });
  }

  async findByEmailExcludePassword(email) {
    return User.findOne({
      where: { email },
      attributes: { exclude: ['password'] },
      include: [
        { model: Designation, as: 'designation' },
        { model: User, as: 'reportingManager', attributes: ['id', 'first_name', 'last_name', 'email'] },
      ],
    });
  }

  async findAll(options = {}) {
    const { where = {}, search, order, ...rest } = options;
    const finalWhere = { ...where };

    if (search) {
      finalWhere[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    return User.findAndCountAll({
      where: finalWhere,
      attributes: { exclude: ['password'] },
      include: [
        { model: Designation, as: 'designation' },
        { model: User, as: 'reportingManager', attributes: ['id', 'first_name', 'last_name', 'email'] },
      ],
      ...rest,
      order: [['first_name', 'ASC'], ['last_name', 'ASC']],
    });
  }

  async create(data) {
    return User.create(data);
  }

  async update(id, data) {
    const [count] = await User.update(data, { where: { id } });
    if (count === 0) return null;
    return this.findById(id);
  }

  async delete(id) {
    return User.destroy({ where: { id } });
  }
}

module.exports = new UserRepository();
