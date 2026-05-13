const { Notification } = require('../infrastructure/models');
const { Op } = require('sequelize');

class NotificationRepository {
  async findByUser(userId, options = {}) {
    const { limit, offset, unreadOnly } = options;
    const where = { user_id: userId };
    if (unreadOnly) where.read = false;

    return Notification.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      ...(limit ? { limit } : {}),
      ...(offset ? { offset } : {}),
    });
  }

  async countUnread(userId) {
    return Notification.count({ where: { user_id: userId, read: false } });
  }

  async create(data) {
    return Notification.create(data);
  }

  async bulkCreate(items) {
    return Notification.bulkCreate(items);
  }

  async markAsRead(id, userId) {
    return Notification.update({ read: true }, { where: { id, user_id: userId } });
  }

  async markAllAsRead(userId) {
    return Notification.update({ read: true }, { where: { user_id: userId, read: false } });
  }

  async delete(id, userId) {
    return Notification.destroy({ where: { id, user_id: userId } });
  }
}

module.exports = new NotificationRepository();
