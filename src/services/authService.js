const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const { User, Otp } = require('../infrastructure/models');
const { generateToken, generateRefreshToken } = require('../utils/jwt');
const { generateOTP } = require('../utils/helpers');
const AppError = require('../utils/AppError');
const config = require('../config/app');

class AuthService {
  async login(email, password) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new AppError('Invalid email or password', 401);
    if (user.status !== 'active') throw new AppError('Account is inactive', 401);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new AppError('Invalid email or password', 401);

    const token = generateToken({ id: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id });

    const userData = await userRepository.findById(user.id);
    return { token, refreshToken, user: userData };
  }

  async forgotPassword(email) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new AppError('No account found with this email', 404);

    // Invalidate old OTPs
    await Otp.update({ used: true }, { where: { user_id: user.id, used: false } });

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);
    await Otp.create({ user_id: user.id, code, expires_at: expiresAt });

    // In production, send OTP via email/SMS
    // For now, return it in response (dev only)
    return { message: 'OTP sent successfully', otp: code };
  }

  async verifyOtp(email, otp) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new AppError('User not found', 404);

    const otpRecord = await Otp.findOne({
      where: { user_id: user.id, code: otp, used: false },
      order: [['created_at', 'DESC']],
    });

    if (!otpRecord) throw new AppError('Invalid OTP', 400);
    if (new Date() > new Date(otpRecord.expires_at)) throw new AppError('OTP has expired', 400);

    return { message: 'OTP verified successfully', verified: true };
  }

  async resetPassword(email, otp, newPassword) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new AppError('User not found', 404);

    const otpRecord = await Otp.findOne({
      where: { user_id: user.id, code: otp, used: false },
      order: [['created_at', 'DESC']],
    });

    if (!otpRecord) throw new AppError('Invalid OTP', 400);
    if (new Date() > new Date(otpRecord.expires_at)) throw new AppError('OTP has expired', 400);

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await User.update({ password: hashedPassword }, { where: { id: user.id } });
    await Otp.update({ used: true }, { where: { id: otpRecord.id } });

    return { message: 'Password reset successfully' };
  }
}

module.exports = new AuthService();
