const { User, Designation } = require('../infrastructure/models');

class UserRepository {
  async findById(id) {
    return User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Designation, as: 'designation' }],
    });
  }

  async findByEmail(email) {
    return User.findOne({ where: { email } });
  }

  async findByEmailExcludePassword(email) {
    return User.findOne({
      where: { email },
      attributes: { exclude: ['password'] },
      include: [{ model: Designation, as: 'designation' }],
    });
  }

  async findAll(options = {}) {
    return User.findAndCountAll({
      attributes: { exclude: ['password'] },
      include: [{ model: Designation, as: 'designation' }],
      order: [['created_at', 'DESC']],
      ...options,
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
