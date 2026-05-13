const notificationRepository = require('../repositories/notificationRepository');
const userRepository = require('../repositories/userRepository');

class NotificationService {
  /**
   * Create a notification for one user
   */
  async notify(userId, { title, message, type = 'info', category = 'general', metadata = null }) {
    return notificationRepository.create({
      user_id: userId,
      title,
      message,
      type,
      category,
      metadata,
    });
  }

  /**
   * Notify multiple users
   */
  async notifyMany(userIds, { title, message, type = 'info', category = 'general', metadata = null }) {
    const items = userIds.map((uid) => ({
      user_id: uid,
      title,
      message,
      type,
      category,
      metadata,
    }));
    return notificationRepository.bulkCreate(items);
  }

  /**
   * Notify all admins
   */
  async notifyAdmins({ title, message, type = 'info', category = 'general', metadata = null }) {
    const admins = await userRepository.findAll({ where: { role: 'admin', status: 'active' } });
    const ids = (admins.rows || []).map((u) => u.id);
    if (ids.length > 0) {
      return this.notifyMany(ids, { title, message, type, category, metadata });
    }
  }

  // ---- Query ----
  async getUserNotifications(userId, options = {}) {
    return notificationRepository.findByUser(userId, options);
  }

  async getUnreadCount(userId) {
    return notificationRepository.countUnread(userId);
  }

  async markAsRead(id, userId) {
    return notificationRepository.markAsRead(id, userId);
  }

  async markAllAsRead(userId) {
    return notificationRepository.markAllAsRead(userId);
  }

  // ---- Convenience notification creators ----
  async onEmployeeCreated(employee) {
    await this.notify(employee.id, {
      title: 'Welcome to My Time!',
      message: `Your account has been created. Welcome aboard, ${employee.first_name}!`,
      type: 'success',
      category: 'employee',
    });
  }

  async onPasswordReset(userId, employeeName) {
    await this.notify(userId, {
      title: 'Password Reset',
      message: 'Your password has been reset by an administrator. Please login with your new password.',
      type: 'warning',
      category: 'password',
    });
  }

  async onProjectAssigned(userId, projectName, role) {
    await this.notify(userId, {
      title: 'Project Assignment',
      message: `You have been assigned to project "${projectName}" as ${role}.`,
      type: 'info',
      category: 'assignment',
    });
  }

  async onTimesheetSubmitted(userId, weekStart) {
    await this.notify(userId, {
      title: 'Timesheet Submitted',
      message: `Your timesheet for week of ${weekStart} has been submitted for approval.`,
      type: 'info',
      category: 'timesheet',
    });
  }

  async onTimesheetApproved(userId, weekStart, reviewerName) {
    await this.notify(userId, {
      title: 'Timesheet Approved',
      message: `Your timesheet for week of ${weekStart} has been approved by ${reviewerName}.`,
      type: 'success',
      category: 'timesheet',
    });
  }

  async onTimesheetRejected(userId, weekStart, reviewerName, comments) {
    await this.notify(userId, {
      title: 'Timesheet Rejected',
      message: `Your timesheet for week of ${weekStart} has been rejected by ${reviewerName}. Reason: ${comments || 'No comments'}`,
      type: 'error',
      category: 'timesheet',
    });
  }

  async onTimesheetRecalled(userId, weekStart) {
    await this.notify(userId, {
      title: 'Timesheet Recalled',
      message: `Your timesheet for week of ${weekStart} has been recalled and is now in draft status.`,
      type: 'warning',
      category: 'timesheet',
    });
  }
}

module.exports = new NotificationService();
