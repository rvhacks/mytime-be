const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/AppError');
const { uploadToS3, getSignedS3Url, deleteFromS3 } = require('../utils/s3');
const { User } = require('../infrastructure/models');
const bcrypt = require('bcryptjs');

class UserService {
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    let avatarUrl = null;
    if (user.avatar_key) {
      try { avatarUrl = await getSignedS3Url(user.avatar_key); } catch (e) { /* S3 not configured */ }
    }

    return { ...user.toJSON(), avatarUrl };
  }

  async updateProfile(userId, data) {
    const updateData = {};
    if (data.firstName) updateData.first_name = data.firstName;
    if (data.lastName) updateData.last_name = data.lastName;
    if (data.mobile) updateData.mobile = data.mobile;
    if (data.department) updateData.department = data.department;

    return userRepository.update(userId, updateData);
  }

  async uploadAvatar(userId, file) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    // Delete old avatar if exists
    if (user.avatar_key) {
      try { await deleteFromS3(user.avatar_key); } catch (e) { /* ignore */ }
    }

    const key = await uploadToS3(file.buffer, file.originalname, 'avatars');
    await User.update({ avatar_key: key }, { where: { id: userId } });

    const avatarUrl = await getSignedS3Url(key);
    return { avatarUrl, avatarKey: key };
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
