const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/auth');

const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, jwtSecret);
    
    // Determine user type and set appropriate fields
    const isDoctorToken = !!decoded.doctorId;
    const isPatientToken = !!decoded.id && !decoded.doctorId;
    
    if (!isDoctorToken && !isPatientToken) {
      console.error('❌ Token invalid format:', {
        decodedKeys: Object.keys(decoded),
        token: token.substring(0, 20) + '...'
      });
      return res.status(401).json({ 
        error: 'Invalid token: missing user ID' 
      });
    }

    // Attach user info to request
    // For doctor tokens: id = doctorId, doctorId = doctorId
    // For patient tokens: id = userId, doctorId = undefined
    req.user = {
      id: isDoctorToken ? decoded.doctorId : decoded.id,
      doctorId: isDoctorToken ? decoded.doctorId : undefined,
      email: decoded.email,
      phoneNumber: decoded.phoneNumber,
      role: decoded.role || (isDoctorToken ? 'doctor' : 'patient')
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    return res.status(401).json({ error: 'Authentication failed.' });
  }
};

module.exports = authenticate;
