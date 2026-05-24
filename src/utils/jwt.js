const jwt = require('jsonwebtoken');
const config = require('../config/app');

const generateToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
};

const verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, config.jwt.refreshSecret);
};

module.exports = { generateToken, generateRefreshToken, verifyToken, verifyRefreshToken };
