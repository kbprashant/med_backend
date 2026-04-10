const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpire } = require('../config/auth');

class JwtService {
  generateToken(payload) {
    return jwt.sign(payload, jwtSecret, {
      expiresIn: jwtExpire,
    });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, jwtSecret);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  decodeToken(token) {
    return jwt.decode(token);
  }
}

module.exports = new JwtService();
