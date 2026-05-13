const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/AppError');
const { User } = require('../infrastructure/models');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Ensure upload directory exists
const UPLOAD_DIR = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

class UserService {
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    // Dynamic manager check
    const directReportCount = await User.count({
      where: { reporting_manager_id: userId, status: 'active' },
    });

    const json = user.toJSON();
    let avatarUrl = null;
    if (json.avatar_path) {
      avatarUrl = `/uploads/avatars/${path.basename(json.avatar_path)}`;
    }

    return { ...json, avatarUrl, isManager: directReportCount > 0 };
  }

  async updateProfile(userId, data) {
    const updateData = {};
    if (data.firstName) updateData.first_name = data.firstName;
    if (data.lastName) updateData.last_name = data.lastName;
    if (data.mobile) updateData.mobile = data.mobile;
    if (data.department) updateData.department = data.department;
    if (data.dob) updateData.dob = data.dob;
    if (data.designationId) updateData.designation_id = data.designationId;

    return userRepository.update(userId, updateData);
  }

  /**
   * Upload avatar to LOCAL filesystem (no S3).
   */
  async uploadAvatar(userId, file) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    // Delete old avatar if exists
    if (user.avatar_path) {
      try { fs.unlinkSync(user.avatar_path); } catch { /* ignore */ }
    }

    // Save with unique name
    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `${userId}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(filepath, file.buffer);

    // Update DB
    await User.update({ avatar_path: filepath }, { where: { id: userId } });

    const avatarUrl = `/uploads/avatars/${filename}`;
    return { avatarUrl };
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findByPk(userId);
    if (!user) throw new AppError('User not found', 404);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new AppError('Current password is incorrect', 400);

    const hashed = await bcrypt.hash(newPassword, 12);
    await User.update({ password: hashed }, { where: { id: userId } });
    return { message: 'Password changed successfully' };
  }
}

module.exports = new UserService();
